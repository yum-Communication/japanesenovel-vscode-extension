# 小説書き向けVSCode拡張機能

VSCodeで小説を書く手伝いをするエクステンションです。

各部分で色分けをしたり、ホバー表示や形式変更など、あると小説の執筆がちょっとだけ便利になるでしょう。

![hover](https://github.com/yum-Communication/japanesenovel-vscode-extension/raw/main/images/hover.gif)

## ルビの抽出
コマンドパレットより、`Novel: ルビの抽出（現在のファイル）`を実行することで現在編集中のファイルからルビ設定されている部分を抽出して新規ファイルに出力します。

フォルダ内全ての原稿ファイルを対象にルビを抽出する場合は`Novel: ルビの抽出（全てのファイル）`を使用してください。ruby.noveldata に出力されます。

※ 対象となるファイルは *.txt, *.nvl のみです。

## 形式の変換
テキストエディタの右クリックメニューより`『カクヨム』向けに出力`あるいは`『小説家になろう』向けに出力`を実行することで段落のインデント、疑問符・感嘆符の後のスペース、台詞の末尾の句点の一括挿入、削除ができる。二つの違いは、傍点の形式だけです。

*※ 変換後の文書は新規ファイルに出力されます。*

## 縦書きプレビュー
コマンドパレットより、`Novel: 縦書きプレビュー`を実行することで、執筆した原稿を縦書きでプレビューできます。プレビューでは傍点やルビが表示されるだけではなく、自動的に段落の字下げが行われ、感嘆符や疑問符の後ろの空白挿入などの整形されたテキストが表示されます。

執筆に使用している横書きの画面と違うレイアウトで見ることで、原稿チェックの精度は向上することでしょう。


## ハイライト
フォルダまたはワークスペースのsettingsに設定することで、各部分に色がつきます。

※対象は .txt および .nvl 

設定できる項目は以下の通りです。

|scope|説明|
|---|---|
|novel.numerals|数詞（漢数字、算用数字ともに同色）ただし、一桁の漢数字は認識しません。<br>例）5、三百、二〇二一|
|novel.text.dialogue|台詞<br>先頭が鉤括弧で開始し、末尾が鉤括弧で終了している行です。<br>例）「すべて理解しました！」|
|novel.text.ruby|ルビ（本体、ルビともに同色）、カクヨム式傍点<br>ルビの形式：<br>｜ルビを振る文字《ルビとなる文字》<br>カクヨム式傍点の形式：<br>《《傍点を振る文字》》|
|novel.text.katakana|カタカナ|
|novel.text.kanji|全ての漢字|
|novel.text.kanji.common|常用漢字|
|novel.text.punctuation|句読点<br>疑問符や感嘆符も含みます。|
|novel.keyword.region|地理|
|novel.keyword.character&#46;name|名前|
|novel.keyword.character.surname|姓|
|novel.keyword.character.family|家名|
|novel.keyword.character.title|役位名|
|novel.keyword.character.baptism|洗礼名|
|novel.keyword.character.nickname|ニックネーム|
|novel.keyword.family|家系|
|novel.keyword.magic|魔法|
|novel.keyword.monster|魔物・怪物|
|novel.keyword.animal|動物|
|novel.keyword.plant|植物|
|novel.keyword.crop|作物|
|novel.keyword.food|食品・料理|

※ novel.keyword... は固有名詞設定した語の色指定用です。

設定例）フォルダ設定の場合 `.vscode/settings.json`

以下では、台詞をピンク、常用漢字を白、非常用漢字を下線付きの黄色、キーワードをオレンジ色にしている。

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
        "scope":"novel.text.kanji",
        "settings": {
          "foreground": "#ffffaa",
          "fontStyle": "underline"
        }
      },
      {
        "scope":"novel.text.kanji.common",
        "settings": {
          "foreground": "#ffffff",
          "fontStyle": ""
        }
      },
      {
        "scope":"novel.keyword",
        "settings": {
          "foreground": "#cc8800"
        }
      }
    ]
  }
}
```

設定例）ワークスペースの場合 `novel-title.code-workspace`

以下では、数字を青に、人名を緑にしている。

```
{
  "folders": [
  ],
  "settings": {
    "editor.tokenColorCustomizations": {
      "textMateRules": [
        {
          "scope":"novel.numerals",
          "settings": {
            "foreground": "#0000ff"
          }
        },
        {
          "scope":"novel.keyword.character",
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

## 固有名詞設定
uniquenouns.json にて指定。VSCodeで開くフォルダ、もしくはワークスペースのルート（code-workspaceファイルと同じ階層）に配置してください。

※ 設定によりファイル名は変更可能

### 設定
`settings`内に、キーワードの設定を記述することができます
* `nameOrder`: 人物のフルネーム表記の際の名前の順序です。
* `nameSeparator`: 人物のフルネーム表記する際に姓や名の間に入れる文字を指定します。

例）  
以下の設定の場合、`name = "ティアリッテ", title = "シュレイ", family = "エーギノミーア"`の場合に`ティアリッテ・シュレイ・エーギノミーア`となる。
```
{
  "settings": {
    "nameOrder": ["name", "title", "family"],
    "nameSeparator": "・"
  }
}
```

例）   
以下の設定の場合、`name = "太郎", family = "山田"`の場合に`山田太郎`となる。
```
{
  "settings": {
    "nameOrder": ["family", "name"],
    "nameSeparator": ""
  }
}
```


### 地域
`regions`内に地域の設定を記述します。地域は階層構造を持つことができます。   
`class`, `description`の内容はバルーン表示に使用します。
* `name`: 地域名(必須）
* `type`: 地域の階層の種類（未対応）
* `class`: 階層の中での種類
* `description`: 説明
* `child`: その地域の中の一つ下の階層

※ `description`内での改行に`\n`を使用することができます。また、マークダウン記法を使用することができます。

例）

```
{
  "regions": [
    {
      "name": "バランキル",
      "type": "国",
      "class": "王国",
      "description": "物語の舞台となる国。大陸の東方に位置する",
      "child": [
        {
          "name": "ブェレンザッハ",
          "type": "領地",
          "class": "公爵領",
          "description": "主人公の嫁ぎ先の地。国の西の端に位置する",
          "child": [
            {
              "name": "グィニハシ",
              "type": "町",
              "description": "隣国からの侵攻にて滅亡してしまった"
            }, {
              "name": "アーウィゼ",
              "type": "町",
              "description": "グィニハシが亡びたため、隣国に対しての防衛の要はこの町に移っている"
            }
        }, {
          "name": "エーギノミーア",
          "type": "領地",
          "description": "主人公の出身地。国の東海岸に位置する"
        }
      ]
    }
  ]
}
```
### 人物
`characters` 内に人物を一覧で設定できます。

descriptionの内容はバルーン表示されます。
* `name`:地域名（必須）
* `title`: 役位名
* `surname`: 姓
* `family`: 家名（複数指定可能）
* `domain`: 領地名（複数指定可能）
* `clan`: 一族名
* `baptism`: 洗礼名
* `nickname`: ニックネーム
* `description`: 説明

ルビや敬称等も設定できるようにしたい。

例）
```
{
  "characters": [
    {
      "name": "ミズルアーヴァ",
      "title": "ターナー",
      "family": "バランキル"
      "firstperson": "余",
      "secondperson": "｜貴方《きほう》",
      "description": "国王"
    }, {
      "name": "ティアリッテ",
      "title": "シュレイ",
      "family": ["エーギノミーア", "ブェレンザッハ"],
      "nickname": "ティア",
      "age": "1年目時に8歳",
      "firstperson": "私",
      "secondperson": "｜貴方《あなた》",
      "description": "主人公"
    }, {
      "name": "ザクスネロ",
      "family": "モレミア"
    }
  ]
}
```

### 家系
`families` 内に家系を一覧で設定できます。

`description`の内容はバルーン表示されます。
* `name`: 地域名（必須）
* `peerage`: 役位・地位
* `faction`: 派閥
* `description`: 説明
```
{
  "families": [
    {
      "name": "デォフナハ",
      "peerage": "男爵",
      "faction": "ターナー",
      "description": "公爵に匹敵する影響力を持つ東の貴族。"
    },
    {
      "name": "ブェレンザッハ",
      "peerage": "公爵",
      "faction": "トゥジェ",
      "description": "第一の公爵家で西方貴族。"
    }
  ]
}
```
### その他
* `magic`: 魔法
* `monster`: 魔物・怪物
* `animal`: 動物
* `plant`: 植物
* `crops`: 作物
* `foods`: 食べ物・料理

これらは全て、以下の二つのみ設定できます。
* `name`: 名称（必須）
* `description`: 説明

名前はルビの指定が可能ですが、現在は対応していません。（baseのみ拾われる）
* `base`: 基本となる名前
* `ruby`: ルビを指定
* `body`: ルビを振られる語を指定

※ **rubyとbodyは両方指定することはできません**

例）
```
{
  "monsters": [
    {
      "name": {
        "base": "雪の魔獣",
        "ruby": "セレギュム"
      },
      "description": "白い鱗に覆われた狼。体長2〜3ｍ\n\n氷の魔獣（エレギュム）とは別。"
    }, {
      "name": {
        "base": "氷の海魔",
        "ruby": "グェドゥム"
      },
      "description": "見た目はほぼトド。体長3ｍ前後"
    }
  ],
  "animals": [
    { "name": "金羊", "description": "体長1〜1.5ｍ" },
    { "name": "黄豹", "description": "体長7～10ｍ" }
  ],
  "crops": [
    { "name": "大菜", "description": "巨大なホウレンソウ" },
    { "name": "甘瓜", "description": "黄色いトマト" },
    { "name": "夏紫菜", "description": "ムラサキキャベツ" }
  ]
}
```
