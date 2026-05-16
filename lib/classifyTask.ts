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
  project: TaskProject;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  urgency: string;
  impact: string;
  due_date: string | null; // YYYY-MM-DD
};

const PROJECTS: TaskProject[] = [
  "KANON法人", "ホークリーク", "津幡町SNS", "映像案件",
  "アプリ開発", "家族", "投資", "その他",
];

function buildPrompt(title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `あなたはタスク管理アシスタントです。
以下のメッセージを分析し、JSON のみを返してください（説明文不要）。
今日の日付: ${today}

プロジェクト候補（必ずいずれかを選ぶ）:
- KANON法人: 売上・請求・契約・営業・税務・支払い・法人関連
- ホークリーク: ホークリーク関連
- 津幡町SNS: SNS・投稿・地域情報
- 映像案件: 動画・編集・撮影・構成・ポッドキャスト・音声・YouTube・ハナ・三和・能登・ana・パブリックラウンジ
- アプリ開発: アプリ・開発・プログラム・システム
- 家族: 家族・妻・子供・保育園・明日の用意・個人の準備
- 投資: 株・投資・調査・比較・資産
- その他: 上記に当てはまらない場合

ステータス候補: inbox(未分類), today(今日中), week(今週中), later(いつか), research(調査), done(完了)
優先度候補: 高, 中, 低
重要度候補: 高（戦略的・長期的に大切）, 中, 低

期限日: 「明日」「今週金曜」「5/20まで」「来週月曜」などが含まれていれば今日の日付を基準に YYYY-MM-DD 形式で返す。期限の記載がなければ null を返す。

返却フォーマット（JSONのみ）:
{"project":"...","status":"...","priority":"高|中|低","importance":"高|中|低","urgency":"high|medium|low","impact":"high|medium|low","due_date":"YYYY-MM-DD or null"}

タスク: ${title}`;
}

function fallback(): Classification {
  return { project: "その他", status: "inbox", priority: "中", importance: "中", urgency: "medium", impact: "medium", due_date: null };
}

function parseJson(text: string): Classification | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!PROJECTS.includes(obj.project)) return null;
    if (obj.due_date === "null" || obj.due_date === "") obj.due_date = null;
    return obj as Classification;
  } catch {
    return null;
  }
}

export async function classifyTask(title: string): Promise<Classification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: buildPrompt(title),
    });
    const text = response.text ?? "";
    return parseJson(text) ?? fallback();
  } catch {
    return fallback();
  }
}
