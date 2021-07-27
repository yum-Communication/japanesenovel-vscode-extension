import {
	Disposable,
	StatusBarItem,
	StatusBarAlignment,
	window,
	TextEditor
} from 'vscode';

import {
	ActiveEditorController,
	EditorEvent
} from './EditorController';

export class CharacterCounterController {
	private disposable: Disposable;
	private item!: StatusBarItem;

	constructor(aec:ActiveEditorController) {
		this.item = window.createStatusBarItem(StatusBarAlignment.Left);

		const d: Disposable[] = [];
		aec.onEditorActive(this.onEditorActive, this, d);
		aec.onDocumentChanged(this.onDocumentChanged, this, d);
		this.disposable = Disposable.from(...d);

		const e = window.activeTextEditor;
		if(e)
		{
			this.doCount(e);
			this.item.show();
		}
	}

	public dispose() {
		this.disposable.dispose();
	}

	/**
	 * エディタがアクティブになった時のイベント
	 * @param eve 
	 */
	private onEditorActive(eve:EditorEvent):void
	{
		if (eve.isTargetType)
		{
			if (eve.isDocumentChanged)
			{
				this.doCount(eve.editor);
			}
			this.item.show();
		} else
		{
			this.item.hide();
		}
	}

	/**
	 * アクティブエディタのドキュメントが変更されたときのイベント
	 * @param eve 
	 */
	 private onDocumentChanged(eve:EditorEvent):void
	{
		this.doCount(eve.editor);
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
				.replace(/(?<![|｜])《《([^《》]+)》》/g, '$1')		// カクヨム傍点の剥がし処理
				.replace(/[|｜]([^|｜《》]+)《[^|｜《》]+》/g, '$1')    // ルビを親語だけにする
				.replace(/[|｜]《/g, '#')		// ルビの開始ではないので、適当に置換する
			;
		let cnt = (s !== "") ? Array.from(s).length: 0;
		this.item.text = Intl.NumberFormat().format(cnt) + " 文字";
	}
}
