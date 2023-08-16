import { workspace } from 'vscode';

export interface NovelExtFormatConfig {
	/** 段落のインデント数 */
	paragraphIndentNum: number;
	/** 段落のインデント文字種別 */
	paragraphIndentType: string;
	/** 台詞のインデント数 */
	dialogueIndentNum: number;
	/** 台詞のインデント文字種別 */
	dialogueIndentType: string;
	/** 台詞末尾の句点 */
	periodAtEndOfDialogue: string;
	/** 疑問符・感嘆符の後の空白 */
	spaceAfterExclamation: string;
	/** 疑問符・感嘆符の後の空白の種別 */
	spaceAfterExclamationType: string;

	/** 傍点（圏点）に使用するマーク */
	emphasisMark: string;

	/** 三点リーダーの数 */
	dotLeader: string;
	/** ダッシュの数 */
	dashNumber: string;
	/** ダッシュの種類 */
	dashType: string;
}
export interface NovelExtWritingConfig {
	/** 短縮形式のルビを原稿中に使うか */
	useShortRuby: boolean;
	/** 丸括弧でのルビ（短縮形式）を原稿中に使うか */
	useParenthesesRuby: boolean;
}

export interface PreviewConfig {
	height: number;
	fontSize: number;
}

export class NovelExtConfig {
	/**
	 * 固有名詞の設定ファイル
	 */
	uniquenouns: string;
	format: NovelExtFormatConfig;
	preview: PreviewConfig;
	writing: NovelExtWritingConfig;

	constructor() {
		this.format = {
			paragraphIndentNum: 1,
			paragraphIndentType: "全角空白",

			dialogueIndentNum: 0,
			dialogueIndentType: "全角空白",

			periodAtEndOfDialogue: "そのまま",

			spaceAfterExclamation: "追加",
			spaceAfterExclamationType: "全角空白",

			emphasisMark: "﹅ 黒ゴマ",

			dotLeader: "偶数個にする",
			dashNumber: "偶数個にする",
			dashType: "U+2015 ―水平棒",
		};

		this.writing = {
			useShortRuby: false,
			useParenthesesRuby: false
		};

		this.preview =
		{
			height: 40,
			fontSize: 18
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

		this.preview.height = conf.get<number>("preview.height");
		this.preview.fontSize = conf.get<number>("preview.fontSize");

		this.writing.useShortRuby = conf.get<boolean>("writing.useShortRuby");
		this.writing.useParenthesesRuby = conf.get<boolean>("writing.useParenthesesRuby");

		this.format.dotLeader = conf.get<string>("formatting.dotleader");
		this.format.dashNumber = conf.get<string>("formatting.dashNum");
		this.format.dashType = conf.get<string>("formatting.dashType");
	}
}

export let config: NovelExtConfig = new NovelExtConfig();
