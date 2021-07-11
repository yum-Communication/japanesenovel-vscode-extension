import { Stats } from 'fs';
import * as path from 'path';
import {
	commands,
	ExtensionContext,
	Position,
	window,
	workspace
} from 'vscode';

import {
	CharacterCounterController
} from './charcnt';

import {
	config
} from './config';

import {
	ConvertType,
	formatDocument
} from './novelFormatter';

import {
	extractRubyFromDoc,
	extractRubyFromWorkspace
} from './rubyControl';

import { disposeWatch, startWatch, stopWatch } from './watch';

import {
	registUniquenouns,
	reloadUniquenouns
} from './words';

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


let uniquenounsFilename:string = "";

/**
 * 固有名詞設定を再読み込みする。
 */
function uniquenounsWatcherCb(eventName:string, filename:string, stats:Stats|undefined): void
{
	reloadUniquenouns(filename);
}



/**
 * エクステンションのエントリポイント的な物体。
 * @param context 
 */
export function activate(context: ExtensionContext)
{
	let wsBasePath = getBaseDir();
	config.reload();

	// 設定が変更されたら読み込みし直すよ
	context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
		config.reload();
		if(config.uniquenouns)
		{
			const fn = path.join(wsBasePath, config.uniquenouns);
			if( fn !== uniquenounsFilename ){
				// ファイル名が変わっている場合は、元の監視を解く
				stopWatch(uniquenounsFilename);
				uniquenounsFilename = fn;
				// 新しいファイル名で監視を開始
				startWatch(uniquenounsFilename, uniquenounsWatcherCb);
			}
		} else if(uniquenounsFilename){
			stopWatch(uniquenounsFilename);
			uniquenounsFilename = "";
		}
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
	const controller = new CharacterCounterController();
	context.subscriptions.push(controller);

	// キーワード機能
	const uniquenouns:string = config.uniquenouns;
	if(uniquenouns)
	{
		const fn = path.join(wsBasePath, uniquenouns);
		startWatch(fn, uniquenounsWatcherCb);
		context.subscriptions.push(...registUniquenouns());
	}
}

export function deactivate(): Thenable<void> | undefined
{
	disposeWatch();
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
