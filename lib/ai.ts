import { GoogleGenAI } from "@google/genai";
import type { NotionTask } from "./notion";

async function generate(apiKey: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    return res.text?.trim() ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 429はレート制限（60秒窓）なのでリトライせず専用エラーを投げる
    if (msg.includes("429")) throw new Error("RATE_LIMIT");
    throw e;
  }
}

const SECRETARY_PERSONA = `あなたは優秀なビジネス秘書AIです。
- 返答は簡潔・的確に日本語で
- Slack向けに *太字* と絵文字を適度に使う
- タスク管理・スケジュール・ビジネスアドバイスが得意
- 長くなりすぎない（最大300文字程度）`;

function buildTaskContext(tasks: NotionTask[]): string {
  if (tasks.length === 0) return "";
  const today = new Date().toISOString().slice(0, 10);
  return "\n\n【現在の未完了タスク】\n" + tasks.slice(0, 15).map((t) => {
    const due = t.due_date
      ? t.due_date < today ? `期限切れ:${t.due_date}` : `期限:${t.due_date}`
      : "";
    return `- ${t.title} [${t.priority}/${t.status}${due ? "/" + due : ""}]`;
  }).join("\n");
}

export async function aiChat(question: string, tasks: NotionTask[] = []): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "⚠️ GEMINI_API_KEY が未設定です";

  const prompt = `${SECRETARY_PERSONA}${buildTaskContext(tasks)}\n\nユーザー: ${question}\n\n秘書:`;
  try {
    return (await generate(apiKey, prompt)) || "回答を生成できませんでした";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "RATE_LIMIT") return "⏱️ AIが混雑中です。1分ほど待ってから再送してください。";
    console.error("[ai] chat error:", msg);
    return "⚠️ AI応答中にエラーが発生しました。";
  }
}

export async function aiPlanToday(tasks: NotionTask[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "⚠️ GEMINI_API_KEY が未設定です";

  const today = new Date().toISOString().slice(0, 10);
  if (tasks.length === 0) return "📋 未完了タスクはありません。今日も新しいことに挑戦しましょう！";

  const list = tasks.slice(0, 20).map((t) => {
    const due = t.due_date ? ` / 期限:${t.due_date}` : "";
    const imp = t.importance ? `/重要度:${t.importance}` : "";
    return `「${t.title}」優先度:${t.priority}${imp}/${t.status}${due}`;
  }).join("\n");

  const prompt = `${SECRETARY_PERSONA}

今日の日付: ${today}

以下のタスクを分析して今日の行動計画を作成してください。

【タスク】
${list}

ルール:
1. 期限切れ・今日が期限のものを⚠️マークで最優先
2. 高優先度を🔴で次に
3. 今日やるべき3〜5件を具体的に選んで一言添える
4. 残りは「今週中」「後回し」でグループ化
Slack用の見やすいフォーマットで。`;

  try {
    return (await generate(apiKey, prompt)) || "計画を生成できませんでした";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "RATE_LIMIT") return "⏱️ AIが混雑中です。1分ほど待ってから再送してください。";
    console.error("[ai] plan error:", msg);
    return "⚠️ 計画生成中にエラーが発生しました";
  }
}

export async function aiMorningSummary(tasks: NotionTask[], events: { summary: string; start: string }[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const today = new Date().toISOString().slice(0, 10);
  const taskList = tasks.slice(0, 10).map((t) => {
    const due = t.due_date ? `期限:${t.due_date}` : "";
    return `- ${t.title} [${t.priority}/${t.status}${due ? "/" + due : ""}]`;
  }).join("\n") || "なし";

  const eventList = events.slice(0, 5).map((e) => {
    const time = e.start.includes("T")
      ? new Date(e.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })
      : "終日";
    return `- ${time} ${e.summary}`;
  }).join("\n") || "なし";

  const prompt = `${SECRETARY_PERSONA}

今日は${today}です。朝のブリーフィングメッセージを作成してください。

【未完了タスク】
${taskList}

【今日の予定】
${eventList}

以下を含めて:
1. 今日の一言（励ましや注意点）
2. 最優先タスク3件
3. 予定があればタスクとの関連ヒント
Slack向けに絵文字込みで300文字以内に。`;

  try {
    return await generate(apiKey, prompt);
  } catch {
    return "";
  }
}
