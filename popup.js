const ALLOWED_KEYS = [
  "expression",
  "meaning_ja",
  "ex_en",
  "ex_ja",
  "pos",
  "note",
  "level",
  "source",
  "url",
];

const LLM_PROMPT = `
あなたは日本人英語学習者向けの語彙コーチです。
上記の会話でユーザーが質問した内容に関する英語の表現と語彙の全てについて，

以下の 9 キーだけを持つ JSON オブジェクトの配列 を返してください。

- expression
- meaning_ja
- ex_en
- ex_ja
- pos
- note
- level
- source
- url

厳守ルール：
- 配列内の各オブジェクトは上記 9 個のキーをすべて必ず含めてください。欠けているキーがあってはいけません。
- この 9 個以外のキーを追加してはいけません。
- 各値はすべて文字列にしてください。配列・オブジェクト・null は使わないでください。
- 情報が分からない項目は空文字列 "" にしてください。

各フィールドの意味：
- expression: 覚えたい英語表現そのもの（不要な前後は削る）
- meaning_ja: 日本語訳。1〜2文で簡潔に。
- ex_en: expression を含む自然な英語例文を 1 文。
- ex_ja: ex_en の自然な日本語訳。
- pos: 品詞（verb, phrasal verb, noun, idiom など）。分からなければ ""。
- note: ニュアンス・文法メモ・フォーマル度など、学習に役立つ補足。
- level: 難易度の目安。CEFR (A2, B1, B2, C1 など) か、「初級」「中級」などでもよい。
- source: その表現を見かけた元ネタ（YouTube 動画名など）。分からなければ ""。
- url: 元ネタの URL。分からなければ ""。

これから、入力として JSON 配列を 1 つ渡します。
その JSON は次のような形です。

[
  {"expression": "ここに英語表現", "context": "ここに前後の英文文脈", "source": "ここに元ネタの簡単な説明（任意）", "url": "ここに元ネタの URL（任意）"},
  {"expression": "ここに英語表現", "context": "ここに前後の英文文脈", "source": "ここに元ネタの簡単な説明（任意）", "url": "ここに元ネタの URL（任意）"}
]

上記の入力 JSON 配列を読み取り、指定した 9 キーだけを持つ別の JSON 配列を出力してください。
`.trim();

const REQUIRED_KEYS = ALLOWED_KEYS;

const inputEl = document.getElementById("input");
const statusEl = document.getElementById("status");
const copyPromptBtn = document.getElementById("copyPromptBtn");
const sendBtn = document.getElementById("sendBtn");

inputEl.addEventListener("paste", (e) => {
  // ペースト完了後の値を読むため、イベントループを一周待つ
  setTimeout(() => {
    if (inputEl.value.trim()) {
      setSuccess("貼り付けました。送信ボタンを押してください。");
    }
  }, 0);
});

copyPromptBtn.addEventListener("click", async () => {
  await copyPromptToClipboard();
});

sendBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (!text) {
    return setError("送信する JSON が空です。");
  }
  handleText(text);
});

async function copyPromptToClipboard() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(LLM_PROMPT);
      setSuccess("LLM 用プロンプトをコピーしました。");
      return;
    }
  } catch (e) {
    console.error(e);
  }

  const ta = document.createElement("textarea");
  ta.value = LLM_PROMPT;
  document.body.appendChild(ta);
  ta.select();

  try {
    const ok = document.execCommand("copy");
    if (ok) {
      setSuccess("LLM 用プロンプトをコピーしました。");
    } else {
      setError("コピーに失敗しました。");
    }
      console.log(ok);
  } catch (e) {
    console.error(e);
    setError("コピー中にエラーが発生しました。");
  } finally {
    document.body.removeChild(ta);
  }
}

async function handleText(text) {
  statusEl.textContent = "";

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return setError("JSON として解析できません。");
  }

  const items = normalizeItems(parsed);
  if (!items) {
    return setError("ルートは JSON 配列（または単一オブジェクト）である必要があります。");
  }
  if (items.length === 0) {
    return setError("空の配列は送信できません。");
  }

  const err = validateSchema(items);
  if (err) {
    return setError(err);
  }

  try {
    await sendToAnki(items);
    setSuccess("Anki に追加しました。");
    // 成功したらテキストをクリア
    inputEl.value = "";
  } catch (e) {
    console.error(e);
    setError("AnkiConnect への送信に失敗しました。Anki が起動しているか確認してください。");
  }
}

function normalizeItems(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "object" && input !== null) {
    return [input];
  }
  return null;
}

function validateSchema(items) {
  for (let i = 0; i < items.length; i += 1) {
    const obj = items[i];
    const prefix = items.length > 1 ? `#${i + 1} ` : "";

    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return `${prefix}各要素は JSON オブジェクトである必要があります。`;
    }

    const keys = Object.keys(obj);

    // 余分なキーチェック
    const extraKeys = keys.filter((k) => !ALLOWED_KEYS.includes(k));
    if (extraKeys.length > 0) {
      return `${prefix}定義されていないキーがあります: ${extraKeys.join(", ")}`;
    }

    // 欠けているキーチェック
    const missing = REQUIRED_KEYS.filter((k) => !keys.includes(k));
    if (missing.length > 0) {
      return `${prefix}必須キーが欠けています: ${missing.join(", ")}`;
    }

    // 型と必須値のチェック
    for (const k of ALLOWED_KEYS) {
      if (typeof obj[k] !== "string") {
        return `${prefix}キー "${k}" の値は文字列である必要があります。`;
      }
    }

    const mustNotBeEmpty = ["expression", "meaning_ja", "ex_en", "ex_ja"];
    const empties = mustNotBeEmpty.filter((k) => obj[k].trim() === "");
    if (empties.length > 0) {
      return `${prefix}必須フィールドが空です: ${empties.join(", ")}`;
    }
  }

  return null;
}

function buildAnkiPayload(v) {
  const front = v.expression;

  const lines = [];
  lines.push(v.meaning_ja);
  lines.push("");
  lines.push(v.ex_en);
  lines.push(v.ex_ja);
  if (v.note.trim()) {
    lines.push("");
    lines.push("Note: " + v.note.trim());
  }
  if (v.level.trim()) {
    lines.push("Level: " + v.level.trim());
  }
  if (v.source.trim() || v.url.trim()) {
    lines.push("");
    if (v.source.trim()) lines.push("Source: " + v.source.trim());
    if (v.url.trim()) lines.push(v.url.trim());
  }

  const back = lines.join("<br>");

  return {
    action: "addNote",
    version: 6,
    params: {
      note: {
        deckName: "English:LLM",
        modelName: "Basic",
        fields: {
          Front: front,
          Back: back,
        },
        tags: ["llm", "auto"],
      },
    },
  };
}

function buildAnkiPayloads(items) {
  const notes = items.map((v) => buildAnkiPayload(v).params.note);
  return {
    action: "addNotes",
    version: 6,
    params: { notes },
  };
}

async function sendToAnki(items) {
  const payload = items.length === 1
    ? buildAnkiPayload(items[0])
    : buildAnkiPayloads(items);
  const res = await fetch("http://127.0.0.1:8765", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
}

function setError(msg) {
  statusEl.textContent = msg;
  statusEl.style.color = "red";
}

function setSuccess(msg) {
  statusEl.textContent = msg;
  statusEl.style.color = "green";
}

