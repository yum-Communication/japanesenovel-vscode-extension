import {
	Disposable,
	StatusBarItem,
	StatusBarAlignment,
	TextDocument,
	window
} from 'vscode';

export class CharacterCounter {

	private item!: StatusBarItem;

	public updateCharacterCount()
	{
		if (!this.item)
		{
			this.item = window.createStatusBarItem(StatusBarAlignment.Left);
		} 
		const editor = window.activeTextEditor;
		if (!editor)
		{
			this.item.hide();
			return;
		}

		const s = editor.document.getText()
				.replace(/\s/g, '')				// すべての空白文字
				.replace(/[|｜]《/g, '1')		// ルビの開始ではないので、適当に置換する
				.replace(/《《([^《》]+)》》/g, '$1')		// カクヨム傍点の剥がし処理
				.replace(/[|｜](?!《)([^《]+)《[^》]+》/g, '$1')    // ルビを親語だけにする
			;
		let cnt = (s !== "") ? Array.from(s).length: 0;

		const characterCount = Intl.NumberFormat().format(cnt);
		this.item.text = `${characterCount} 文字`;
		this.item.show();
	}
}

export class CharacterCounterController {
	private counter: CharacterCounter;
	private disposable: Disposable;

	constructor(characterCounter: CharacterCounter) {
		this.counter = characterCounter;
		this.counter.updateCharacterCount();

		const subscriptions: Disposable[] = [];
		window.onDidChangeTextEditorSelection(this.doEvent, this, subscriptions);
		window.onDidChangeActiveTextEditor(this.doEvent, this, subscriptions);

		this.disposable = Disposable.from(...subscriptions);
	}

	private doEvent() {
		this.counter.updateCharacterCount();
	}

	public dispose() {
		this.disposable.dispose();
	}
}
