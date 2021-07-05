import * as glob from 'glob';
import * as path from 'path';
import {
	NoParamCallback,
	readFile,
	writeFile
} from 'fs';
import { TextDocument, Uri, window, WorkspaceFolder } from 'vscode';

function extractRubyFromString(rubys:Map<string,number>, data:string) {
	let rgx:RegExp = RegExp("[|｜](?!《)[^《]+《[^》]+》", 'g');
	let rgxx:RegExp = RegExp("《[・﹅●○]》");
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
	map.forEach((v, k, m) => {
		d += k + "\n";
	});
	writeFile(savePath, d, callback);
}

export function extractRubyFromDoc(doc:TextDocument, savePath:string): void {
	let map:Map<string,number> = new Map();
	extractRubyFromString(map, doc.getText());
	saveRuby(map, savePath, () =>{
		window.showInformationMessage('The extraction of ruby has been completed.');
	});
	return;
}

export function extractRubyFromWorkspace(wsf:readonly WorkspaceFolder[], savePath:string): void {
	let rgx1:RegExp = /^(.*)[/\\]([^/\\]*)$/;
	let rgx2:RegExp = /^(.*)\.([^.]*)$/;
	let searchPath = path.join(wsf[0].uri.fsPath, "**", "*.txt");
	let map:Map<string,number> = new Map();
	let finishCount: number = 0;
	glob(searchPath, (err: any, files: any[]) =>
	{
		if(!err)
		{
			files.forEach( fn =>
			{
				readFile(fn, {encoding:"utf-8"}, (err, data) =>
				{
					extractRubyFromString(map, data);
					++finishCount;
					if(finishCount === files.length)
					{
						saveRuby(map, savePath, () =>
						{
							window.showInformationMessage('The extraction of ruby has been completed.');
						});
					}
				});
			});
		}
	});
}
