import { Stats } from 'fs';
import * as path from 'path';
import {
	commands,
	Diagnostic,
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
import { ActiveEditorController } from './EditorController';

import {
	ConvertType,
	formatDocument
} from './novelFormatter';

import {
	diagnosticColl,
	NovelPreviewPanel
} from './novelPreview';

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

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.kakuyomu', () => {
		exportNovel(ConvertType.kakuyomu);
	}));

	context.subscriptions.push(commands.registerCommand('yumNovelExt.export.epub', () => {
		exportNovel(ConvertType.html);
	}));

	const aeController = new ActiveEditorController();
	context.subscriptions.push(aeController);

	// 文字数カウント機能。
	const controller = new CharacterCounterController(aeController);
	context.subscriptions.push(controller);

	// プレビュー表示
	context.subscriptions.push(
		commands.registerCommand('yumNovelExt.preview', () => {
			NovelPreviewPanel.show(context.extensionUri, aeController);
		})
	);

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

const _getTitle = (text:String): string =>
{
	// 1行目を取り出す
	var m = text.match(/[^\r\n]+/);
	const x = /[^ \t　]+\s(.+)/;
	var n = m[0].match(/[^ \t　]+\s(.+)/);
	if(n)
	{
		return n[1];
	}
	return m[0];
};

async function exportNovel(convertType:ConvertType):Promise<void>
{
	if (window.activeTextEditor && window.activeTextEditor.document)
	{
		try
		{
			const d = window.activeTextEditor.document;
			const diagnostics: Diagnostic[] = [];

			if (d)
			{
				// 現在のファイルを読み込んで
				let s: string = d.getText();
				let title = '';

				if(convertType === ConvertType.html) {
					title = _getTitle(s);
					s = s.replace(/\r\n/g, "\n")
						.replace(/\r/g, "\n")
						.replace(/^[^\n]+[\n]+/, "")
						.replace(/(?<![\n」])\n(?![\n「])/g, "")
						.replace(/(?<!\n)(\n+)\n(?!\n)/g, "$1");
				}
				s = formatDocument(s.split("\n"), convertType, diagnostics);
				if(convertType === ConvertType.html) {
					s = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja" class="vrtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" type="text/css" href="../style/book-style.css"/>
<title>${title}</title>
</head>
<body class="p-text">
<div id="main-contents" class="main">
<h2 id="toc-001">${title}</h2>
${s}
</div>
</body></html>`;
				}

				diagnosticColl.set(d.uri, diagnostics);
				if (diagnostics.length === 0)
				{
					diagnosticColl.set(d.uri,diagnostics);
					// 新規ファイルを作ってぶち込む
					let doc = await workspace.openTextDocument({ language: (convertType===ConvertType.html ? 'html': 'noveltext') });
					await window.showTextDocument(doc);
					window.activeTextEditor.edit(editBuilder => {
						editBuilder.insert(new Position(0, 0), s);
					});
				}
			}
		} catch (e)
		{
			console.log(e);
		}
	}
}
