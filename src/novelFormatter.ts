import { Diagnostic, DiagnosticSeverity, Position, Range } from 'vscode';
import {
	config
} from './config';

export enum ConvertType {
	narou = 1,
	kakuyomu = 2,
	novelup = 3,
	html = 4
}

type NovelFormatter = (row:string)=>string;
type NovelLint = (line:number, row:string, diagnostic:Diagnostic[]) => void;

/**
 * ルビの中に括弧が入っていないかをチェック
 */
function parenInRuby(): NovelLint
{
	const rgx1:RegExp = /[|｜]([^|｜《》]+)《([^|｜《》]+)》/g;
	const rgx2:RegExp = /[()（）]+/g;
	return (line:number, row:string, diagnostic:Diagnostic[]) =>
	{
		let m:RegExpExecArray;
		let a:RegExpExecArray;
		let b:RegExpExecArray;
		while((m = rgx1.exec(row)) !== null)
		{
			let offset = m.index + 1;
			while((a = rgx2.exec(m[1])) !== null)
			{
				const begin = new Position(line, offset + a.index);
				const end = new Position(line, offset + a.index + a[0].length);
				diagnostic.push(new Diagnostic(new Range(begin, end), "ルビの親に丸括弧を使用することはできません", DiagnosticSeverity.Error));
			}

			offset += m[1].length + 1;
			while((b = rgx2.exec(m[2])) !== null)
			{
				const begin = new Position(line, offset + b.index);
				const end = new Position(line, offset + b.index + b[0].length);
				diagnostic.push(new Diagnostic(new Range(begin, end), "ルビの中に丸括弧を使用することはできません", DiagnosticSeverity.Error));
			}
		}
	};
}

interface Bracket
{
	position:number;
	chara:string;
}

/**
 * カッコの開き・閉じの整合性チェック用クラス
 */
 class BracketCheck
{
	private stack:Bracket[];
	public diagnostic:Diagnostic[];

	public constructor(copyFrom:BracketCheck|undefined)
	{
		this.stack = [];
		this.diagnostic = [];
		if(copyFrom!==undefined)
		{
			if (copyFrom.stack.length > 0)
			{
				this.stack.push(...copyFrom.stack);
			}
			if (copyFrom.diagnostic.length > 0)
			{
				this.diagnostic.push(...copyFrom.diagnostic);
			}
		}
	}

	private static diag (line:number, col:number, mes:string): Diagnostic
	{
		const begin = new Position(line, col);
		const end = new Position(line, col + 1);
		return new Diagnostic(new Range(begin, end), mes, DiagnosticSeverity.Error);
	};

	private funcA(open:string, close:string, line:number, col:number)
	{
		let b:Bracket = this.stack[this.stack.length - 1];
		if (b.chara !== open)
		{
			this.diagnostic.push(BracketCheck.diag(line, col, `'${close}' に対応する開き括弧が見つかりません`));
			return;
		}
		this.stack.pop();
	};

	private funcB(open:string, close:string, line:number, col:number)
	{
		let b:Bracket;
		while(true)
		{
			if(this.stack.length===0)
			{
				this.diagnostic.push(BracketCheck.diag(line, col, `'${close}' に対応する開き括弧が見つかりません`));
				return;
			}
	
			b = this.stack.pop();
			if (b.chara === open)
			{
				return;
			}

			this.diagnostic.push(BracketCheck.diag(line, b.position, `'${b.chara}' に対応する閉じ括弧が見つかりません`));
		}
	};

	public fork(x:string, s:string, line:number, column:number, bracketChecks:BracketCheck[]):void
	{
		let bc = new BracketCheck(this);
		bracketChecks.push(bc);

		const c = s.charAt(column);
		bc.funcA(x, c, line, column);
		bc.check(s, line, column + 1, bracketChecks);
	}

	private static isQuoted(s:string, colOffset:number):boolean
	{
		if( colOffset === 0 || colOffset === (s.length - 1))
		{
			return false;
		}
		const b = s.charAt(colOffset - 1);
		const a = s.charAt(colOffset + 1);

		return b === '"' && a === '"'
			|| b === "'" && a === "'"
			|| b === "‘" && a === "’"
			|| b === "“" && a === "”"
			|| b === "〝" && a === "〟"
			|| b === "〝" && a === "〞"
			;
	}

	public check(s:string, line:number, colOffset:number, bracketChecks:BracketCheck[]):void
	{
		const a = '([{（［｛「『【〈《〔';
		const b = ')]}）］｝」』】〉》〕';
		for(let column=colOffset; column < s.length; ++column)
		{
			const c = s.charAt(column);
			if (BracketCheck.isQuoted(s, column))
			{
				continue;
			}
			if( a.indexOf(c) >= 0)
			{
				this.stack.push({position:column, chara:c});
				continue;
			}
			const d = b.indexOf(c);
			if (d < 0)
			{
				continue;
			}
			const x = a.charAt(d);

			if(this.stack.length > 0)
			{
				this.fork(x, s, line, column, bracketChecks);
			}
			this.funcB(x, c, line, column);
		}

		this.stack.forEach(bracket =>{
			this.diagnostic.push(BracketCheck.diag(line, bracket.position, `'${bracket.chara}' に対応する閉じ括弧が見つかりません`));
		});
	}
}

/**
 * カッコの開き・閉じの整合性チェック用 
 **/
function bracketOpenClose(): NovelLint
{
	return (line:number, row:string, diagnostic:Diagnostic[]) =>
	{
		let abc:BracketCheck[] = [];
		let bc = new BracketCheck(undefined);
		abc.push(bc);
		bc.check(row, line, 0, abc);

		bc = abc.reduce((pVal, cVal) => {
			if(pVal.diagnostic.length <= cVal.diagnostic.length)
			{
				return pVal;
			}
			return cVal;
		});
		diagnostic.push(... bc.diagnostic);
	};
}



/**
 * 挿入する空白を作る
 * @param indentNum 繰り返す数
 * @param charType コンフィグで選択された空白の種類
 */
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
	return ic.repeat(indentNum);
}

/**
 * インデントを挿入する関数を返す
 * @param indentNum インデントの数
 * @param charType インデントに使用する文字の種別
 * @returns インデントを挿入する関数
 */
function addIndent(indentNumP:number, charTypeP:string, indentNumD:number, charTypeD:string): NovelFormatter
{
	const rgx1 = /^(「+[^「」]*」+)+$/;
	const rgx2 = /^(『+[^『』]*』+)+$/;
	const cP = makeReplaceChars(indentNumP, charTypeP);
	const cD = makeReplaceChars(indentNumD, charTypeD);
	return (row:string) =>
	{
		if (row.length === 0)
		{
			return row;
		}
		if (rgx1.test(row) || rgx2.test(row))
		{
			return cD + row;
		}
		return cP + row;
	};
}

/**
 * 行末の空白を除去する
 * @returns 空白を除去する関数
 */
function removeLineEndSpace(): NovelFormatter {
	const rgx = /[	 　]+$/;
	return (row:string) => {
		return row.replace(rgx, "");
	}
}

/**
 * 疑問符・感嘆符の後に空白を追加する
 * @param charType 追加する空白の種別
 * @returns 空白を挿入する関数
 */
function addSpaceAfterExclamation(charType:string): NovelFormatter
{
	// const a = '([{（［｛「『【〈《〔';
	// const b = ')]}）］｝」』】〉》〕';
	const rgx1 = new RegExp(`(?<=[⁇⁈⁉])[\ufe00-\ufe0f]`, "g");
	const rgx2 = new RegExp(`([!?！？⁇⁈⁉])(?![!?！？⁇⁈⁉（）［］「」『』〈〉《》【】${emClose}${rubyOpen}${rubyClose}])`, "g");
	const rgx3 = new RegExp(`([!?！？⁇⁈⁉]${rubyOpen}.+?${rubyClose})(?![!?！？⁇⁈⁉（）［］「」『』〈〉《》【】]|$)`, "g");
	const rgx4 = new RegExp(`([!?！？⁇⁈⁉]${emClose})(?![!?！？⁇⁈⁉（）［］「」『』〈〉《》【】]|$)`, "g");
	const c = "$1" + makeReplaceChars(1, charType);
	return (row:string) => row.replace(rgx1, "").replace(rgx2, c).replace(rgx3, c).replace(rgx4, c);
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
	const rgx = /。(?=」)/g;
	return (row:string) => row.replace(rgx, "");
 }


const emOpen	= '\u2e70';	//	《《
const emClose	= '\u2e71';	//	》》
const rubyStart	= '\u2e72';	// |
const rubyOpen	= '\u2e73';	// 《
const rubyClose	= '\u2e74';	// 》

/**
 * 
 * @returns 傍点/ルビを内部形式から変換する
 */
function toInternal(useShortRuby:boolean, useParenthesesRuby:boolean): NovelFormatter
{
	const rgx0a = /^\s+/;
	const rgx0b = /\s+$/;

	// 傍点の変換
	const rgx2 = /(?<![|｜])《《([^《》]+)》》/g;

	// ルビの変換
	const rgx3 = /[|｜]([^|｜《》]+)《([^|｜《》]+)》/g;

	// ルビで付けた傍点の変換
	const rgx4a = RegExp(`${rubyStart}(([\u0000-\ud7ff\uf000-\uffff]|[\ud800-\udbff][\udc00-\udfff])([\u3099\u309a]|[\udb40][\udd00-\uddef]|[\ufe00-\ufe0f])?)${rubyOpen}[・●○﹅﹆]${rubyClose}`, "g");
	const rgx4b = RegExp(`${emClose}${emOpen}`, "g");

	// 省略式ルビの変換
	const rgx5a = /((([々〇〻\u3400-\u9fff\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff])([\udb40][\udd00-\uddef]|[\ufe00-\ufe0f])?){1,20})《([^|｜《》]{1,20})》/g;
	const rgx5b = /([_A-Za-z][_0-9A-Za-z]{0,19})《([^|｜《》]{1,20})》/g;
	// 丸括弧を用いたルビの変換
	const rgx6a = /((([々〇〻\u3400-\u9fff\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff])([\udb40][\udd00-\uddef]|[\ufe00-\ufe0f])?){1,20})[(（]([^|()｜（）]{1,20})[)）]/g;
	const rgx6b = /([_A-Za-z][_0-9A-Za-z]{0,19})[(（]([^|()｜（）]{1,20})[)）]/g;

	const rgx7a = /[|｜]《/g;
	const rgx7b = /[|｜]\(/g;
	const rgx7c = /[|｜]（/g;

	return (row:string) => {
		let s = row.replace(rgx0a, '').replace(rgx0b, "")
				.replace(rgx2, emOpen + '$1' + emClose)
				.replace(rgx3, rubyStart + '$1' + rubyOpen + '$2' + rubyClose)
				.replace(rgx4a, emOpen + '$1' +emClose).replace(rgx4b, "");
				;
		if(useShortRuby)
		{
			s = s.replace(rgx5a, rubyStart + '$1' + rubyOpen + '$5' + rubyClose).replace(rgx5b, rubyStart + '$1' + rubyOpen + '$2' + rubyClose);
		}
		if(useParenthesesRuby)
		{
			s = s.replace(rgx6a, rubyStart + '$1' + rubyOpen + '$5' + rubyClose).replace(rgx6b, rubyStart + '$1' + rubyOpen + '$2' + rubyClose);
		}
		s = s.replace(rgx7a, '《').replace(rgx7b, '(').replace(rgx7c, '（');
		return s;
	};
}

function toNarou(): NovelFormatter
{
	const emphasisMark = "《" + config.format.emphasisMark.substr(0, 1) + "》";
	const rgx1 = /《/g;
	const rgx2 = new RegExp(`${rubyStart}(.+?)${rubyOpen}(.+?)${rubyClose}`, "g");
//	const rgx3 = new RegExp(`${emOpen}(.+?)${emClose}`, "g");
	const rgx4 = /[\u3099\u309a]|[\uDB40][\udd00-\uddef]|[\uFE00-\uFE0f]/;
	return (row:string) => {

		let b = Array(...row.replace(rgx1, "|《").replace(rgx2,"｜$1《$2》"));
		let z = b.length;
		let s = "";
		for(let i=0; i<z; ++i)
		{
			if (b[i] === emOpen)
			{
				++i;
				let a:string[] = [];
				do
				{
					if(a.length > 0 && rgx4.test(b[i]))
					{
						a[a.length-1] += b[i];
					} else {
						a.push(b[i]);
					}
					++i;
				} while(b[i] !== emClose);

				for(let k=0; k<a.length; ++k)
				{
					s += "｜" + a[k] + emphasisMark;
				}
			} else
			{
				s += b[i];
			}
		}
		return s;
	};
}

function toNovelup(): NovelFormatter
{
	return toNarou();
}

function toKakuyomu(): NovelFormatter
{
	const rgx1 = /《/g;
	const rgx2 = new RegExp(`${rubyStart}(.+?)${rubyOpen}(.+?)${rubyClose}`, "g");
	const rgx3 = new RegExp(`${emOpen}(.+?)${emClose}`, "g");
	return (row:string) => row.replace(rgx1, "|《").replace(rgx2,"｜$1《$2》").replace(rgx3, "《《$1》》");
}

function toHTML(): NovelFormatter
{
	let getIndent = (type:string, num:number):string =>
	{
		let ic = 0.5;
		switch(type)
		{
			case "全角空白":
				ic = 1;
				break;
			case "タブ":
				ic = 2;
				break;
			case "EM SP":
				ic = 1;
				break;
		}
		const x = (ic * num);
		const y = Math.floor(x);
		const z = (x-y)*10;
		return y + "em" + (z !== 0 ? z: "");
	};

	const pD = '<p class="indent-' + getIndent(config.format.dialogueIndentType, config.format.dialogueIndentNum) + '">';
	const pP = '<p class="indent-' + getIndent(config.format.paragraphIndentType, config.format.paragraphIndentNum) + '">';

	const em = "<span class=\"" + (() =>{
	switch(config.format.emphasisMark.substr(0, 1))
	{
		case "・":
			return "em-dot";
		case "●":
			return "em-circle";
		case "○":
			return "em-circle-open";
		case "﹅":
			return "em-sesame";
		case "﹆":
			return "em-sesame-open";
	}})() + "\">$1</span>";

	const rgx1a = /&/g;
	const rgx1b = /</g;
	const rgx1c = />/g;
	const rgx1d = /"/g;
	const rgx2 = new RegExp(`${rubyStart}(.+?)${rubyOpen}(.+?)${rubyClose}`, "g");
	const rgx3 = new RegExp(`${emOpen}(.+?)${emClose}`, "g");
	const rgx4 = /^(「+[^「」]*」+)+$/;
	const rgx5 = /^(『+[^『』]*』+)+$/;

	return (row:string) => 
	{
		if(row.length === 0)
		{
			return "<p><br></p>";
		}
		let s = row.replace(rgx1a, '&amp;').replace(rgx1b, '&lt;').replace(rgx1c, '&gt;').replace(rgx1d, '&quot;')
					.replace(rgx2,"<ruby>$1<rt>$2</rt></ruby>").replace(rgx3, em);
		return ((rgx4.test(row)||rgx5.test(row))?pD:pP) + s + "</p>";
	};
}

export function validateDocument(ary:string[], diagnostics:Diagnostic[]): void {

	let lints:NovelLint[] = [];
	lints.push(parenInRuby());
	lints.push(bracketOpenClose());
	ary.forEach((row, lineNum:number) =>{
		lints.forEach(lint=>{
			lint(lineNum, row, diagnostics);
		});
	});
}

export function formatDocument(ary:string[], convertType:ConvertType, diagnostics:Diagnostic[]): string {

	let cf = config.format;

	let lints:NovelLint[] = [];
	lints.push(parenInRuby());
	lints.push(bracketOpenClose());
	ary.forEach((row, lineNum:number) =>{
		lints.forEach(lint=>{
			lint(lineNum, row, diagnostics);
		});
	});

	let formatter:NovelFormatter[] = [];
	// ルビなどを変換する
	formatter.push(toInternal(config.writing.useShortRuby, config.writing.useParenthesesRuby));

	// 台詞末尾の句点
	if (cf.periodAtEndOfDialogue !== "そのまま")
	{
		// 一度削除する
		formatter.push(rmPeriodAtEndOfDialogue());
		if (cf.periodAtEndOfDialogue === "追加")
		{
			formatter.push(addPeriodAtEndOfDialogue());
		}
	}
	// 疑問符・感嘆符の後の空白
	if (cf.spaceAfterExclamation !== "そのまま")
	{
		// 一度削除する
		formatter.push(rmSpaceAfterExclamation());
		if (cf.spaceAfterExclamation === "追加")
		{
			formatter.push(addSpaceAfterExclamation(cf.spaceAfterExclamationType));
		}
	}
	
	if (convertType !== ConvertType.html)
	{
		// 必要ならばインデントをする
		if( cf.paragraphIndentNum > 0 || cf.dialogueIndentNum > 0)
		{
			formatter.push(addIndent(cf.paragraphIndentNum, cf.paragraphIndentType, cf.dialogueIndentNum, cf.dialogueIndentType));
		}
	}
	formatter.push(removeLineEndSpace());

	switch(convertType)
	{
		case ConvertType.narou:
			formatter.push(toNarou());
			break;
		case ConvertType.novelup:
			formatter.push(toNovelup());
			break;
		case ConvertType.kakuyomu:
			formatter.push(toKakuyomu());
			break;
		case ConvertType.html:
			formatter.push(toHTML());
			break;
	}

	let result:string = "";
	ary.forEach((row, i) =>{
		let tmp:string = row;
		formatter.forEach(nf =>{
			tmp = nf(tmp);
		});
		if(i===0)
		{
			result += tmp;
		} else {
			result += "\n" + tmp;
		}
	});
	return result;
 }
