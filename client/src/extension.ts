import * as path from 'path';
import {
	commands,
	ExtensionContext,
	Position,
	window,
	workspace
} from 'vscode';
import {
	CharacterCounter,
	CharacterCounterController
} from './charcnt';
import {
	registUniquenouns
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
		if (editor && editor.document.languageId === 'noveltext')
		{
			extractRubyFromDoc(editor.document, path.join(wsBasePath,"ruby.noveldata"));
		}
	}));

	// ルビ抽出（全ファイル）
	context.subscriptions.push(commands.registerCommand('yumNovelExt.extractRubyAll', ()=>{
		extractRubyFromWorkspace(workspace.workspaceFolders, path.join(wsBasePath,"ruby.noveldata"));
	}));

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.narou', () => {
		exportNovel(ConvertType.narou);
	}));

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.kakuyomu', async () => {
		await exportNovel(ConvertType.kakuyomu);
	}));

	// 文字数カウント機能。
	const characterCounter = new CharacterCounter();
	const controller = new CharacterCounterController(characterCounter);
	context.subscriptions.push(controller);

	// キーワード機能
	const uniquenouns:string = config.uniquenouns;
	if(uniquenouns)
	{
		(async () => {
			let d = await registUniquenouns(path.join(wsBasePath, uniquenouns));
			context.subscriptions.push(d);
		})();
	}
}

export function deactivate(): Thenable<void> | undefined
{
	return;
}


async function exportNovel(convertType:ConvertType):Promise<void>
{
	if (window.activeTextEditor && window.activeTextEditor.document)
	{
		try
		{
			const d = window.activeTextEditor.document;
			if (d)
			{
				// 現在のファイルを読み込んで
				let s: string = d.getText();
				s = formatDocument(s, convertType);

				// 新規ファイルを作ってぶち込む
				let doc = await workspace.openTextDocument({ language: "noveltext" });
				await window.showTextDocument(doc);
				window.activeTextEditor.edit(editBuilder => {
					editBuilder.insert(new Position(0, 0), s);
				});
			}
		} catch (e)
		{
			console.log(e);
		}
	}
}
