// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from "fs";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "yumNovelExt" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('yumNovelExt.helloWorld', dummy));

	if( vscode.workspace )
	{
		console.log("workspace: " + vscode.workspace.name);
		vscode.workspace.workspaceFolders?.every((value: vscode.WorkspaceFolder, index: number, array: readonly vscode.WorkspaceFolder[]) => {
			console.log("Folders: " + index + ", " + value.name);
			return true;
		} );
	
		let filename = "novel-setting.json";
		let wsPath = "";
		try {
			let wsSettings = vscode.workspace.workspaceFile?.fsPath;
			if( wsSettings )
			{
				console.log(wsSettings);
				let buff = fs.readFileSync(wsSettings);
				let strFile = buff.toString();
				let setting = JSON.parse(strFile);
				filename = setting["extensions"]["yumaCommunication.yum-novel-ext"]["uniquenouns"];
				console.log(filename);
			} else {
				let wfs = vscode.workspace.workspaceFolders;
				if(wfs)
				{
					wsPath = wfs[0].uri.fsPath;
				}
			}
		} catch (ex)
		{
			filename = "novel-setting.json";
		}  
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}


function dummy() {
	vscode.window.showInformationMessage('Hello World from yum ext!');
}