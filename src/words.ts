import {
	readFile,
} from 'fs';
import {
	CancellationToken,
	Disposable,
	DocumentSemanticTokensProvider,
	Hover,
	HoverProvider,
	languages,
	MarkdownString,
	Position,
	ProviderResult,
	SemanticTokens,
	SemanticTokensBuilder,
	SemanticTokensLegend,
	TextDocument,
	window,
	workspace
} from 'vscode';
import * as util from 'util';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();
let myTokenProvider:MyDocumentSemanticTokensProvider;

const legend = (function () {
	const tokenTypesLegend = [
		'region', 'character', 'family', 'magic', 'monster', 'animal', 'plant', 'crop', 'food'
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend = [
		'name', 'title', 'surname', 'family', 'domain', 'clan', 'baptism', 'nickname'
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

interface ParsedToken
{
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifier: string;
	tokens: Token[];
}


/**
 * トークン分類と、ホバーに関する機能を提供するクラス
 */
class MyDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider, HoverProvider
{
	private tokens:Tokens;
	// ホバーのために解析結果のキャッシュは必要。ホバー表示のために毎回解析は無駄すぎる
	private docCache:Map<TextDocument, ParsedToken[]>;

	constructor()
	{
		this.tokens = new Tokens();
		this.tokens.normalize();
		this.docCache = new Map<TextDocument, ParsedToken[]>();
	}

	/**
	 * コンフィグや定義ファイルが変更されたら呼び出される想定。
	 * @param tokens トークン定義
	 */
	setTokens(tokens:Tokens)
	{
		this.tokens = tokens;
		this.docCache.clear();
	}

	/**
	 * ドキュメントが更新されるたびに呼び出される想定。
	 * @param doc 対象となるドキュメント
	 * @param _canncellation 処理のキャンセル用。使用しない
	 * @returns ドキュメントのトークンを一覧で返す
	 */
	async provideDocumentSemanticTokens(doc: TextDocument, _canncellation: CancellationToken): Promise<SemanticTokens>
	{
		const allTokens = this.extractToken(doc);
		this.docCache.set(doc, allTokens);

		const builder = new SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				this.getTokenTypeId(token.tokenType),
				this.getTokenModifierId(token.tokenModifier)
			);
		});
		return builder.build();
	}

	/**
	 * キャッシュ表示の際に呼び出される想定。
	 * @param doc 対象となるドキュメント
	 * @param position カーソルの位置
	 * @param _canncellation 処理のキャンセル用。使用しない
	 * @returns ホバーの内容を返す。ホバー表示が必要無ければ空で返す
	 */
	provideHover(doc: TextDocument, position: Position, _canncellation: CancellationToken): ProviderResult<Hover>
	{
		if(this.docCache.has(doc))
		{
			const allTokens = this.docCache.get(doc);
			const parsedToken = allTokens.find(pt=>{
					const b = pt.line === position.line && pt.startCharacter <= position.character && position.character < (pt.startCharacter + pt.length);
					return b ? pt : undefined;
				});
			if(parsedToken){
				let msArray:MarkdownString[] = [];
				let i = 0;
				parsedToken.tokens.forEach(token => {
					let description = token.description;
					if(i===0)
					{
						description = "**" + token.fullname + "**\n\n---\n\n" + description;
					}
					msArray.push(new MarkdownString(description));
					++i;
				});
				const h:Hover = new Hover(msArray);
				return h;
			}
			return;
		}
	}

	private getTokenTypeId(tokenType: string): number
	{
		return tokenTypes.has(tokenType) ? tokenTypes.get(tokenType): 0;
	}

	private getTokenModifierId(modifier: string): number
	{
		return tokenModifiers.has(modifier) ? (1 << tokenModifiers.get(modifier)): 0;
	}

	/**
	 * ドキュメントを返してトークン分解する。
	 * @param doc 解析するドキュメント
	 * @returns 分解したトークン
	 */
	private extractToken(doc: TextDocument): ParsedToken[]
	{
		const r: ParsedToken[] = [];
		let line = 0;
		let col = 0;
		while(true)
		{
			let tr = this.tokens.findMatch(doc, line, col);
			if(tr.length > 0) {
				r.push({
					line: tr[0].line,
					startCharacter: tr[0].character,
				 	length: tr[0].length,
					tokenType: this.tokenType(tr[0].token.tokenType),
					tokenModifier: this.tokenModifier(tr[0].token.tokenType),
					tokens: this.tokenList(tr)
				});
				line = tr[0].line;
				col = tr[0].character + tr.length;
			} else {
				break;
			}
		}
		return r;
	}
	private tokenList(trArray:TokenRange[]): Token[]
	{
		let result:Token[] = [];
		trArray.forEach(t => {
			result.push(t.token);
		});
		return result;
	}

	private tokenType(tt:TokenType):string {
		switch(tt) {
			case TokenType.regionName:
				return "region";
			case TokenType.characterName:
			case TokenType.characterTitle:
			case TokenType.characterSurname:
			case TokenType.characterFamily:
			case TokenType.characterDomain:
			case TokenType.characterClan:
			case TokenType.characterBaptism:
			case TokenType.characterNickname:
				return "character";
			case TokenType.familyName:
				return "family";
			case TokenType.magicName:
				return "magic";
			case TokenType.monsterName:
				return "monster";
			case TokenType.animalName:
				return "animal";
			case TokenType.plantName:
				return "plant";
			case TokenType.cropName:
				return "crop";
			case TokenType.foodName:
				return "food";
		}
	}

	private tokenModifier(tt:TokenType):string
	{
		switch(tt) {
			case TokenType.regionName:
			case TokenType.characterName:
			case TokenType.familyName:
			case TokenType.magicName:
			case TokenType.monsterName:
			case TokenType.animalName:
			case TokenType.plantName:
			case TokenType.cropName:
			case TokenType.foodName:
				return "name";

			case TokenType.characterTitle:
				return "title";
			case TokenType.characterSurname:
				return "surname";
			case TokenType.characterFamily:
				return "family";
			case TokenType.characterDomain:
				return "domain";
			case TokenType.characterClan:
				return "clan";
			case TokenType.characterBaptism:
				return "baptism";
			case TokenType.characterNickname:
				return "nickname";
		}

	}
}


export enum TokenType {
	regionName = 1,
	familyName = 101,
	characterName = 201,
	characterTitle = 202,
	characterSurname = 203,
	characterFamily = 204,
	characterDomain = 205,
	characterClan = 206,
	characterBaptism = 207,
	characterNickname = 208,
	magicName = 301,
	monsterName = 401,
	animalName = 501,
	plantName = 601,
	cropName = 701,
	foodName = 801
}

export class Token {
	readonly name: string;
	readonly tokenType: TokenType;
	readonly description: string;
	readonly fullname: string;
	private children: Token[];

	constructor(name: string, tokenType: TokenType, desc:string, fullname:string)
	{
		this.name = name;
		this.tokenType = tokenType;
		this.description = desc;
		this.fullname = fullname;
	}

	appendChild(child:Token) :void {
		if(!this.children) {
			this.children = [];
		}
		this.children.push(child);
	}
}

export class TokenRange
{
	token:Token;
	line:number;
	character:number;
	length:number;
}

export class Tokens
{
	private a:Token[];
	private x:Map<string,Token[]>;
	constructor()
	{
		this.a = [];
	}
	set(key:string|string[]|UniquenounsName, tokenType:TokenType, desc?:string|undefined, fullname?:string|undefined):void
	{
		if(key)
		{
			if(key instanceof Array)
			{
				key.forEach(s => this.set(s, tokenType, desc));
				return;
			}

			let k:string = (typeof key === 'string') ? key : (key as UniquenounsName).base;
			let fn:string = fullname ? fullname : k;
			this.a.push(new Token(k, tokenType, desc===undefined?"":desc, fn));
		}
	}
	normalize():void {
		let x:Map<string,Token[]> = new Map();
		this.a.forEach(token =>
		{
			let c = token.name.substr(0, 1);
			if(x.has(c))
			{
				x.get(c).push(token);
			} else
			{
				x.set(c, [token]);
			}
		});
		this.x = x;
	}
	findMatch(s:TextDocument, beginLine:number, beginCol:number):TokenRange[]
	{
		let beginColIdx = beginCol;

		let trs:TokenRange[] = [];

		for(let lineIdx = beginLine; lineIdx<s.lineCount; ++lineIdx)
		{
			let lineBuff = s.lineAt(lineIdx).text;
			let z = lineBuff.length;
			for(let i=beginColIdx; i<z; ++i)
			{
				let matched:Token;
				let tokenLen = 0;
				let c = lineBuff.charAt(i);
				if(this.x.has(c))
				{
					let maxLen = 0;
					let minSubCategory = 999;
					this.x.get(c).forEach(token=>{
						const x1 = lineBuff.substr(i, token.name.length);
						const x2 = token.name;
						const subCategory = token.tokenType % 100;
						if(x1 === x2 && maxLen <= token.name.length && minSubCategory >= subCategory)
						{
							if(maxLen < token.name.length)
							{
								maxLen = token.name.length;
							}
							if(minSubCategory > subCategory)
							{
								minSubCategory = subCategory;
							}
							trs.push({
								token: token,
								line: lineIdx,
								character: i,
								length: token.name.length
							});
						}
					});
					if(trs.length > 0)
					{
						return trs.filter(tr => tr.length === maxLen && (tr.token.tokenType % 100) === minSubCategory);
					}
				}
			}
			beginColIdx = 0;
		}
		return trs;
	}
}

interface UniquenounsSetting {
	nameOrder: string[] | undefined;
	nameSeparator: string | undefined;
	regionOrder: string[] | undefined;
}

interface UniquenounsName {
	base: string;
	body: string | undefined;
	ruby: string | undefined;
	prefix: string | undefined;
	postfix: string | undefined;
}

interface UniquenounsBase {
	name: string | UniquenounsName;
	description: string | undefined;
}
interface UniquenounsRegion extends UniquenounsBase {
	type: string;
	class: string;
	child: UniquenounsRegion[];
}
interface UniquenounsCharacter extends UniquenounsBase  {
	title: string | undefined;
	surname: string | undefined;
	family: string[] | string | undefined;
	domain: string[] | string | undefined;
	clan: string | undefined;
	baptism: string | undefined;
	nickname: string | undefined;
	age: string | undefined;
	firstperson: string | undefined;
	secondperson: string | undefined;
}
interface UniquenounsFamily extends UniquenounsBase  {
	peerage: string | undefined;
	faction: string | undefined;
}

interface Uniquenouns {
	settings: UniquenounsSetting | undefined;
	regions: UniquenounsRegion[] | undefined;
	characters: UniquenounsCharacter[] | undefined;
	families: UniquenounsFamily[] | undefined;
	magics: UniquenounsBase[] | undefined;
	monsters: UniquenounsBase[] | undefined;
	animals: UniquenounsBase[] | undefined;
	plants: UniquenounsBase[] | undefined;
	crops: UniquenounsBase[] | undefined;
	foods: UniquenounsBase[] | undefined;
}

async function readFilePromise(path:string): Promise<string>
{
	let data:string = "";
	if(path !== "")
	{
		try
		{
			data = await util.promisify(readFile)(path, "utf-8");
		}catch(exc)
		{
			window.showInformationMessage("Failed to read the file: " + path);
			data = "";
		}
	}
	return data;
}

/**
 * 固有名詞定義を登録する。
 * @returns 
 */
export function registUniquenouns(): Disposable[]
{
	let ds:Disposable[] = [];
	myTokenProvider = new MyDocumentSemanticTokensProvider();
	ds.push(languages.registerDocumentSemanticTokensProvider(
			{ language: 'noveltext'}, myTokenProvider, legend
		));

	ds.push(languages.registerHoverProvider({ scheme: 'file', language: 'noveltext' }, myTokenProvider));
	return ds;
}


export function reloadUniquenouns(path:string): void
{
	readFilePromise(path).then(data=>{
		myTokenProvider.setTokens(readUniquenouns(data));

		workspace.textDocuments.forEach((doc, index, ary) => {
			if(doc.languageId === 'noveltext')
			{
				languages.setTextDocumentLanguage(doc, 'plaintext');
				languages.setTextDocumentLanguage(doc, 'noveltext');
			}
		});
	});
} 


export function readUniquenouns(data:string):Tokens {
	let tokens = new Tokens();
	if(data !== "")
	{
		try {
			let u:Uniquenouns = JSON.parse(data);
			let nameOrder = ["family", "name"];
			let nameSeparator = "";
			if(u.settings)
			{
				nameOrder = u.settings.nameOrder;
				nameSeparator = u.settings.nameSeparator;
			}
			const makeFullname = (ch:UniquenounsCharacter):string =>
			{
				let o = ch as object;
				let result = "";
				for(let i=0; i<nameOrder.length; ++i)
				{
					if(o[nameOrder[i]])
					{
						if(i>0)
						{
							result += nameSeparator;
						}
						result += o[nameOrder[i]];
					}
				}
				return result;
			};

			// 地域一覧を処理
			if(u.regions)
			{
				let regionProc = (regions:UniquenounsRegion[], parent:UniquenounsRegion|undefined, addDesc:string) =>
				{
					regions.forEach(region =>
					{
						let desc = region.description === undefined ? "" : region.description;
						tokens.set(region.name, TokenType.regionName, desc + addDesc);
						if(region.child && region.child.length > 0)
						{
							let ad = addDesc + "\n - " + region.name;
							if(region.class)
							{
								ad += region.class;
							}
							regionProc(region.child, region, ad);
						}
					});
				};
				regionProc(u.regions, undefined, "");
			}

			// キャラクタ一覧
			if( u.characters )
			{
				u.characters.forEach(character => {
					const fullname = makeFullname(character);
					let desc = character.description ? character.description : "";
					let d:string = "";
					if(character.age)
					{
						d += "**年齢**: " + character.age + "\n\n";
					}
					if(character.firstperson)
					{
						d += "**一人称**: " + character.firstperson + "\n\n";
					}
					if(character.secondperson)
					{
						d += "**二人称**: " + character.secondperson + "\n\n";
					}
					d += desc;
					tokens.set(character.name, TokenType.characterName, d, fullname);
					tokens.set(character.title, TokenType.characterTitle, d, fullname);
					tokens.set(character.surname, TokenType.characterSurname, d, fullname);
					tokens.set(character.family, TokenType.characterFamily, d, fullname);
					tokens.set(character.domain, TokenType.characterDomain, d, fullname);
					tokens.set(character.clan, TokenType.characterClan, d, fullname);
					tokens.set(character.baptism, TokenType.characterBaptism, d, fullname);
					tokens.set(character.nickname, TokenType.characterNickname, d, fullname);
				});
			}
			if( u.families )
			{
				u.families.forEach(family =>{
					let desc = family.description ? family.description : "";
					let d:string = "";
					if(family.faction)
					{
						d += "**派閥**: " + family.faction + "\n\n";
					}
					if(family.peerage)
					{
						tokens.set(family.name + family.peerage, TokenType.familyName, d + desc);
						d = "**階級**: " + family.faction + "\n\n" + d;
					}
					d += desc;
					tokens.set(family.name, TokenType.familyName, d);
				});
			}
			if( u.magics )
			{
				u.magics.forEach(magic => {
					tokens.set(magic.name, TokenType.magicName, magic.description);
				});
			}
			if( u.monsters )
			{
				u.monsters.forEach(monster => {
					tokens.set(monster.name, TokenType.monsterName, monster.description);
				});
			}
			if( u.animals )
			{
				u.animals.forEach(animal => {
					tokens.set(animal.name, TokenType.animalName, animal.description);
				});
			}
			if( u.plants )
			{
				u.plants.forEach(plant => {
					tokens.set(plant.name, TokenType.plantName, plant.description);
				});
			}
			if( u.crops )
			{
				u.crops.forEach(crop => {
					tokens.set(crop.name, TokenType.cropName, crop.description);
				});
			}
			if( u.foods )
			{
				u.foods.forEach(food => {
					tokens.set(food.name, TokenType.foodName, food.description);
				});
			}
		}catch(ex)
		{
			console.log(ex);
		}
	}
	tokens.normalize();
	return tokens;
}
