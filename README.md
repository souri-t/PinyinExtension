# 🀄 中国語拼音・翻訳ツール

Webページ上の中国語テキストに、声調記号付きの拼音（ピンイン）の付与と、段落ごとの日本語/英語翻訳表示を行うChrome拡張機能です。


![イメージ](https://private-user-images.githubusercontent.com/14244767/556443404-b6624ce6-fdee-49e8-9d36-ef10d7b7f52e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzIzMDUxMjksIm5iZiI6MTc3MjMwNDgyOSwicGF0aCI6Ii8xNDI0NDc2Ny81NTY0NDM0MDQtYjY2MjRjZTYtZmRlZS00OWU4LTlkMzYtZWYxMGQ3YjdmNTJlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjAyMjglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwMjI4VDE4NTM0OVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTAyMDIwOTlhNTFlZDlhNjRiYjhjZjkzZGU1YmY3MzFhZjQ5OGU5MDdhYzE1ZWNjOTU3NmM3MzhlMjI4NTUzN2EmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.JwI7_QgSBP8OJ0KRwP4VsbOpJBJ3rjOO3S1in_5I1q4)



---

## 機能

- 🔤 **拼音の自動付与** — ページ内の中国語（漢字）の真上に声調記号付き拼音を表示
- 🌐 **段落ごとの翻訳** — 中国語の各段落の直下に翻訳結果を表示（日本語 / 英語を選択可能）
- 📴 **オフライン動作** — 拼音変換はローカルライブラリで完結（外部通信なし）

---

## インストール方法

### 1. リポジトリをクローン（またはダウンロード）

```bash
git clone <このリポジトリのURL>
```

### 2. Chrome に拡張機能を読み込む

1. Chrome で `chrome://extensions` を開く
2. 右上の **「デベロッパーモード」** をONにする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. `PinyinExtension/` フォルダを選択する

### 3. 完了 🎉

ツールバーに 🀄 アイコンが表示されれば準備完了です。

---

## 使い方

1. 中国語が表示されているWebページを開く
2. ツールバーの **🀄 アイコン** をクリック
3. ポップアップで機能を設定する：

| トグル | 説明 |
|---|---|
| **拼音を表示** | ONにするとすべての中国語文字の上に拼音が表示される |
| **翻訳を表示** | ONにすると中国語の段落直下に翻訳ブロックが表示される |
| **翻訳先言語** | 🇯🇵 日本語 または 🇺🇸 English を選択 |



<img src="https://private-user-images.githubusercontent.com/14244767/556443392-c49d426c-fb1e-4f1f-907a-2498a8e4d6e3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzIzMDQ3OTgsIm5iZiI6MTc3MjMwNDQ5OCwicGF0aCI6Ii8xNDI0NDc2Ny81NTY0NDMzOTItYzQ5ZDQyNmMtZmIxZS00ZjFmLTkwN2EtMjQ5OGE4ZTRkNmUzLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjAyMjglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwMjI4VDE4NDgxOFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI3NmRjYzM1NDFmMTdiZWY2YzQyYmNkMjViZGY5NTFkMmMzYzE1MmE4NGM2ZjhmZTBiNmI1YjdhMzJiYTlhNzAmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.mkengmoC_BaTD_uSi6sSxqoWrAkz-OfOMCKTrHbDAGs" width= "300px" >


---

## 表示の仕組み

### 拼音

HTML の `<ruby>` タグを使って各文字の上に拼音を配置します。

```html
<!-- 変換前 -->
你好世界

<!-- 変換後 -->
<ruby>你<rt>nǐ</rt></ruby>
<ruby>好<rt>hǎo</rt></ruby>
<ruby>世<rt>shì</rt></ruby>
<ruby>界<rt>jiè</rt></ruby>
```

### 翻訳

中国語を5文字以上含む段落（`<p>`, `<h1>`〜`<h6>`, `<li>`, `<td>` 等）の直後に翻訳ブロックを挿入します。

```html
<!-- 変換後イメージ -->
<p>今天天气很好。</p>
<div class="pinyin-translation">
  <span class="pinyin-translation-label">🇯🇵 日本語訳</span>
  今日はとても良い天気です。
</div>
```

---

## 翻訳API

**Google Translate 非公式API** を使用しています。

- APIキー **不要**・無料・即時利用可能
- インターネット接続が必要です（翻訳リクエスト時のみ）
- レート制限により翻訳が失敗する場合があります

---

## 使用ライブラリ

| ライブラリ | バージョン | 用途 |
|---|---|---|
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | v3.28.0 | 中国語→拼音変換（声調記号付き・オフライン） |

---

## ファイル構成

```
PinyinExtension/
├── manifest.json       # Chrome拡張機能の設定（Manifest V3）
├── background.js       # 状態管理 + 翻訳APIリクエスト
├── content.js          # 拼音付与・翻訳ブロック挿入/除去ロジック
├── popup.html          # ポップアップUI（拼音・翻訳トグル、言語選択）
├── popup.js            # ポップアップのロジック
├── style.css           # 拼音ルビ・翻訳ブロックのスタイル
└── lib/
    └── pinyin-pro.js   # 拼音変換ライブラリ（ローカルバンドル）
```

---

## 動作確認環境

- Google Chrome 120以上
- Manifest V3 対応

---

## ライセンス

MIT
