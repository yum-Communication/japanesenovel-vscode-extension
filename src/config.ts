import { workspace } from 'vscode';

export interface NovelExtFormatConfig
{
	/** 段落のインデント数 */
	paragraphIndentNum:number;
	/** 段落のインデント文字種別 */
	paragraphIndentType:string;
	/** 台詞のインデント数 */
	dialogueIndentNum:number;
	/** 台詞のインデント文字種別 */
	dialogueIndentType:string;
	/** 台詞末尾の句点 */
	periodAtEndOfDialogue:string;
	/** 疑問符・感嘆符の後の空白 */
	spaceAfterExclamation:string;
	/** 疑問符・感嘆符の後の空白の種別 */
	spaceAfterExclamationType:string;

	/** 傍点（圏点）に使用するマーク */
	emphasisMark:string;
}

export class NovelExtConfig
{
	/**
	 * 固有名詞の設定ファイル
	 */
	uniquenouns:string;
	format:NovelExtFormatConfig;

	constructor() {
		this.format = {
			paragraphIndentNum: 1,
			paragraphIndentType: "全角空白",

			dialogueIndentNum: 0,
			dialogueIndentType: "全角空白",

			periodAtEndOfDialogue: "そのまま",

			spaceAfterExclamation: "追加",
			spaceAfterExclamationType: "全角空白",

			emphasisMark: "﹅ 黒ゴマ"
		};
	}

	public reload() {
		const conf = workspace.getConfiguration('NovelText');

		this.uniquenouns = conf.get("uniquenouns");

		this.format.paragraphIndentNum = conf.get<number>("formatting.paragraphIndentNum");
		this.format.paragraphIndentType = conf.get<string>("formatting.paragraphIndentType");

		this.format.dialogueIndentNum = conf.get<number>("formatting.dialogueIndentNum");
		this.format.dialogueIndentType = conf.get<string>("formatting.dialogueIndentType");

		this.format.periodAtEndOfDialogue = conf.get<string>("formatting.periodAtEndOfDialogue");

		this.format.spaceAfterExclamation = conf.get<string>("formatting.spaceAfterExclamation");
		this.format.spaceAfterExclamationType = conf.get<string>("formatting.spaceAfterExclamationType");
		this.format.emphasisMark = conf.get<string>("formatting.emphasisMark");
	}
}

export let config:NovelExtConfig = new NovelExtConfig();
