import { GoogleGenAI } from "@google/genai";

export type TaskProject =
  | "KANON法人"
  | "ホークリーク"
  | "津幡町SNS"
  | "映像案件"
  | "アプリ開発"
  | "家族"
  | "投資"
  | "その他";

export type TaskStatus = "inbox" | "today" | "week" | "later" | "research" | "done";
export type TaskPriority = "高" | "中" | "低";
export type TaskImportance = "高" | "中" | "低";

export type Classification = {
  intent: "task";
  project: TaskProject;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  urgency: string;
  impact: string;
  due_date: string | null; // YYYY-MM-DD
};

export type ClassifyResult = { intent: "question" } | Classification;

const PROJECTS: TaskProject[] = [
  "KANON法人", "ホークリーク", "津幡町SNS", "映像案件",
  "アプリ開発", "家族", "投資", "その他",
];

function buildPrompt(title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `あなたはタスク管理AIです。以下のメッセージを分析してJSONのみ返してください。
今日の日付: ${today}

【ステップ1: intent判定】
- "question": AIアシスタントへの質問・依頼・相談・指示
  例: 「タスクを整理して」「今日何すればいい？」「アドバイスして」「〇〇を教えて」「優先順位は？」「どう思う？」「〇〇してください」
- "task": ユーザー自身がやるべきToDo・作業
  例: 「請求書を送る」「会議の準備」「明日までにレポート提出」「〇〇を確認する」

questionの場合はこのJSONのみ:
{"intent":"question"}

taskの場合はこのJSONのみ:
{"intent":"task","project":"...","status":"...","priority":"高|中|低","importance":"高|中|低","urgency":"high|medium|low","impact":"high|medium|low","due_date":"YYYY-MM-DD or null"}

プロジェクト候補（必ずいずれかを選ぶ）:
- KANON法人: 売上・請求・契約・営業・税務・支払い・法人関連
- ホークリーク: ホークリーク関連
- 津幡町SNS: SNS・投稿・地域情報
- 映像案件: 動画・編集・撮影・構成・ポッドキャスト・音声・YouTube・ハナ・三和・能登・ana・パブリックラウンジ
- アプリ開発: アプリ・開発・プログラム・システム
- 家族: 家族・妻・子供・保育園・明日の用意・個人の準備
- 投資: 株・投資・調査・比較・資産
- その他: 上記に当てはまらない場合

ステータス: inbox/today/week/later/research/done
期限日: 自然言語→YYYY-MM-DD。なければ null。

メッセージ: ${title}`;
}

function fallback(): Classification {
  return { intent: "task", project: "その他", status: "inbox", priority: "中", importance: "中", urgency: "medium", impact: "medium", due_date: null };
}

function parseJson(text: string): ClassifyResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (obj.intent === "question") return { intent: "question" };
    if (!PROJECTS.includes(obj.project)) return null;
    if (obj.due_date === "null" || obj.due_date === "") obj.due_date = null;
    return { intent: "task", ...obj } as Classification;
  } catch {
    return null;
  }
}

export async function classifyTask(title: string): Promise<ClassifyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: buildPrompt(title),
    });
    const text = response.text ?? "";
    console.log("[classify] raw:", text.slice(0, 200));
    const result = parseJson(text);
    console.log("[classify] parsed:", JSON.stringify(result));
    return result ?? fallback();
  } catch (e) {
    console.error("[classify] error:", e instanceof Error ? e.message : e);
    return fallback();
  }
}
