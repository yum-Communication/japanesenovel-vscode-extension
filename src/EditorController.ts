import {
	Disposable,
	window,
	TextEditor,
	TextEditorSelectionChangeEvent
} from 'vscode';

class Caller<T>
{
	private cb:(val:T)=>void;
	private obj:any;

	constructor(cb:(val:T)=>void, obj:any)
	{
		this.cb = cb;
		this.obj = obj;
	}

	public exec(val:T)
	{
		if(this.obj)
		{
			this.cb.call(this.obj, val);
		} else
		{
			this.cb(val);
		}
	}
}

export interface EditorEvent
{
	editor:TextEditor;
	isTargetType:boolean;
	isDocumentChanged:boolean;
}

export class ActiveEditorController
{
	private disposable: Disposable;
	private version: number;
	private filePath: string;

	private editorActive:Caller<EditorEvent>[];
	private documentChanged:Caller<EditorEvent>[];

	constructor() {
		this.editorActive = [];
		this.documentChanged = [];

		const d: Disposable[] = [];
		window.onDidChangeTextEditorSelection(this.doChangeSelection, this, d);
		window.onDidChangeActiveTextEditor(this.doChangeEditorEvent, this, d);

		this.disposable = Disposable.from(...d);

		const e = window.activeTextEditor;
		if(e)
		{
			this.setEditor(e);
		}
	}

	public dispose() {
		this.disposable.dispose();
	}

	/**
	 * エディタがアクティブになった際のイベントハンドラを登録する
	 * @param handler イベントハンドラ
	 * @param obj イベントハンドラを所持するクラスオブジェクト
	 * @param disposables 解除用。これに追加する
	 */
	public onEditorActive (handler:(eve:EditorEvent)=>void, obj:any, disposables:Disposable[]):void
	{
		const x = this.editorActive.length;
		this.editorActive.push(new Caller(handler, obj));

		const ds = new Disposable(()=>{
			this.editorActive = this.editorActive.filter((v,i,a) =>
				{
					return i !== x;
				});
		});
		disposables.push(ds);
	}


	/**
	 * アクティブなエディタのドキュメントが変更された際のイベントハンドラを登録する
	 * @param handler イベントハンドラ
	 * @param obj イベントハンドラを所持するクラスオブジェクト
	 * @param disposables 解除用。これに追加する
	 */
	 public onDocumentChanged(handler:(eve:EditorEvent)=>void, obj:any, disposables:Disposable[])
	{
		const x = this.editorActive.length;
		this.documentChanged.push(new Caller(handler, obj));

		const ds = new Disposable(()=>{
			this.editorActive = this.editorActive.filter((v,i,a) =>
				{
					return i !== x;
				});
		});
		disposables.push(ds);
	}

	private setEditor(e:TextEditor):void
	{
		const d = e.document;
		this.filePath = d.uri.fsPath;
		this.version = d.version;
	}

	/**
	 * アクティブなエディタが変更になった際のイベントハンドラ
	 * @param e 
	 */
	private doChangeEditorEvent(e:TextEditor | undefined)
	{
		const b1 = !!e && e.document.languageId === 'noveltext';
		const b2 = !!e && (e.document.version !== this.version || e.document.uri.fsPath !== this.filePath);

		if(b1) {
			this.setEditor(e);
		}
		for(let i=0; i<this.editorActive.length; ++i)
		{
			this.editorActive[i].exec({editor:e, isTargetType:b1, isDocumentChanged:b2});
		}
	}

	/**
	 * 選択状況が変わった際のイベントハンドラ。カーソル位置が変わっただけで呼ばれるが、カーソル位置が変わらなければ、ドキュメントが変更されても呼ばれない
	 * @param s 
	 */
	private doChangeSelection(s:TextEditorSelectionChangeEvent)
	{
		const e = s.textEditor;
		// 前回のカウントとドキュメントバージョンが変わっていたらカウントしなおし。
		if(e.document.languageId === 'noveltext' && (e.document.version !== this.version || e.document.uri.fsPath !== this.filePath))
		{
			this.setEditor(e);
			for(let i=0; i<this.editorActive.length; ++i)
			{
				this.documentChanged[i].exec({editor:e, isTargetType:true, isDocumentChanged:true});
			}
		}
	}
}
