import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { aiChat, aiPlanToday } from "../../../../lib/ai";
import { classifyTask } from "../../../../lib/classifyTask";
import {
  notionAddTask,
  notionCompleteTask,
  notionFindTask,
  notionQueryTasks,
  notionUpdateTask,
} from "../../../../lib/notion";
import { postSlackMessage } from "../../../../lib/slack";
import { supabaseInsertTask } from "../../../../lib/supabase";

const MAX_TITLE_LEN = 280;

function verifySlackSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) throw new Error("SLACK_SIGNING_SECRET が未設定です。");
  const ts = req.headers.get("x-slack-request-timestamp") || "0";
  const sig = req.headers.get("x-slack-signature") || "";
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${ts}:${rawBody}`).digest("hex")}`;
  const ab = Buffer.from(expected), bb = Buffer.from(sig);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function splitTasks(text: string): string[] {
  return text
    .split(/\n|・|•/)
    .map((l) => l.replace(/^[-・•\s]+/, "").trim())
    .filter((l) => l.length > 0)
    .map((l) => l.slice(0, MAX_TITLE_LEN));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Command patterns ─────────────────────────────────────────
const RE_COMPLETE   = /^完了\s+([\s\S]+)$/;
const RE_LIST       = /^(タスク)?一覧$/;
const RE_TODAY      = /^今日のタスク$/;
const RE_WEEK       = /^今週のタスク$/;
const RE_HIGH       = /^高優先度(タスク)?$/;
const RE_PLAN       = /^(今日の計画|今日何する|今日何をする|計画)$/;
const RE_PRIORITY   = /^優先度変更\s+(.+)\s+(高|中|低)$/;
const RE_PROJECT    = /^(.+)のタスク$/;
const RE_HELP       = /^(ヘルプ|help|使い方|コマンド)$/i;

// ── 質問 or タスク判定（Gemini不使用・文法パターン） ──────────
function isAssistantRequest(text: string): boolean {
  const t = text.replace(/[。！\s]+$/, "");
  return (
    /[？?]/.test(t) ||                                        // 疑問符
    /て(ください)?$/.test(t) ||                               // 〜して／してください
    /かな$/.test(t) ||                                        // 〜かな
    /でしょうか$/.test(t) ||                                  // 〜でしょうか
    /^(どう|何|なぜ|なに|どれ|いつ|誰|どこ)/.test(t) ||      // 疑問詞始まり
    /(アドバイス|提案|おすすめ|どう思|教えて|まとめて)/.test(t) // AI依頼語
  );
}

const PRIORITY_MAP: Record<string, string> = { 高: "高", 中: "中", 低: "低" };
const PROJECTS = ["KANON法人", "ホークリーク", "津幡町SNS", "映像案件", "アプリ開発", "家族", "投資", "その他"];

const HELP_TEXT = `*📖 使い方*
───────────────
*タスク追加*
→ そのままタスク内容を送る（期限・優先度も自然な文章でOK）
例: \`明日までに請求書送る\`

*タスク確認*
• \`タスク一覧\` — 全未完了タスク
• \`今日のタスク\` — 今日が期限のタスク
• \`今週のタスク\` — 今週が期限のタスク
• \`高優先度\` — 高優先度タスク
• \`[プロジェクト名]のタスク\` — プロジェクト別
例: \`KANON法人のタスク\`

*タスク操作*
• \`完了 タスク名\` — 完了にする
• \`優先度変更 タスク名 高/中/低\` — 優先度を変更

*AI秘書*
• \`今日の計画\` — AIが今日の行動計画を作成
• 質問や相談はそのまま送る
───────────────`;

// ── Handlers ─────────────────────────────────────────────────

async function handleComplete(keyword: string, channel: string) {
  const tasks = await notionFindTask(keyword);
  if (tasks.length === 0) {
    await postSlackMessage(channel, `❌ 「${keyword}」に一致する未完了タスクが見つかりませんでした`);
    return;
  }
  const task = tasks[0];
  const ok = await notionCompleteTask(task.id);
  await postSlackMessage(channel, ok
    ? `✅ 完了しました\n🎉 *${task.title}*`
    : `⚠️ 「${task.title}」の更新に失敗しました`
  );
}

async function handleUpdatePriority(keyword: string, priJa: string, channel: string) {
  const tasks = await notionFindTask(keyword);
  if (tasks.length === 0) {
    await postSlackMessage(channel, `❌ 「${keyword}」に一致するタスクが見つかりませんでした`);
    return;
  }
  const task = tasks[0];
  const priority = PRIORITY_MAP[priJa] ?? "medium";
  const ok = await notionUpdateTask(task.id, { priority });
  await postSlackMessage(channel, ok
    ? `✅ 優先度を変更しました\n*${task.title}* → ${priJa}優先`
    : `⚠️ 更新に失敗しました`
  );
}

function formatTaskList(tasks: NotionTask[], header: string): string {
  if (tasks.length === 0) return `${header}\n（該当するタスクはありません）`;
  const today = new Date().toISOString().slice(0, 10);
  const lines = tasks.slice(0, 15).map((t, i) => {
    const pri = t.priority === "高" ? "🔴" : t.priority === "中" ? "🟡" : "🟢";
    const due = t.due_date
      ? t.due_date < today ? ` ⚠️期限切れ:${t.due_date}` : ` 📅${t.due_date}`
      : "";
    return `${i + 1}. ${pri} *${t.title}*${due}`;
  });
  return `${header}\n${lines.join("\n")}\n\n_完了: \`完了 タスク名\` | 変更: \`優先度変更 タスク名 高/中/低\`_`;
}

// ── Main handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const body = JSON.parse(rawBody);

    if (body.type === "url_verification") {
      return new NextResponse(body.challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }

    if (!verifySlackSignature(req, rawBody)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const event = body.event;
    if (!event || event.bot_id) return NextResponse.json({ ok: true });

    const isTarget = event.type === "app_mention" || (event.type === "message" && event.channel_type === "im");
    if (!isTarget) return NextResponse.json({ ok: true });

    const rawText = String(event.text || "").replace(/<@\w+>/g, "").replace(/\s+/g, " ").trim();
    if (!rawText) return NextResponse.json({ ok: true });

    const channel = String(event.channel);
    const userId = String(event.user || "");

    // ── ヘルプ ───────────────────────────────────────────────
    if (RE_HELP.test(rawText)) {
      await postSlackMessage(channel, HELP_TEXT);
      return NextResponse.json({ ok: true });
    }

    // ── タスク完了 ──────────────────────────────────────────
    const completeM = RE_COMPLETE.exec(rawText);
    if (completeM) {
      await handleComplete(completeM[1].trim(), channel);
      return NextResponse.json({ ok: true });
    }

    // ── 優先度変更 ──────────────────────────────────────────
    const prioM = RE_PRIORITY.exec(rawText);
    if (prioM) {
      await handleUpdatePriority(prioM[1].trim(), prioM[2], channel);
      return NextResponse.json({ ok: true });
    }

    // ── 今日の計画（AI） ────────────────────────────────────
    if (RE_PLAN.test(rawText)) {
      const tasks = await notionQueryTasks({ excludeDone: true });
      await postSlackMessage(channel, "🤔 タスクを分析中...");
      const plan = await aiPlanToday(tasks);
      await postSlackMessage(channel, plan);
      return NextResponse.json({ ok: true });
    }

    // ── タスク一覧系 ────────────────────────────────────────
    if (RE_LIST.test(rawText)) {
      const tasks = await notionQueryTasks({ excludeDone: true });
      await postSlackMessage(channel, formatTaskList(tasks, `📋 *タスク一覧（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    if (RE_TODAY.test(rawText)) {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = await notionQueryTasks({ excludeDone: true, dueOnOrBefore: today });
      await postSlackMessage(channel, formatTaskList(tasks, `📋 *今日のタスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    if (RE_WEEK.test(rawText)) {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const tasks = await notionQueryTasks({ excludeDone: true, dueOnOrBefore: nextWeek });
      await postSlackMessage(channel, formatTaskList(tasks, `📋 *今週のタスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    if (RE_HIGH.test(rawText)) {
      const tasks = await notionQueryTasks({ excludeDone: true, priority: "高" });
      await postSlackMessage(channel, formatTaskList(tasks, `🔴 *高優先度タスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    // ── プロジェクト別 ──────────────────────────────────────
    const projectM = RE_PROJECT.exec(rawText);
    if (projectM) {
      const projectName = projectM[1].trim();
      if (PROJECTS.includes(projectName)) {
        const tasks = await notionQueryTasks({ excludeDone: true, project: projectName });
        await postSlackMessage(channel, formatTaskList(tasks, `📁 *${projectName}のタスク（${tasks.length}件）*`));
        return NextResponse.json({ ok: true });
      }
    }

    // ── 質問 → AI回答 ─────────────────────────────────────
    if (isAssistantRequest(rawText)) {
      const tasks = await notionQueryTasks({ excludeDone: true });
      const reply = await aiChat(rawText, tasks);
      await postSlackMessage(channel, reply);
      return NextResponse.json({ ok: true });
    }

    // ── タスク追加（デフォルト） ────────────────────────────
    const titles = splitTasks(rawText);
    if (titles.length === 0) return NextResponse.json({ ok: true });

    const results: { title: string; project: string; genre: string; priority: string; due_date: string | null }[] = [];
    for (const title of titles) {
      const c = await classifyTask(title);
      await Promise.all([
        supabaseInsertTask({
          title, memo: "", project: c.project, status: c.status, priority: c.priority,
          urgency: c.urgency, impact: c.impact,
          source: "slack", slack_user_id: userId, slack_channel_id: channel,
        }),
        notionAddTask(title, c),
      ]);
      results.push({ title, project: c.project, genre: c.genre, priority: c.priority, due_date: c.due_date });
      if (titles.length > 1) await sleep(500);
    }
    const lines = results.map(({ title, project, genre, priority, due_date }) => {
      const pri = priority === "高" ? "🔴" : priority === "中" ? "🟡" : "🟢";
      const due = due_date ? `\n  📅 期限: ${due_date}` : "";
      return `• ${pri} *${title}*\n  ${project} / ${genre}${due}`;
    });
    const reply = results.length === 1
      ? `✅ タスクを追加しました\n${lines[0]}`
      : `✅ ${results.length}件追加しました\n${lines.join("\n")}`;
    await postSlackMessage(channel, reply);
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("[slack] ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}

// Type alias for handler param
type NotionTask = Awaited<ReturnType<typeof notionQueryTasks>>[0];
