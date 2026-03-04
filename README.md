\# 使い方



\## 1. 前提条件



\* Google Chrome / Chromium 系ブラウザ（Edge などでも可）

\* Anki（デスクトップ版）

\* AnkiConnect（Anki のアドオン。後述）



この拡張は \*\*AnkiConnect のローカルAPI `http://127.0.0.1:8765`\*\* にPOSTしてカードを追加します。(\[GitHub]\[1])



---



\## 2. AnkiConnect のインストール



1\. \*\*Anki を起動\*\*

2\. メニューから \*\*Tools（ツール）→ Add-ons（アドオン）\*\* を開く

3\. \*\*Get Add-ons… / Browse \& Install…（アドオンを入手）\*\* を選択

4\. コード欄に \*\*`2055492159`\*\* を入力して OK

5\. 促されたら \*\*Anki を再起動\*\*（再起動しないと有効になりません）(\[GitHub]\[1])



\*\*確認（任意）\*\*



\* Tools → Add-ons の一覧に \*\*AnkiConnect\*\* が表示されていればOK

\* 既定では `127.0.0.1:8765` で待ち受けます（本拡張の送信先と一致）(\[GitHub]\[1])



---



\## 3. Anki 側の準備（デッキ/ノートタイプ）



この拡張は以下の設定で追加します（`popup.js` の `buildAnkiPayload` 参照）:



\* \*\*deckName:\*\* `English:LLM`

\* \*\*modelName:\*\* `Basic`

\* \*\*fields:\*\* `Front`, `Back`

\* \*\*tags:\*\* `llm`, `auto`



そのため、Anki で \*\*`English:LLM` デッキが無ければ作成\*\*しておいてください。



---



\## 4. 拡張機能のインストール（ローカル読み込み）



1\. Chrome で `chrome://extensions/` を開く

2\. 右上の \*\*「デベロッパーモード」\*\* を ON

3\. \*\*「パッケージ化されていない拡張機能を読み込む」\*\* をクリック

4\. このプロジェクトフォルダ（`manifest.json` があるフォルダ）を選択



---



\## 5. 基本の使い方



1\. \*\*Anki を起動したまま\*\*にする（AnkiConnect も有効な状態）

2\. ブラウザ右上の拡張アイコンから \*\*Send Json to Anki\*\* を開く

3\. 必要なら \*\*「LLM用プロンプトをコピー」\*\* を押して、LLM に渡すプロンプトをコピー

4\. LLM から返ってきた \*\*JSON（9キーのみのオブジェクト）\*\* をテキストエリアに貼り付け

5\. \*\*「送信」\*\* を押す



&nbsp;  \* 成功すると `Anki に追加しました。` と表示され、入力欄がクリアされます



---



\## 6. 入力JSONの仕様（必須）



貼り付ける JSON は \*\*以下9キーのみ\*\*・\*\*全キー必須\*\*・\*\*値はすべて文字列\*\*：



\* `expression`

\* `meaning\_ja`

\* `ex\_en`

\* `ex\_ja`

\* `pos`

\* `note`

\* `level`

\* `source`

\* `url`



さらに以下は \*\*空文字禁止\*\*：



\* `expression`, `meaning\_ja`, `ex\_en`, `ex\_ja`



---



\## 7. うまく動かないとき



\* \*\*「AnkiConnect への送信に失敗しました」\*\*



&nbsp; \* Anki が起動しているか

&nbsp; \* AnkiConnect がインストールされていて、Anki を再起動済みか(\[GitHub]\[1])

&nbsp; \* セキュリティソフト/プロキシ等で `127.0.0.1:8765` が遮断されていないか

\* \*\*デッキが見つからない/追加されない\*\*



&nbsp; \* `English:LLM` デッキを作っているか（または `deckName` を変更）

\* \*\*JSON エラー\*\*



&nbsp; \* 9キー以外が混ざっていないか

&nbsp; \* JSON の形式（カンマ/クォート/括弧）を確認



\[1]: https://github.com/amikey/anki-connect?utm\_source=chatgpt.com "AnkiConnect"



