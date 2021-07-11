import {
	config
} from './config';

export enum ConvertType {
	narou = 1,
	kakuyomu = 2,
	novelup = 3
}

type NovelFormatter = (row:string)=>string;

function makeReplaceChars(indentNum:number, charType:string):string {
	let ic = " ";
	switch(charType)
	{
		case "全角空白":
			ic = "　";
			break;
		case "タブ":
			ic = "	";
			break;
		case "EM SP":
			ic = "\u2003";
			break;
	}
	let r = ic.repeat(indentNum);
	return r;
}

/**
 * インデントを除去する関数を返す
 * @returns インデントを除去する関数
 */
function rmParagraphIndent(): NovelFormatter
{
	const rgx:RegExp = /^\s+/;
	return (row:string) => row.replace(rgx, "");
}

/**
 * 段落先頭にインデントを挿入する関数を返す
 * @param indentNum インデントの数
 * @param charType インデントに使用する文字の種別
 * @returns インデントを挿入する関数
 */
function addParagraphIndent(indentNum:number, charType:string): NovelFormatter
{
	const rgx = /^(?!「)/;
	const c = makeReplaceChars(indentNum, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 段落先頭にインデントを挿入する関数を返す
 * @param indentNum インデントの数
 * @param charType インデントに使用する文字の種別
 * @returns インデントを挿入する関数
 */
function addDialogueIndent(indentNum:number, charType:string): NovelFormatter
{
	const rgx = /^(?=「)/;
	const c = makeReplaceChars(indentNum, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 疑問符・感嘆符の後に空白を追加する
 * @param charType 追加する空白の種別
 * @returns 空白を挿入する関数
 */
function addSpaceAfterExclamation(charType:string): NovelFormatter
{
	const rgx = /([!?！？⁇⁈⁉])(?![!?！？⁇⁈⁉（）［］「」『』])/g;
	const c = "$1" + makeReplaceChars(1, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 疑問符・感嘆符の後の空白を除去する
 * @returns 除去する関数
 */
 function rmSpaceAfterExclamation(): NovelFormatter
 {
	const rgx = /(?<=[!?！？⁇⁈⁉])[\s　]+/g;
	return (row:string) => row.replace(rgx, "");
}

/**
 * 台詞の閉じ括弧前に句点を追加する
 * @returns 
 */
function addPeriodAtEndOfDialogue(): NovelFormatter
{
	const rgx = /([^!?！？⁇⁈⁉。．…」])(?=[」])/g;
	return (row:string) => row.replace(rgx, "$1。");
}

/**
 * 台詞の閉じ括弧前の句点を削除する
 * @returns 
 */
 function rmPeriodAtEndOfDialogue(): NovelFormatter
 {
	 const rgx = /。(?=」)/;
	 return (row:string) => row.replace(rgx, "");
 }

 /**
  * 傍点を『小説家になろう』向けに変換する
  * @returns 
  */
 function emphasisToNarou(): NovelFormatter
 {
	 const emphasisMark = "《" + config.format.emphasisMark.substr(0, 1) + "》";
	 return (row:string) => {
		const rgx = /《《([^《》]+)》》/g;

		let m:RegExpExecArray;
		let replArray:string[][] = [];
		while((m = rgx.exec(row)) !== null)
		{
			let after:string = "";
			let b:string[] = [...m[1]];
			let a:string[] = [];
			// 二文字を無理矢理一文字にする
			for(let i=0; i<b.length; ++i)
			{
				if( b[i] === "゙" || b[i] === "゚" )
				{
					a[a.length-1] += b[i];
				} else {
					a.push(b[i]);
				}
			}

			for(let i=0; i<a.length; ++i)
			{
				after += "｜" + a[i] + emphasisMark;
			}
			replArray.push([m[0], after]);
		}
		replArray.forEach(ss => {
			row = row.replace(ss[0], ss[1]);
		});
		return row;
	 };
 }

 /**
  * 
  * @returns 傍点をカクヨム向けに変換する
  */
 function emphasisToKakuyomu(): NovelFormatter
 {
	const rgx1 = /[|｜](.|[ぁあぃいぅぇえぉおっなにぬねのまみむめもゃやゅゆょよらりるれろゎわゐゑをんゕゖァアィイゥェエォオッナニヌネノマミムメモャヤュユョヨラリルレロヮワヰヱヲンヵヶ][\u3099\u309a]|[\uD800-\uDBFF][\uDC00-\uDFFF])《[・●○﹅﹆]》/g;
	const rgx2 = /》》《《/g;
	return (row:string) => {
		return row.replace(rgx1, "《《$1》》").replace(rgx2, "");
	 };
 }

export function formatDocument(s:string, convertType:ConvertType): string {
	let formatter:NovelFormatter[] = [];

	let cf = config.format;

	// インデントは一度全て除去する
	formatter.push(rmParagraphIndent());
	// 必要ならば段落のインデントをする
	if( cf.paragraphIndentNum > 0 )
	{
		formatter.push(addParagraphIndent(cf.paragraphIndentNum, cf.paragraphIndentType));
	}
	// 必要ならば台詞のインデントをする
	if( cf.dialogueIndentNum > 0 )
	{
		formatter.push(addDialogueIndent(cf.dialogueIndentNum, cf.dialogueIndentType));
	}
	// 台詞末尾の句点
	if( cf.periodAtEndOfDialogue !== "そのまま" )
	{
		// 一度削除する
		formatter.push(rmPeriodAtEndOfDialogue());
		// 必要ならば追加する
		if( cf.periodAtEndOfDialogue === "追加" )
		{
			formatter.push(addPeriodAtEndOfDialogue());
		}
	}
	// 疑問符・感嘆符の後の空白
	if( cf.spaceAfterExclamation !== "そのまま" )
	{
		// 一度削除する
		formatter.push(rmSpaceAfterExclamation());
		if( cf.spaceAfterExclamation === "追加")
		{
			formatter.push(addSpaceAfterExclamation(cf.spaceAfterExclamationType));
		}
	}
	// 行末の空白を除去する
	formatter.push(row=>row.replace(/[\s　]+$/, ""));

	formatter.push(emphasisToKakuyomu());
	if(convertType ===ConvertType.narou || convertType ===ConvertType.novelup) {
		formatter.push(emphasisToNarou());
	}

	let ary:string[] = s.split("\n");
	let result:string[] = [];
	ary.forEach(row =>{
		let tmp:string = row;
		formatter.forEach(nf =>{
			tmp = nf(tmp);
		});
		result.push(tmp);
	});
	return result.join("\n");
 }
