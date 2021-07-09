import * as globby from 'globby';
import * as path from 'path';
import {
	NoParamCallback,
	readFileSync,
	writeFile
} from 'fs';
import { Position, TextDocument, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { sync } from 'globby';

function extractRubyFromString(rubys:Map<string,number>, data:string) {
	let rgx:RegExp = RegExp("[|｜](?!《)[^《]+《[^》]+》", 'g');
	let rgxx:RegExp = RegExp("《[・﹅﹆●○]》");
	let m:RegExpExecArray;
	while((m = rgx.exec(data)) !== null){
		let n = 1;
		let s = m[0].replace(/^\|/, "｜");
		// 傍線用のルビ設定の場合は無視する
		if(!rgxx.test(s)) 
		{
			if(rubys.has(s))
			{
				n = rubys.get(s) + 1;
			}
			rubys.set(s, n);
		}
	}
}

function saveRuby(map:Map<string,number>, savePath:string, callback:NoParamCallback): void 
{
	let d:string = "";
	let keys:string[] = [];
	map.forEach((v, k, m) => {
		keys.push(k.substring(1, k.length));
	});

	keys.sort();
	keys.forEach(k => {
		d += "｜" + k + "\n";
	});
	writeFile(savePath, d, callback);
}

async function toNewFile(d:string)
{
	try {
		let doc = await workspace.openTextDocument({language: "plaintext"});
		await window.showTextDocument(doc);
		window.activeTextEditor.edit(editBuilder => {
			editBuilder.insert(new Position(0, 0), d);
		});
	} catch(e) {
		console.log(e);
	}
}

export function extractRubyFromDoc(doc:TextDocument, savePath:string): void {
	let map:Map<string,number> = new Map();
	extractRubyFromString(map, doc.getText());

	let d:string = "";
	map.forEach((v, k, m) => {
		d += k + "\n";
	});

	toNewFile(d);
	// saveRuby(map, savePath, () =>{
	// 	window.showInformationMessage('The extraction of ruby has been completed.');
	// });
	return;
}

export function extractRubyFromWorkspace(wsf:readonly WorkspaceFolder[], savePath:string): void {
	let rgx1:RegExp = /^(.*)[/\\]([^/\\]*)$/;
	let rgx2:RegExp = /^(.*)\.([^.]*)$/;
	let map:Map<string,number> = new Map();
	let folderCount = 0;
	let fileAry:string[] = [];

	(async () =>
		{
			await Promise.all(
				wsf.map(async (folder:WorkspaceFolder, i:number, a:WorkspaceFolder[]) => {
					let searchPath = path.posix.join(folder.uri.fsPath.replace(/\\/g, "/"), "**", "*.txt");
					let files:string[] = globby.sync(searchPath);
					fileAry.push(...files);
				})
			);
		}
	)();

	(async () => {
		await Promise.all(
			fileAry.map(async (fn:string, i:number, a:string[]) => {
				let data:string = readFileSync(fn, {encoding: "utf-8"});
				extractRubyFromString(map, data);
			})
		);
	})();
	saveRuby(map, savePath, () =>
	{
		window.showInformationMessage('The extraction of ruby has been completed.');
	});
}
