# Send JSON to Anki

LLM が返した JSON を Chrome 拡張から Anki に送り、英語学習カードを追加するための拡張です。

この構成では、Anki 側に **1つの Note Type** を作り、その中で **2つのカードタイプ** を使います。

- `EJ`: 英語 → 日本語
- `JE`: 日本語 → 英語

各ノートごとに

- `Make_EJ = "1"` のとき `EJ` カードを生成
- `Make_JE = "1"` のとき `JE` カードを生成

という運用をします。

---

## 1. 前提条件

- Google Chrome / Chromium 系ブラウザ
- Anki（デスクトップ版）
- AnkiConnect

この拡張は AnkiConnect のローカル API `http://127.0.0.1:8765` に POST してノートを追加します。

---

## 2. AnkiConnect のインストール

1. Anki を起動
2. **Tools → Add-ons**
3. **Get Add-ons… / Browse & Install…**
4. コード欄に `2055492159` を入力
5. Anki を再起動

---

## 3. Anki 側の準備

### 3-1. デッキを作る

デッキ名は次にしてください。

- `English:LLM`

### 3-2. Note Type を作る

1. **Tools → Manage Note Types**
2. **Add**
3. ベースに **Basic**
4. 名前を **`English LLM`** にする

### 3-3. フィールドを追加する

**Fields...** で次を作成します。

- `ExpressionEn`
- `MeaningJa`
- `PromptJa`
- `AnswerEnMain`
- `AnswerEnAlt`
- `ExampleEn`
- `ExampleJa`
- `Etymology`
- `Note`
- `Level`
- `Source`
- `Url`
- `Make_EJ`
- `Make_JE`

### 3-4. カードタイプを 2 つ作る

- `EJ`
- `JE`

---

## 4. カードテンプレート

### EJ Front

```html
{{#Make_EJ}}
<div class="expr-en en">{{ExpressionEn}}</div>
{{/Make_EJ}}