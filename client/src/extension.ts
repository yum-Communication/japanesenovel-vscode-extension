import * as path from 'path';
import {
	CancellationToken,
	commands,
	DocumentSemanticTokensProvider,
	ExtensionContext,
	languages,
	Position,
	SemanticTokens,
	SemanticTokensBuilder,
	SemanticTokensLegend,
	TextDocument,
	window,
	workspace
} from 'vscode';
import {
	LanguageClient,
} from 'vscode-languageclient';
import {
	WriteStream
} from 'fs';
import {
	CharacterCounter,
	CharacterCounterController
} from './charcnt';
import {
	loadUniquenouns,
	Tokens,
	TokenType
} from './words';

import {
	extractRubyFromDoc,
	extractRubyFromWorkspace
} from './rubyControl';

import {
	config
} from './config';

import {
	ConvertType,
	formatDocument
} from './novelFormatter';

let client: LanguageClient;
const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();
let myTokenProvider:MyDocumentSemanticTokensProvider;


const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'macro', 'variable', 'parameter', 'property', 'label',
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async',
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

// ワークスペースのベースディレクトリを取得
function getBaseDir(): string | undefined {
	if( workspace.workspaceFile )
	{
		// ワークスペースの設定ファイルが存在している
		let m = workspace.workspaceFile.fsPath.match(/^.+[\/\\]/);
		return m[0];
	}

	let wfs = workspace.workspaceFolders;
	if(wfs)
	{
		return wfs[0].uri.fsPath;
	}
	return;
}


export function activate(context: ExtensionContext)
{
	let wsBasePath = getBaseDir();
	config.reload();

	// 設定が変更されたら読み込みし直すよ
	context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
		config.reload();
	}));

	// コマンド登録
	// ルビ抽出（単体）
	context.subscriptions.push(commands.registerCommand('yumNovelExt.extractRuby', ()=>{
		const editor = window.activeTextEditor;
		if (editor)
		{
			extractRubyFromDoc(editor.document, path.join(wsBasePath,"ruby.noveldata"));
		}
	}));

	// ルビ抽出（全ファイル）
	context.subscriptions.push(commands.registerCommand('yumNovelExt.extractRubyAll', ()=>{
		extractRubyFromWorkspace(workspace.workspaceFolders, path.join(wsBasePath,"ruby.noveldata"));
	}));

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.narou', async () => {
		try {
			// 現在のファイルを読み込んで
			let s:string = window.activeTextEditor.document.getText();
			s = formatDocument(s, ConvertType.narou);

			// 新規ファイルを作ってぶち込む
			let doc = await workspace.openTextDocument({language: "noveltext"});
			await window.showTextDocument(doc);
			window.activeTextEditor.edit(editBuilder => {
				editBuilder.insert(new Position(0, 0), s);
			});
		} catch(e) {
			console.log(e);
		}
	}));

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.kakuyomu', async () => {
		try {
			// 現在のファイルを読み込んで
			let s:string = window.activeTextEditor.document.getText();
			s = formatDocument(s, ConvertType.kakuyomu);

			// 新規ファイルを作ってぶち込む
			let doc = await workspace.openTextDocument({language: "noveltext"});
			await window.showTextDocument(doc);
			window.activeTextEditor.edit(editBuilder => {
				editBuilder.insert(new Position(0, 0), s);
			});
		} catch(e) {
			console.log(e);
		}
	}));

	// 文字数カウント機能。
	const characterCounter = new CharacterCounter();
	const controller = new CharacterCounterController(characterCounter);
	context.subscriptions.push(controller);

	// キーワード機能
	const uniquenouns:string = config.uniquenouns;
	if(uniquenouns)
	{
		loadUniquenouns(path.join(wsBasePath, uniquenouns), tokens=>{
			myTokenProvider = new MyDocumentSemanticTokensProvider(tokens);
			context.subscriptions.push(
				languages.registerDocumentSemanticTokensProvider(
					{ language: 'noveltext'}, myTokenProvider, legend
				)
			);
		});
	}
}

export function deactivate(): Thenable<void> | undefined
{
	if (!client)
	{
		return undefined;
	}
	return client.stop();
}


interface IParsedToken
{
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}


class MyDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider
{
	private tokens:Tokens;

	constructor(tokens:Tokens)
	{
		this.tokens = tokens;
	}

	async provideDocumentSemanticTokens(doc: TextDocument, _token: CancellationToken): Promise<SemanticTokens>
	{
		const allTokens = this.extractToken(doc);
		const builder = new SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				this.getTokenTypeId(token.tokenType),
				this.getTokenModifiersId(token.tokenModifiers)
			);
		});
		return builder.build();
	}

	private getTokenTypeId(tokenType: string): number
	{
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		}
		return 0;
	}

	private getTokenModifiersId(modifiers: string[]): number
	{
		let result = 0;
		for (let i = 0; i < modifiers.length; ++i)
		{
			const tokenModifier = modifiers[i];
			if (tokenModifiers.has(tokenModifier))
			{
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			}
		}
		return result;
	}

	private extractToken(doc: TextDocument): IParsedToken[]
	{
		const r: IParsedToken[] = [];
		let line = 0;
		let col = 0;
		while(true)
		{
			let tr = this.tokens.findMatch(doc, line, col);
			if(tr) {
				r.push({
					line: tr.line,
					startCharacter: tr.character,
				 	length: tr.length,
					tokenType: this.tokenType(tr.token.tokenType),
					tokenModifiers: []
				});
				line = tr.line;
				col = tr.character + tr.length;
			} else {
				break;
			}
		}
		return r;
	}

	private tokenType(tt:TokenType):string {
		switch(tt) {
			case TokenType.regionName:
			case TokenType.characterName:
			case TokenType.characterTitle:
			case TokenType.characterSurname:
			case TokenType.characterFamily:
			case TokenType.characterDomain:
			case TokenType.characterClan:
			case TokenType.characterBaptism:
				return "class";
			case TokenType.magicName:
				return "struct";
			case TokenType.monsterName:
				return "enum";
			case TokenType.animalName:
			case TokenType.plantName:
				return "interface";
			case TokenType.cropName:
			case TokenType.foodName:
				return "method";
		}
	}
}
