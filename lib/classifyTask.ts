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
export type TaskPriority = "high" | "medium" | "low";

export type Classification = {
  project: TaskProject;
  status: TaskStatus;
  priority: TaskPriority;
  urgency: string;
  impact: string;
};

const PROJECTS: TaskProject[] = [
  "KANON法人", "ホークリーク", "津幡町SNS", "映像案件",
  "アプリ開発", "家族", "投資", "その他",
];

const PROMPT = `あなたはタスク管理アシスタントです。
以下のメッセージを分析し、JSON のみを返してください（説明文不要）。

プロジェクト候補: ${PROJECTS.join(", ")}
ステータス候補: inbox(未分類), today(今日中), week(今週中), later(いつか), research(調査), done(完了)
優先度候補: high, medium, low

返却フォーマット:
{"project":"...","status":"...","priority":"...","urgency":"high|medium|low","impact":"high|medium|low|family|future_asset"}

メッセージ: `;

function fallback(): Classification {
  return { project: "その他", status: "inbox", priority: "medium", urgency: "medium", impact: "medium" };
}

function parseJson(text: string): Classification | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!PROJECTS.includes(obj.project)) return null;
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
      contents: PROMPT + title,
    });
    const text = response.text ?? "";
    return parseJson(text) ?? fallback();
  } catch {
    return fallback();
  }
}
