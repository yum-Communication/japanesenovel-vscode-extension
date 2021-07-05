# 小説書き向けVSCode拡張機能

VSCodeで小説を書く手伝いをするエクステンションです。

## ハイライト
以下をsettingsに設定することで、各部分に色がつきます。※対象は .txt および .nov 

novel.text.dialogue: 台詞

novel.numerals: 数詞（漢数字、算用数字ともに同色）

novel.text.ruby: ルビ（本体、ルビともに同色）
*※ルビは必ず〝｜〟で始まること。*

novel.text.katakana: カタカナ

novel.text.punctuation: 句読点


設定例）フォルダ設定の場合
.vscode/settings.json
```
{
    "editor.tokenColorCustomizations": {
        "textMateRules": [
            {
                "scope":"novel.text.dialogue",
                "settings": {
                    "foreground": "#ffaaff"
                }
            },
            {
                "scope":"novel.text.ruby",
                "settings": {
                    "foreground": "#cc8800"
                }
            }
        ]
    }
}
```

設定例）ワークスペースの場合
novel-title.code-workspace
```
{
    "folders": [
    ],
    "settings": {
        "editor.tokenColorCustomizations": {
            "textMateRules": [
                {
                    "scope":"novel.text.katakana",
                    "settings": {
                        "foreground": "#dddd00"
                    }
                },
                {
                    "scope":"novel.text.punctuation",
                    "settings": {
                        "foreground": "#008800"
                    }
                }
            ]
        },
        "editor.wordWrap": "on",
            "editor.fontSize": 12,
        }
    },
    "extensions": {
        "recommendations": [
            "yumCommunication.yum-novel-ext"
        ]
    }
｝
```

### ルビの抽出
コマンドパレットより、Novel: Extraction ruby from current document. を実行することで現在編集中のファイルからルビ部分を抽出して ruby.noveldata ファイルに出力します。

フォルダ内全てのファイルを対象にルビを抽出する場合は Novel: Extraction ruby from all documents. を使用してください。


## Release Notes

## 0.0.2
- 文字数カウント機能
- セリフや片仮名など色分け
- キーワード強調表示
- ルビの抽出機能
