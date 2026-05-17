import OpenAI from "openai";
import type { NotionTask } from "./notion";

async function generate(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が未設定です");
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
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
  const prompt = `${SECRETARY_PERSONA}${buildTaskContext(tasks)}\n\nユーザー: ${question}\n\n秘書:`;
  try {
    return (await generate(prompt)) || "回答を生成できませんでした";
  } catch (e) {
    console.error("[ai] chat error:", e instanceof Error ? e.message : e);
    return "⚠️ AI応答中にエラーが発生しました。";
  }
}

export async function aiPlanToday(tasks: NotionTask[]): Promise<string> {

  const today = new Date().toISOString().slice(0, 10);
  if (tasks.length === 0) return "📋 未完了タスクはありません。今日も新しいことに挑戦しましょう！";

  const list = tasks.slice(0, 20).map((t) => {
    const due = t.due_date ? ` / 期限:${t.due_date}` : "";
    const risk = t.risk && t.risk !== "通常" ? `/リスク:${t.risk}` : "";
    return `「${t.title}」優先度:${t.priority}${risk}/${t.status}${due}`;
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
    return (await generate(prompt)) || "計画を生成できませんでした";
  } catch (e) {
    console.error("[ai] plan error:", e instanceof Error ? e.message : e);
    return "⚠️ 計画生成中にエラーが発生しました";
  }
}

export async function aiMorningSummary(tasks: NotionTask[], events: { summary: string; start: string }[]): Promise<string> {

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
    return await generate(prompt);
  } catch {
    return "";
  }
}
