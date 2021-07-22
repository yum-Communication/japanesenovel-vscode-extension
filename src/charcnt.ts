import {
	Disposable,
	StatusBarItem,
	StatusBarAlignment,
	window,
	TextEditor,
	TextEditorSelectionChangeEvent
} from 'vscode';

export class CharacterCounterController {
	private disposable: Disposable;
	private item!: StatusBarItem;
	private version: number;
	private filePath: string;

	constructor() {
		this.item = window.createStatusBarItem(StatusBarAlignment.Left);
		const subscriptions: Disposable[] = [];
		window.onDidChangeTextEditorSelection(this.doChangeSelection, this, subscriptions);
		window.onDidChangeActiveTextEditor(this.doChangeEditorEvent, this, subscriptions);

		this.disposable = Disposable.from(...subscriptions);

		const e = window.activeTextEditor;
		if(e)
		{
			this.setEditor(e);
			this.doCount(e);
			this.item.show();
		}
	}

	/**
	 * 破棄メソッドが重要。
	 */
	public dispose() {
		this.disposable.dispose();
	}

	private setEditor(editor:TextEditor):void
	{
		const d = editor.document;
		this.filePath = d.uri.fsPath;
		this.version = d.version;
	}

	private doChangeEditorEvent(editor:TextEditor | undefined)
	{
		// .txt, .nvl 以外は文字数カウントは非表示。
		if (!editor || editor.document.languageId !== 'noveltext')
		{
			this.item.hide();
		} else
		{
			// カウント対象のドキュメントのパスとバージョンを保存しておく
			this.setEditor(editor);
			this.doCount(editor);
			this.item.show();
		}
	}

	private doChangeSelection(s:TextEditorSelectionChangeEvent)
	{
		const e = s.textEditor;
		// 前回のカウントとドキュメントバージョンが変わっていたらカウントしなおし。
		if(e.document.version !== this.version || e.document.uri.fsPath !== this.filePath)
		{
			this.setEditor(e);
			this.doCount(e);
		}
	}

	/**
	 * 文字数カウントの本体
	 * @param editor 
	 */
	private doCount(editor:TextEditor)
	{
		// 合成文字には対応しない。
		const s = editor.document.getText()
				.replace(/\s/g, '')				// すべての空白文字はカウント対象としない
				.replace(/[\uDB40][\udd00-\uddef]|[\uFE00-\uFE0f]/g, '') // 異字体セレクタもカウント対象外
				.replace(/[|｜]{2}/g, '#')		// ルビの開始ではないので、適当に置換する
				.replace(/[|｜]《/g, '#')		// ルビの開始ではないので、適当に置換する
				.replace(/《《([^《》]+)》》/g, '$1')		// カクヨム傍点の剥がし処理
				.replace(/[|｜](?!《)([^《]+)《[^》]+》/g, '$1')    // ルビを親語だけにする
			;
		let cnt = (s !== "") ? Array.from(s).length: 0;
		this.item.text = Intl.NumberFormat().format(cnt) + " 文字";
	}
}
