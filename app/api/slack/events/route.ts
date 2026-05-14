import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "../../../../lib/classifyTask";
import { notionAddTask, notionCompleteTask, notionFindTask, notionQueryTasks } from "../../../../lib/notion";
import { postSlackMessage } from "../../../../lib/slack";
import { supabaseInsertTask } from "../../../../lib/supabase";

const MAX_TITLE_LEN = 280;

const safeCompare = (a: string, b: string) => {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

function verifySlackSignature(req: NextRequest, rawBody: string) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) throw new Error("SLACK_SIGNING_SECRET が未設定です。");
  const ts = req.headers.get("x-slack-request-timestamp") || "0";
  const sig = req.headers.get("x-slack-signature") || "";
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > 60 * 5) return false;
  const base = `v0:${ts}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
  return safeCompare(expected, sig);
}

function splitTasks(text: string): string[] {
  return text
    .split(/\n|・|•/)
    .map((l) => l.replace(/^[-・•\s]+/, "").trim())
    .filter((l) => l.length > 0)
    .map((l) => l.slice(0, MAX_TITLE_LEN));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const COMPLETE_RE = /^完了\s+([\s\S]+)$/;
const LIST_RE = /^(タスク)?一覧$/;
const TODAY_TASKS_RE = /^今日のタスク$/;

async function handleComplete(keyword: string, channel: string) {
  const tasks = await notionFindTask(keyword);
  if (tasks.length === 0) {
    await postSlackMessage(channel, `❌ 「${keyword}」に一致する未完了タスクが見つかりませんでした`);
    return;
  }
  const task = tasks[0];
  const ok = await notionCompleteTask(task.id);
  await postSlackMessage(
    channel,
    ok ? `✅ 完了しました\n*${task.title}*` : `⚠️ 「${task.title}」の更新に失敗しました`
  );
}

async function handleList(todayOnly: boolean, channel: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = await notionQueryTasks({
    excludeDone: true,
    dueOnOrBefore: todayOnly ? today : undefined,
  });

  if (tasks.length === 0) {
    await postSlackMessage(channel, todayOnly ? "📋 今日のタスクはありません 🎉" : "📋 未完了タスクはありません 🎉");
    return;
  }

  const lines = tasks.slice(0, 10).map((t, i) => {
    const due = t.due_date ? ` (期限: ${t.due_date})` : "";
    const pri = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
    return `${i + 1}. ${pri} *${t.title}*${due}`;
  });
  const header = todayOnly ? `📋 今日のタスク（${tasks.length}件）` : `📋 タスク一覧（${tasks.length}件）`;
  await postSlackMessage(channel, `${header}\n${lines.join("\n")}\n\n完了するには: \`完了 タスク名\``);
}

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

    // コマンド処理
    const completeMatch = COMPLETE_RE.exec(rawText);
    if (completeMatch) {
      await handleComplete(completeMatch[1].trim(), channel);
      return NextResponse.json({ ok: true });
    }

    if (LIST_RE.test(rawText)) {
      await handleList(false, channel);
      return NextResponse.json({ ok: true });
    }

    if (TODAY_TASKS_RE.test(rawText)) {
      await handleList(true, channel);
      return NextResponse.json({ ok: true });
    }

    // タスク追加
    const titles = splitTasks(rawText);
    if (titles.length === 0) return NextResponse.json({ ok: true });

    const results: { title: string; project: string; status: string; priority: string; due_date: string | null }[] = [];
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
      results.push({ title, project: c.project, status: c.status, priority: c.priority, due_date: c.due_date });
      if (titles.length > 1) await sleep(500);
    }

    const lines = results.map(({ title, project, status, priority, due_date }) => {
      const due = due_date ? `\n  📅 期限: ${due_date}` : "";
      const pri = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
      return `• ${pri} *${title}*\n  → ${project} / ${status}${due}`;
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
