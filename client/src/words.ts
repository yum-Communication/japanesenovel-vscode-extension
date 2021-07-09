import {
	readFile,
} from 'fs';
import {
	CancellationToken,
	Disposable,
	DocumentSemanticTokensProvider,
	languages,
	SemanticTokens,
	SemanticTokensBuilder,
	SemanticTokensLegend,
	TextDocument
} from 'vscode';
import * as util from 'util';
const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();
let myTokenProvider:MyDocumentSemanticTokensProvider;


const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'macro', 'variable', 'parameter', 'property', 'label',
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async',
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

interface IParsedToken
{
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}


class MyDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider
{
	private tokens:Tokens;

	constructor(tokens:Tokens)
	{
		this.tokens = tokens;
	}

	async provideDocumentSemanticTokens(doc: TextDocument, _token: CancellationToken): Promise<SemanticTokens>
	{
		const allTokens = this.extractToken(doc);
		const builder = new SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				this.getTokenTypeId(token.tokenType),
				this.getTokenModifiersId(token.tokenModifiers)
			);
		});
		return builder.build();
	}

	private getTokenTypeId(tokenType: string): number
	{
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		}
		return 0;
	}

	private getTokenModifiersId(modifiers: string[]): number
	{
		let result = 0;
		for (let i = 0; i < modifiers.length; ++i)
		{
			const tokenModifier = modifiers[i];
			if (tokenModifiers.has(tokenModifier))
			{
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			}
		}
		return result;
	}

	private extractToken(doc: TextDocument): IParsedToken[]
	{
		const r: IParsedToken[] = [];
		let line = 0;
		let col = 0;
		while(true)
		{
			let tr = this.tokens.findMatch(doc, line, col);
			if(tr) {
				r.push({
					line: tr.line,
					startCharacter: tr.character,
				 	length: tr.length,
					tokenType: this.tokenType(tr.token.tokenType),
					tokenModifiers: []
				});
				line = tr.line;
				col = tr.character + tr.length;
			} else {
				break;
			}
		}
		return r;
	}

	private tokenType(tt:TokenType):string {
		switch(tt) {
			case TokenType.regionName:
			case TokenType.characterName:
			case TokenType.characterTitle:
			case TokenType.characterSurname:
			case TokenType.characterFamily:
			case TokenType.characterDomain:
			case TokenType.characterClan:
			case TokenType.characterBaptism:
				return "class";
			case TokenType.magicName:
				return "struct";
			case TokenType.monsterName:
				return "enum";
			case TokenType.animalName:
			case TokenType.plantName:
				return "interface";
			case TokenType.cropName:
			case TokenType.foodName:
				return "method";
		}
	}
}

export enum TokenType {
	regionName = 1,
	characterName = 101,
	characterTitle = 102,
	characterSurname = 103,
	characterFamily = 104,
	characterDomain = 105,
	characterClan = 106,
	characterBaptism = 107,
	magicName = 201,
	monsterName = 301,
	animalName = 401,
	plantName = 501,
	cropName = 601,
	foodName = 701

	// regionName = "region:name",
	// characterName = "character:name",
	// characterTitle = "character:title",
	// characterSurname = "character:syrname",
	// characterFamily = "character:faimily",
	// characterDomain = "character:domain",
	// characterClan = "character:clan",
	// characterBaptism = "character:baptism",
	// magicName = "magic:name",
	// monsterName = "monster:name",
	// animalName = "animal:name",
	// plantName = "plant:name",
	// cropName = "crop:name",
	// foodName = "food:name"

	// regionName = "struct",
	// characterName = "class:static",
	// characterTitle = "class:abstract",
	// characterSurname = "class:deprecated",
	// characterFamily = "class:modification",
	// characterDomain = "class:async",
	// characterClan = "class:declaration",
	// characterBaptism = "class:documentation",
	// magicName = "interface",
	// monsterName = "enum",
	// animalName = "function",
	// plantName = "method",
	// cropName = "namespace",
	// foodName = "label"
}

export class Token {
	readonly name: string;
	readonly tokenType: TokenType;
	private children: Token[];

	constructor(name: string, tokenType: TokenType)
	{
		this.name = name;
		this.tokenType = tokenType;
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
	private a:Map<string,Token>;
	private x:Map<string,Token[]>;
	constructor()
	{
		this.a = new Map();
	}
	set(key:string|string[]|UniquenounsName, tokenType:TokenType):void
	{
		if(key)
		{
			if(key instanceof Array)
			{
				key.forEach(s => this.set(s, tokenType));
				return;
			}

			let k:string = (typeof key === 'string') ? key : (key as UniquenounsName).base;
			if(!this.a.has(k)) {
				this.a.set(k, new Token(k, tokenType));
			}
		}
	}
	normalize():void {
		let x:Map<string,Token[]> = new Map();
		this.a.forEach((v,k,m)=>{
			let c = k.substr(0, 1);
			if(x.has(c))
			{
				x.get(c).push(v);
			} else
			{
				x.set(c, [v]);
			}
		});
		this.x = x;
	}
	findMatch(s:TextDocument, beginLine:number, beginCol:number):TokenRange|undefined
	{
		let beginColIdx = beginCol;

		for(let lineIdx = beginLine; lineIdx<s.lineCount; ++lineIdx)
		{
			let lineBuff = s.lineAt(lineIdx).text;
			let z = lineBuff.length;
			for(let i=beginColIdx; i<z; ++i)
			{
				let matched:Token;
				let tokenLen = 0;
				let c = lineBuff.charAt(i);
				if(this.x.has(c)){
					this.x.get(c).forEach(token=>{
						let len = token.name.length;
						if(tokenLen < len && lineBuff.substr(i, len) === token.name)
						{
							// より長いトークンを優先する
							tokenLen = len;
							matched = token;
						}
					});
					if(tokenLen > 0)
					{
						return {
							token: matched,
							line: lineIdx,
							character: i,
							length: tokenLen,
						};
					}
				}
			}
			beginColIdx = 0;
		}
		return;
	}
}

interface UniquenounsSetting {
	nameOrder: string[] | undefined;
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
}
interface UniquenounsFamily extends UniquenounsBase  {
	perrage: string | undefined;
	faction: string | undefined;
}

interface Uniquenouns {
	settings: UniquenounsSetting[] | undefined;
	regions: UniquenounsRegion[] | undefined;
	characters: UniquenounsCharacter[] | undefined;
	magics: UniquenounsBase[] | undefined;
	monsters: UniquenounsBase[] | undefined;
	animals: UniquenounsBase[] | undefined;
	plants: UniquenounsBase[] | undefined;
	crops: UniquenounsBase[] | undefined;
	foods: UniquenounsBase[] | undefined;
}

const readFilePromise = util.promisify(readFile);

export async function registUniquenouns(path:string): Promise<Disposable> {
	let data:string = await readFilePromise(path, "utf-8");
	myTokenProvider = new MyDocumentSemanticTokensProvider(readUniquenouns(data));

	return languages.registerDocumentSemanticTokensProvider(
			{ language: 'noveltext'}, myTokenProvider, legend
		);
}

export function readUniquenouns(data:string):Tokens {
	let tokens = new Tokens();
	try {
		let u:Uniquenouns = JSON.parse(data);
		// 地域一覧を処理
		let regionProc = (regions:UniquenounsRegion[]) => {
			if(regions) {
				regions.forEach(region => {
					tokens.set(region.name, TokenType.regionName);
					regionProc(region.child);
				});
			}
		};
		regionProc(u.regions);

		// キャラクタ一覧
		if( u.characters )
		{
			u.characters.forEach(character => {
				tokens.set(character.name, TokenType.characterName);
				tokens.set(character.title, TokenType.characterTitle);
				tokens.set(character.surname, TokenType.characterSurname);
				tokens.set(character.family, TokenType.characterFamily);
				tokens.set(character.domain, TokenType.characterDomain);
				tokens.set(character.clan, TokenType.characterClan);
				tokens.set(character.baptism, TokenType.characterBaptism);
			});
		}
		if( u.magics )
		{
			u.magics.forEach(magic => {
				tokens.set(magic.name, TokenType.magicName);
			});
		}
		if( u.monsters )
		{
			u.monsters.forEach(monster => {
				tokens.set(monster.name, TokenType.monsterName);
			});
		}
		if( u.animals )
		{
			u.animals.forEach(animal => {
				tokens.set(animal.name, TokenType.animalName);
			});
		}
		if( u.plants )
		{
			u.plants.forEach(plant => {
				tokens.set(plant.name, TokenType.plantName);
			});
		}
		if( u.crops )
		{
			u.crops.forEach(crop => {
				tokens.set(crop.name, TokenType.cropName);
			});
		}
		if( u.foods )
		{
			u.foods.forEach(food => {
				tokens.set(food.name, TokenType.foodName);
			});
		}
		tokens.normalize();
	}catch(ex)
	{
		console.log(ex);
	}
	return tokens;
}
