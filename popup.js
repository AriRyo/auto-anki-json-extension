const DECK_NAME = "English:LLM";
const MODEL_NAME = "English LLM";
const ANKI_URL = "http://127.0.0.1:8765";

const KEYS = [
  "expression_en",
  "meaning_ja",
  "prompt_ja",
  "answer_en_main",
  "answer_en_alt",
  "ex_en",
  "ex_ja",
  "etymology",
  "note",
  "level",
  "source",
  "url",
  "make_ej",
  "make_je",
];

const LLM_PROMPT = `
あなたは日本人英語学習者向けの語彙コーチです。
Englishネイティブの人と不自由なく会話ややり取りができるようになりたいです．
上記の会話ででてきた学ぶべき/間違えた/英語で言い表せなかった英語の表現と語彙の全てについて，
以下の 14 個のキーだけを持つ JSON オブジェクトの配列を返してください。
expression_en, meaning_ja, prompt_ja, answer_en_main, answer_en_alt, ex_en, ex_ja, etymology, note, level, source, url, make_ej, make_je

ルール:
- 余計なキーは禁止
- 不明な値は ""
- 読めれば十分な語と実際に自分で使えるようにしたい語の選別をして，make_ej / make_je は "1" または ""，少なくともどちらか一方は "1"をつける
- ニュース的・書き言葉的・比喩的・固有名詞で、学習者が自分では言わなそうなものは 原則 make_ej="1", make_je=""
- 日常会話や仕事のやり取りでそのまま使いやすいものは 原則 make_ej="", make_je="1" または両方
- 本当に必要なものだけ両方 "1"
- make_ej="1" なら expression_en と meaning_ja 必須
- make_je="1" なら prompt_ja と answer_en_main 必須
- answer_en_alt は別表現を ";" 区切り
- 出力は JSON 配列のみ

各フィールドの意味：
- expression_en: 英語→日本語カードで表面に出す英語表現。EJ を作らない場合は "" でもよい。
- meaning_ja: その表現の自然な日本語の意味。1〜2文で簡潔に。
- prompt_ja: 日本語→英語カードで表面に出す日本語。単なる直訳ではなく、会話で言いたい意図が分かる自然な日本語にする。
- answer_en_main: 日本語→英語カードでの第一候補の英語表現。
- answer_en_alt: 日本語→英語カードで許容できる他の自然な英語表現。複数ある場合は 1 つの文字列の中でセミコロン ";" 区切りにする。なければ ""。
- ex_en: 自然な英語例文を 1 文。
- ex_ja: ex_en の自然な日本語訳。
- etymology: 語源・イメージ・由来の説明。EJ カードで有益な場合のみ入れ、不要なら ""。
- note: ニュアンス・文法・フォーマル度・使い分けなどの補足。
- level: CEFR（A2, B1, B2, C1 など）や「初級」「中級」など。
- source: 元ネタの簡単な説明。分からなければ ""。
- url: 元ネタの URL。分からなければ ""。
- make_ej: 英語→日本語カードを作るなら "1"、作らないなら ""。
- make_je: 日本語→英語カードを作るなら "1"、作らないなら ""。


入力 JSON の各要素は次のような形を想定します。

出力例：
[
  {
    "expression_en": "get the hang of",
    "meaning_ja": "コツをつかむ、慣れる",
    "prompt_ja": "だんだんコツがつかめてきた、と言いたい",
    "answer_en_main": "get the hang of it",
    "answer_en_alt": "get used to; get accustomed to",
    "ex_en": "It took me a while, but I finally got the hang of it.",
    "ex_ja": "時間はかかったけど、ようやくコツをつかんだ。",
    "etymology": "hang は「掛かり具合・感触」の意味。道具の持ち方の感覚が由来。",
    "note": "カジュアル。会話で非常によく使われる。",
    "level": "B1",
    "source": "",
    "url": "",
    "make_ej": "1",
    "make_je": "1"
  }
]

上記の入力を読み取り、指定した 14 キーだけを持つ JSON 配列を返してください。
`.trim();

const $input = document.getElementById("input");
const $status = document.getElementById("status");
const $copy = document.getElementById("copyPromptBtn");
const $send = document.getElementById("sendBtn");

$copy.addEventListener("click", copyPrompt);
$send.addEventListener("click", submitJson);
$input.addEventListener("paste", () => {
  setTimeout(() => {
    if ($input.value.trim()) ok("貼り付けました。");
  }, 0);
});

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(LLM_PROMPT);
    ok("プロンプトをコピーしました。");
  } catch {
    err("コピーに失敗しました。");
  }
}

async function submitJson() {
  const text = $input.value.trim();
  if (!text) return err("JSON が空です。");

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return err("JSON として解析できません。");
  }

  const items = Array.isArray(data) ? data : (data && typeof data === "object" ? [data] : null);
  if (!items) return err("ルートは配列かオブジェクトにしてください。");
  if (!items.length) return err("空の配列は送信できません。");

  const message = validate(items);
  if (message) return err(message);

  try {
    const result = await send(items);
    ok(`Anki に ${result} 件追加しました。`);
    $input.value = "";
  } catch (e) {
    err(`送信に失敗しました。${e.message || ""}`);
  }
}

function validate(items) {
  for (let i = 0; i < items.length; i++) {
    const x = items[i];
    const p = items.length > 1 ? `#${i + 1} ` : "";

    if (!x || typeof x !== "object" || Array.isArray(x)) {
      return `${p}各要素はオブジェクトにしてください。`;
    }

    const keys = Object.keys(x);
    const extra = keys.filter(k => !KEYS.includes(k));
    const missing = KEYS.filter(k => !keys.includes(k));

    if (extra.length) return `${p}未定義キー: ${extra.join(", ")}`;
    if (missing.length) return `${p}不足キー: ${missing.join(", ")}`;

    for (const k of KEYS) {
      if (typeof x[k] !== "string") return `${p}${k} は文字列にしてください。`;
    }

    const ej = x.make_ej.trim();
    const je = x.make_je.trim();

    if (!["", "1"].includes(ej)) return `${p}make_ej は "1" か "" にしてください。`;
    if (!["", "1"].includes(je)) return `${p}make_je は "1" か "" にしてください。`;
    if (ej !== "1" && je !== "1") return `${p}make_ej か make_je のどちらかは "1" にしてください。`;

    if (ej === "1" && (!x.expression_en.trim() || !x.meaning_ja.trim())) {
      return `${p}make_ej="1" のとき expression_en と meaning_ja は必須です。`;
    }
    if (je === "1" && (!x.prompt_ja.trim() || !x.answer_en_main.trim())) {
      return `${p}make_je="1" のとき prompt_ja と answer_en_main は必須です。`;
    }
  }
  return "";
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtml(s) {
  return escapeHtml(s.trim()).replace(/\r?\n/g, "<br>");
}

function altToHtml(s) {
  return s
    .split(";")
    .map(v => v.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
}

function firstField(v) {
  return v.expression_en.trim() || v.answer_en_main.trim() || v.prompt_ja.trim();
}

function noteOf(v) {
  return {
    deckName: DECK_NAME,
    modelName: MODEL_NAME,
    fields: {
      ExpressionEn: toHtml(firstField(v)),
      MeaningJa: toHtml(v.meaning_ja),
      PromptJa: toHtml(v.prompt_ja),
      AnswerEnMain: toHtml(v.answer_en_main),
      AnswerEnAlt: altToHtml(v.answer_en_alt),
      ExampleEn: toHtml(v.ex_en),
      ExampleJa: toHtml(v.ex_ja),
      Etymology: toHtml(v.etymology),
      Note: toHtml(v.note),
      Level: toHtml(v.level),
      Source: toHtml(v.source),
      Url: toHtml(v.url),
      Make_EJ: v.make_ej.trim(),
      Make_JE: v.make_je.trim(),
    },
    tags: buildTags(v),
  };
}

function buildTags(v) {
  const tags = ["llm"];
  if (v.make_ej.trim() === "1") tags.push("ej");
  if (v.make_je.trim() === "1") tags.push("je");
  return tags;
}

async function send(items) {
  const payload = {
    action: items.length === 1 ? "addNote" : "addNotes",
    version: 6,
    params: items.length === 1
      ? { note: noteOf(items[0]) }
      : { notes: items.map(noteOf) },
  };

  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.error) throw new Error(String(json.error));

  if (payload.action === "addNote") return 1;

  const results = Array.isArray(json.result) ? json.result : [];
  const failed = results.filter(v => v == null).length;
  if (failed) throw new Error(`${failed} 件失敗しました。`);
  return results.length;
}

function ok(msg) {
  $status.textContent = msg;
  $status.className = "ok";
}

function err(msg) {
  $status.textContent = msg;
  $status.className = "err";
}
