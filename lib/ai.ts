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

export async function aiAnalyzeImage(question: string, imageDataUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "⚠️ OPENAI_API_KEYが未設定です。";
  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: question || "この画像について教えてください。" },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      }],
      max_tokens: 1000,
    });
    return res.choices[0]?.message?.content?.trim() ?? "画像を解析できませんでした。";
  } catch (e) {
    console.error("[ai] image error:", e instanceof Error ? e.message : e);
    return "⚠️ 画像分析中にエラーが発生しました。";
  }
}

export async function aiSelectMorningTasks(
  tasks: NotionTask[]
): Promise<{ top3: NotionTask[]; next3: NotionTask[] }> {
  if (tasks.length === 0) return { top3: [], next3: [] };

  const today = new Date().toISOString().slice(0, 10);
  const list = tasks.map((t, i) => {
    const due = t.due_date ? ` 期限:${t.due_date}` : "";
    const overdue = t.due_date && t.due_date < today ? "【期限切れ】" : "";
    return `${i}: ${overdue}${t.title} [状態:${t.status} 優先度:${t.priority}${due}]`;
  }).join("\n");

  const prompt = `今日は${today}です。以下のタスクリストから優先度・緊急度を判断して、インデックス番号で回答してください。

タスク:
${list}

以下のJSON形式で回答（理由は不要）:
{"top3":[0,1,2],"next3":[3,4,5]}

条件:
- top3: 今日絶対にやるべき最重要3件（期限切れ・今日期限・今日やるステータスを優先）
- next3: 追加でやると良い3件
- インデックスは重複なし、タスク数が足りなければ少なくて良い
JSONのみ返してください。`;

  try {
    const raw = await generate(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    const parsed = JSON.parse(match[0]) as { top3?: number[]; next3?: number[] };
    const top3 = (parsed.top3 ?? []).map((i) => tasks[i]).filter(Boolean);
    const next3 = (parsed.next3 ?? []).map((i) => tasks[i]).filter(Boolean);
    return { top3, next3 };
  } catch {
    const sorted = [...tasks].sort((a, b) => {
      const aToday = a.status === "今日やる" ? 0 : 1;
      const bToday = b.status === "今日やる" ? 0 : 1;
      return aToday - bToday;
    });
    return { top3: sorted.slice(0, 3), next3: sorted.slice(3, 6) };
  }
}

import type { GmailMessage } from "./gmail";

export async function aiFilterReplyEmails(emails: GmailMessage[]): Promise<GmailMessage[]> {
  if (emails.length === 0) return [];

  const list = emails.map((m, i) => `${i}: From: ${m.from} / Subject: ${m.subject} / Preview: ${m.snippet}`).join("\n");

  const prompt = `以下のメールのうち、実在する個人から届いた返信が必要なメールのインデックス番号を選んでください。

メール:
${list}

判断基準:
- 選ぶ: 個人名（名前）から届いたメール、取引先や知人からのメール、明らかに返信を期待している内容
- 選ばない: ニュースレター、自動通知、サービス系メール、no-reply系、確認メール、広告

JSONのみ返してください: {"indices":[0,1,2]}`;

  try {
    const raw = await generate(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { indices?: number[] };
    return (parsed.indices ?? []).map((i) => emails[i]).filter(Boolean);
  } catch {
    return [];
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
