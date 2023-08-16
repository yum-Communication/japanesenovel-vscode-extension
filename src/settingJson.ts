import * as fs from 'fs';
import * as path from 'path';
import { workspace } from 'vscode';

interface SettingType {
    foreground?: string,
    fontStyle?: string,
}
interface TextMateRulesType {
    scope?: string,
    settings?: SettingType
}

interface EditorTokenColorCustomizationsType {
    comments?: string,
    textMateRules?: TextMateRulesType[]
}
interface SettingJsonType {
    'editor.tokenColorCustomizations'?: EditorTokenColorCustomizationsType
}
interface WorkspaceJsonType {
    settings?: SettingJsonType
}

const makeTextMateRulesTypes = (): TextMateRulesType[] => {
    return [
        {
            scope: 'novel.text.dialogue',
            settings: {
                foreground: '#ffaaff'
            }
        },
        {
            scope: 'novel.invalid',
            settings: {
                foreground: '#ff8888',
                fontStyle: 'bold underline'
            }
        },
        {
            scope: 'novel.numerals',
            settings: {
                foreground: '#8888ff'
            }
        },
        {
            scope: 'novel.text.ruby',
            settings: {
                foreground: '#cc8800'
            }
        },
        {
            scope: 'novel.text.katakana',
            settings: {
                foreground: '#ffffcc'
            }
        },
        {
            scope: 'novel.text.punctuation',
            settings: {
                foreground: '#008800'
            }
        },
        {
            scope: 'novel.text.kanji',
            settings: {
                fontStyle: 'underline'
            }
        },
        {
            scope: 'novel.text.kanji.common',
            settings: {
                fontStyle: ''
            }
        }
    ];
};

const makeEditorTokenColorCustomizationsType = (): EditorTokenColorCustomizationsType => {
    return {
        comments: '#aaaaff',
        textMateRules: makeTextMateRulesTypes()
    };
};

function readFile(path: string): Promise<string> {
    return new Promise<string>((ok, ng) => {
        try {
            fs.readFile(path, 'utf-8', (err: NodeJS.ErrnoException, data: string) => {
                if (err) {
                    ng(err);
                }
                ok(data);
            });
        } catch (x) {
            ng(x);
        }

    });
}

function writeFile(path: string, data: string): Promise<void> {
    return new Promise<void>((ok, ng) => {
        try {
            fs.writeFile(path, data, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException): void => {
                if (err) {
                    ng(err);
                }
                ok();
            });
        } catch (x) {
            ng(x);
        }

    });
}

function mkdir(path: string): Promise<void> {
    return new Promise<void>((ok, ng) => {
        try {
            fs.mkdir(path, (err: NodeJS.ErrnoException): void => {
                if (err) {
                    ng(err);
                }
                ok();
            });
        } catch (x) {
            ng(x)
        }
    })
}

export function makeSettingsJson(): void {

    const writeSettings = (x: SettingJsonType): void => {
        if (!x['editor.tokenColorCustomizations']) {
            x['editor.tokenColorCustomizations'] = makeEditorTokenColorCustomizationsType()
        } else {
            const a = x['editor.tokenColorCustomizations']
            if (!a.comments) {
                a.comments = '#aaaaff';
            }
            if (!a.textMateRules) {
                a.textMateRules = makeTextMateRulesTypes();
            }
        }
    };

    if (workspace.workspaceFile) {
        // ワークスペースの設定ファイルが存在している
        const filePath1: string = workspace.workspaceFile.fsPath;
        readFile(filePath1).then((data) => {
            const w: WorkspaceJsonType = JSON.parse(data);
            if (!w.settings) {
                w.settings = {};
            }
            writeSettings(w.settings);
            const jsonStrig = JSON.stringify(w, undefined, 4);
            writeFile(filePath1, jsonStrig);
        }).catch((_e: any) => {
        });
    } else {
        const wfs = workspace.workspaceFolders;
        if (workspace.workspaceFolders) {
            const baseDir: string = workspace.workspaceFolders[0].uri.fsPath;
            const dirPath: string = path.join(baseDir, '.vscode');
            const filePath2: string = path.join(dirPath, 'settings.json');
            mkdir(dirPath).then(() => {
                return readFile(filePath2);
            }).then((data:string) => {
                const u: SettingJsonType = JSON.parse(data);

                writeSettings(u);
                const jsonStrig = JSON.stringify(u, undefined, 4);
                writeFile(filePath2, jsonStrig);
            }).catch((_e: any) => {
                const u: SettingJsonType = {
                    'editor.tokenColorCustomizations': makeEditorTokenColorCustomizationsType()
                };

                writeSettings(u);
                const jsonStrig = JSON.stringify(u, undefined, 4);
                writeFile(filePath2, jsonStrig);
            });
        }
    }




}