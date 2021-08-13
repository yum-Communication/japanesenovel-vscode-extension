import {
	Disposable,
	window,
	WebviewPanel,
	Uri,
	Webview,
	WebviewOptions,
	ViewColumn,
	Diagnostic,
	languages
} from 'vscode';

import {
	config
} from './config';

import {
	ActiveEditorController,
	EditorEvent
} from './EditorController';
import {
	ConvertType,
	validateDocument,
	formatDocument
} from './novelFormatter';

export const diagnosticColl = languages.createDiagnosticCollection("novelLint");


function getWebviewOptions(extensionUri: Uri): WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [Uri.joinPath(extensionUri, 'media')]
	};
}


/**
 * プレビュー用のクラス
 */
export class NovelPreviewPanel {
	/**
	 * このパネルは有効な間だけ存在する。
	 * ※ 閉じられるときに undefined にされる
	 */
	public static currentPanel: NovelPreviewPanel | undefined;

	public static readonly viewType = 'catCoding';

	private readonly _panel: WebviewPanel;
	private readonly _extensionUri: Uri;
	private disposable: Disposable;

	private scroll:number;

	// コマンド実行されると、これを呼び出してWebビューの作成とか表示とかする
	public static show(extensionUri: Uri, aec:ActiveEditorController) {
		const editorNum = window.visibleTextEditors.length;
		const column = window.activeTextEditor
			? window.activeTextEditor.viewColumn
			: undefined;

		// 既にパネルがあればそいつを表示する
		if (NovelPreviewPanel.currentPanel) {
			NovelPreviewPanel.currentPanel._panel.reveal(column);
			return;
		}

		// 新規作成。
		const panel = window.createWebviewPanel(
			NovelPreviewPanel.viewType,
			'プレビュー',
			ViewColumn.Beside,
			getWebviewOptions(extensionUri),
		);

		NovelPreviewPanel.currentPanel = new NovelPreviewPanel(panel, extensionUri, aec);
	}


	private constructor(panel: WebviewPanel, extensionUri: Uri, aec:ActiveEditorController) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this.scroll = 0;

		const d: Disposable[] = [];

		this._panel.onDidDispose(this.dispose, this, d);
		this._panel.webview.onDidReceiveMessage(this.receiveMessage, this, d);

		aec.onEditorActive(this.onEditorActive, this, d);
		aec.onDocumentChanged(this.onDocumentChanged, this, d);

		this.disposable = Disposable.from(...d);

		this.updateHtml();
	}

	// ウィンドウ（タブ）を閉じられたら呼び出されるよ
	public dispose() {
		// 保持しているインスタンスをまず消す
		NovelPreviewPanel.currentPanel = undefined;
		this.disposable.dispose();
		this._panel.dispose();
	}

	/**
	 * エディタがアクティブになった時のイベント
	 * @param eve 
	 */
	 private onEditorActive(eve:EditorEvent):void
	 {
		 if (eve.isTargetType && eve.isDocumentChanged)
		 {
			this.scroll = 0;
			this.updateHtml();
		 }
	 }
 
	/**
	 * アクティブエディタのドキュメントが変更されたときのイベント
	 * @param eve 
	 */
	private onDocumentChanged(eve:EditorEvent):void
	{
		this.updateHtml();
	}
 
	/**
	 * HTML側の vscode.postMessage(message) を受け取るハンドラ
	 * @param message 
	 * @returns 
	 */
	private receiveMessage(message:any):void
	{
		switch (message.command)
		{
			case 'scroll':
				this.scroll = message.value;
				return;
		}
		console.log(message);
	}

	private updateHtml()
	{
		if(window.activeTextEditor)
		{
			Promise.resolve()
				.then(()=>
				{
					return new Promise<void>((ok, ng)=>
					{
						const text = window.activeTextEditor.document.getText();
						const title = this._getTitle(text);
						const html = this._getContents(text, window.activeTextEditor.document.uri);
						try
						{
							this._panel.title = title;
						}catch(exc)
						{
							console.log(exc);
						}
						try
						{
							if (html === false)
							{
								if (this._panel.webview.html.length === 0)
								{
									this._panel.webview.html = "<p style=\"white-space:pre;\">" + text + "</p>";
								}
							} else if (html !== true)
							{
								this._panel.webview.html = this.htmlForWebview(this._panel.webview, html, title);
							}
						}catch(exc)
						{
							console.log(exc);
						}
						ok();
					});
				})
				.then(()=>
				{
					return new Promise<void>((ok, ng)=>
					{
						this._panel.webview.postMessage({ command: 'scroll', value: this.scroll });
						ok();
					});
				});
			
		} else
		{
			this._panel.webview.html = "×";
		}
	}

	private htmlForWebview(webview: Webview, contents:string, title:string):string {
		const scriptUri = webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'media', 'main.js'));
		const stylesMainUri = webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const height = config.preview.height;
		const fontSize = config.preview.fontSize;
		const nonce = getNonce();
		return `<!DOCTYPE html>
<html lang="ja" class="vrtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${stylesMainUri}" rel="stylesheet">
<title>preview</title>
<style><!--
body { font-size:${fontSize}pt; }
body.p-text>div.main { height: ${height}em; }
--></style>
</head>
<body class="p-text">
<div id="main-contents" class="main">
<h1 class="oo-midashi" id="toc-001">${title}</h1>
${contents}
</div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body></html>`;
	}

	private _getTitle(text:String): string
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
	}

	private _getContents(text:string, uri:Uri): string|boolean
	{
		const diagnostics: Diagnostic[] = [];
		let a:string[] = text.split("\n");
		validateDocument(a, diagnostics);
		diagnosticColl.set(uri, diagnostics);
		if (diagnostics.length > 0)
		{
			return false;
		}

		// 改行コードは\nにする
		// 1行目および頭の連続する空行を除去
		// 連続する改行を一つずつ除去
		let s = text.replace(/\r\n/g, "\n")
					.replace(/\r/g, "\n")
					.replace(/^[^\n]+[\n]+/, "")
					.replace(/(?<![\n」])\n(?![\n「])/g, "")
					.replace(/(?<!\n)(\n+)\n(?!\n)/g, "$1");

		return formatDocument(s.split("\n"), ConvertType.html, diagnostics);
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

