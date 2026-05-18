import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { aiChat, aiPlanToday } from "../../../../lib/ai";
import { classifyTask } from "../../../../lib/classifyTask";
import {
  notionQueryTasks,
  notionFindTask,
  notionCompleteTask,
  notionUpdateTask,
  notionDeduplicateTasks,
  notionAddTask,
  notionAddInbox,
} from "../../../../lib/notion";
import { postSlackMessage } from "../../../../lib/slack";
import { supabaseInsertTask } from "../../../../lib/supabase";

function verifySlackSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET ?? "";
  const ts = req.headers.get("x-slack-request-timestamp") ?? "";
  const sig = req.headers.get("x-slack-signature") ?? "";
  const base = `v0:${ts}:${rawBody}`;
  const hmac = "v0=" + createHmac("sha256", secret).update(base).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
  } catch {
    return false;
  }
}

function splitTasks(text: string): string[] {
  // 括弧内のカンマはタスク区切りとみなさない
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if ("（(「【".includes(ch)) depth++;
    else if ("）)」】".includes(ch)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[,、\n]/.test(ch)) {
      if (current.trim()) result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Command patterns ─────────────────────────────────────────
const RE_COMPLETE   = /^完了\s+([\s\S]+)$/;
const RE_LIST       = /^(タスク)?一覧$|タスク.*(全部|すべて|全て|一覧|見せ|教えて)|全(部|て)のタスク/;
const RE_TODAY      = /^今日のタスク$|今日.*(タスク|やること|todo|する事)/i;
const RE_WEEK       = /^今週のタスク$|今週.*(タスク|やること)/;
const RE_HIGH       = /^高優先度(タスク)?$|高優先度.*(タスク|教えて|見せ|は)/;
const RE_PLAN       = /今日の計画|今日何する|今日何をする|今日.*計画|今日.*行動/;
const RE_PRIORITY   = /^優先度変更\s+(.+)\s+(高|中|低)$/;
const RE_HELP       = /^(ヘルプ|help|使い方|コマンド)$/i;
const RE_DEDUP      = /重複/;
const RE_RISK       = /危険|注意|放置|やばい/;
const RE_SET_TODAY  = /^今日に?(追加|入れて?|移動)\s+([\s\S]+)$|^([\s\S]+?)を?今日に?(追加|入れて?|移動)$/;
const RE_UNSET_TODAY = /^今日から(外す|削除|取り消し|戻す)\s+([\s\S]+)$/;

// ── 質問 or タスク判定（文法パターン） ──────────────────────
function isAssistantRequest(text: string): boolean {
  const t = text.replace(/[。！\s]+$/, "");
  // タスク追加系のパターンは除外（「〜入れておいて」「追加して」など）
  if (/おいて(ください)?$/.test(t)) return false;
  if (/(入れて|追加して|登録して|タスクに)(ください)?$/.test(t)) return false;
  return (
    /[？?]/.test(t) ||                                        // 疑問符
    /て(ください)?$/.test(t) ||                               // 〜して／してください
    /かな$/.test(t) ||                                        // 〜かな
    /でしょうか$/.test(t) ||                                  // 〜でしょうか
    /^(どう|何|なぜ|なに|どれ|いつ|誰|どこ)/.test(t) ||      // 疑問詞始まり
    /(アドバイス|提案|おすすめ|どう思|教えて|まとめて)/.test(t) // AI依頼語
  );
}

const HELP_TEXT = `*📖 使い方*
───────────────
*タスク追加*
→ そのままタスク内容を送る（期限・優先度も自然な文章でOK）
例: \`明日までに請求書送る\`

*タスク確認*
• \`タスク一覧\` — 全未完了タスク
• \`今日のタスク\` — ステータスが「今日やる」のタスク
• \`今週のタスク\` — ステータスが「今週やる」のタスク
• \`高優先度\` — 高優先度タスク
• \`危険なタスク\` — リスクが注意・危険のタスク

*タスク操作*
• \`完了 タスク名\` — 完了にする
• \`優先度変更 タスク名 高/中/低\` — 優先度を変更
• \`今日に追加 タスク名\` — 今日やるタスクに移動
• \`今日から外す タスク名\` — 今日のタスクから外す（未着手に戻す）
• \`重複削除\` — 重複タスクを削除

*AI秘書*
• \`今日の計画\` — AIが今日の行動計画を作成
• 質問や相談はそのまま送る
───────────────`;

// ── Handlers ─────────────────────────────────────────────────

async function handleComplete(keyword: string, channel: string) {
  const tasks = await notionFindTask(keyword);
  if (tasks.length === 0) {
    await postSlackMessage(channel, `❌ 「${keyword}」に一致するタスクが見つかりませんでした`);
    return;
  }
  const task = tasks[0];
  const ok = await notionCompleteTask(task.id);
  await postSlackMessage(channel, ok
    ? `✅ 完了しました: *${task.title}*`
    : `❌ 完了への変更に失敗しました: *${task.title}*`
  );
}

async function handleUpdatePriority(keyword: string, priJa: string, channel: string) {
  const tasks = await notionFindTask(keyword);
  if (tasks.length === 0) {
    await postSlackMessage(channel, `❌ 「${keyword}」に一致するタスクが見つかりませんでした`);
    return;
  }
  const task = tasks[0];
  const ok = await notionUpdateTask(task.id, { priority: priJa });
  await postSlackMessage(channel, ok
    ? `✅ 優先度を「${priJa}」に変更しました: *${task.title}*`
    : `❌ 優先度変更に失敗しました: *${task.title}*`
  );
}

function sortByUrgency(tasks: NotionTask[]): NotionTask[] {
  const today = new Date().toISOString().slice(0, 10);
  const priOrder: Record<string, number> = { "高": 0, "中": 1, "低": 2 };
  const statusOrder: Record<string, number> = { "今日やる": 0, "今週やる": 1, "未着手": 2, "後回し": 3 };
  const riskOrder: Record<string, number> = { "危険": 0, "注意": 1, "通常": 2 };
  return [...tasks].sort((a, b) => {
    const aOver = !!(a.due_date && a.due_date < today);
    const bOver = !!(b.due_date && b.due_date < today);
    // 1位: 期限切れ
    if (aOver !== bOver) return aOver ? -1 : 1;
    // 2位: リスク
    const riskDiff = (riskOrder[a.risk] ?? 2) - (riskOrder[b.risk] ?? 2);
    if (riskDiff !== 0) return riskDiff;
    // 3位: ステータス順
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    // 4位: 期限日が近い順
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    // 5位: 優先度
    return (priOrder[a.priority] ?? 2) - (priOrder[b.priority] ?? 2);
  });
}

function formatTaskList(tasks: NotionTask[], header: string): string {
  if (tasks.length === 0) return `${header}\n（該当するタスクはありません）`;
  const today = new Date().toISOString().slice(0, 10);
  const lines = tasks.slice(0, 5).map((t, i) => {
    const pri = t.priority === "高" ? "🔴" : t.priority === "中" ? "🟡" : "🟢";
    const due = t.due_date
      ? t.due_date < today ? ` ⚠️期限切れ:${t.due_date}` : ` 📅${t.due_date}`
      : "";
    const riskBadge = t.risk === "危険" ? " 🚨" : t.risk === "注意" ? " ⚠️" : "";
    const next = t.nextAction ? `\n   _→ ${t.nextAction}_` : "";
    return `${i + 1}. ${pri}${riskBadge} *${t.title}*${due}${next}`;
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

    // Slackのリトライを無視（処理遅延による重複防止）
    if (req.headers.get("x-slack-retry-num")) {
      return NextResponse.json({ ok: true });
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

    // Notion DB接続チェック
    if (!process.env.NOTION_TASKS_DATABASE_ID) {
      await postSlackMessage(channel, "❌ NotionのTasks DBに接続できません。NOTION_TASKS_DATABASE_IDまたはIntegration共有設定を確認してください。");
      return NextResponse.json({ ok: true });
    }

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
      const tasks = sortByUrgency(await notionQueryTasks({ excludeDone: true }));
      await postSlackMessage(channel, formatTaskList(tasks, `📋 *タスク一覧（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    // ── 今日やるタスク ──────────────────────────────────────
    if (RE_TODAY.test(rawText)) {
      const today = new Date().toISOString().slice(0, 10);
      const allTasks = await notionQueryTasks({ excludeDone: true });
      const todayFiltered = allTasks.filter(
        (t) => t.status === "今日やる" || t.due_date === today
      );
      if (todayFiltered.length > 0) {
        const sorted = sortByUrgency(todayFiltered);
        await postSlackMessage(channel, formatTaskList(sorted, `📋 *今日やるタスク（${sorted.length}件）*`));
      } else {
        // 今日指定がなければ全未完了タスクを表示
        const sorted = sortByUrgency(allTasks);
        const note = allTasks.length > 0
          ? `📋 *今日指定のタスクはありません*\n\n以下は全未完了タスク（${allTasks.length}件）から上位です：`
          : `📋 *タスクはまだありません*`;
        await postSlackMessage(channel, formatTaskList(sorted, note));
      }
      return NextResponse.json({ ok: true });
    }

    // ── 今週やるタスク ──────────────────────────────────────
    if (RE_WEEK.test(rawText)) {
      const tasks = await notionQueryTasks({ status: "今週やる" });
      await postSlackMessage(channel, formatTaskList(tasks, `📋 *今週やるタスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    // ── 高優先度タスク ──────────────────────────────────────
    if (RE_HIGH.test(rawText)) {
      const tasks = await notionQueryTasks({ excludeDone: true, priority: "高" });
      await postSlackMessage(channel, formatTaskList(tasks, `🔴 *高優先度タスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    // ── リスクタスク ────────────────────────────────────────
    if (RE_RISK.test(rawText)) {
      const [danger, caution] = await Promise.all([
        notionQueryTasks({ excludeDone: true, risk: "危険" }),
        notionQueryTasks({ excludeDone: true, risk: "注意" }),
      ]);
      const tasks = sortByUrgency([...danger, ...caution]);
      await postSlackMessage(channel, formatTaskList(tasks, `🚨 *リスクタスク（${tasks.length}件）*`));
      return NextResponse.json({ ok: true });
    }

    // ── 重複タスク削除 ─────────────────────────────────────
    if (RE_DEDUP.test(rawText)) {
      await postSlackMessage(channel, "🔍 重複タスクを検索中...");
      const { removed } = await notionDeduplicateTasks();
      if (removed.length === 0) {
        await postSlackMessage(channel, "✅ 重複タスクはありませんでした");
      } else {
        const lines = removed.map((t) => `  • ${t.title}`).join("\n");
        await postSlackMessage(channel, `🗑️ *${removed.length}件の重複を削除しました*\n${lines}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── 今日に追加 ─────────────────────────────────────────
    const setTodayM = RE_SET_TODAY.exec(rawText);
    if (setTodayM) {
      const keyword = (setTodayM[2] || setTodayM[3] || "").trim();
      if (keyword) {
        const found = await notionFindTask(keyword);
        if (found.length === 0) {
          await postSlackMessage(channel, `❌ 「${keyword}」に一致するタスクが見つかりませんでした`);
        } else {
          await notionUpdateTask(found[0].id, { status: "今日やる" });
          await postSlackMessage(channel, `📋 *今日のタスクに追加しました*: ${found[0].title}`);
        }
        return NextResponse.json({ ok: true });
      }
    }

    // ── 今日から外す ────────────────────────────────────────
    const unsetTodayM = RE_UNSET_TODAY.exec(rawText);
    if (unsetTodayM) {
      const keyword = unsetTodayM[2].trim();
      const found = await notionFindTask(keyword);
      if (found.length === 0) {
        await postSlackMessage(channel, `❌ 「${keyword}」に一致するタスクが見つかりませんでした`);
      } else {
        await notionUpdateTask(found[0].id, { status: "未着手" });
        await postSlackMessage(channel, `↩️ 今日のタスクから外しました: ${found[0].title}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── 質問 → AI回答 ─────────────────────────────────────
    if (isAssistantRequest(rawText)) {
      if (!process.env.OPENAI_API_KEY) {
        await postSlackMessage(channel, "💬 AI機能はOPENAI_API_KEYが設定されていないため使えません。タスク管理コマンドは引き続き使えます。`ヘルプ`で一覧を確認してください。");
        return NextResponse.json({ ok: true });
      }
      const tasks = await notionQueryTasks({ excludeDone: true });
      const reply = await aiChat(rawText, tasks);
      await postSlackMessage(channel, reply);
      return NextResponse.json({ ok: true });
    }

    // ── タスク追加（デフォルト） ────────────────────────────
    const titles = splitTasks(rawText);
    if (titles.length === 0) return NextResponse.json({ ok: true });

    const results: { title: string; category: string; priority: string; due_date: string | null; risk: string }[] = [];
    for (const title of titles) {
      const c = await classifyTask(title);
      await Promise.all([
        supabaseInsertTask({
          title,
          memo: "",
          project: c.category,
          status: c.status,
          priority: c.priority,
          urgency: c.risk === "危険" ? "high" : c.risk === "注意" ? "medium" : "low",
          impact: "medium",
          source: "slack",
          slack_user_id: userId,
          slack_channel_id: channel,
        }),
        notionAddTask(title, c),
        notionAddInbox({ title, source: "Slack", rawText: title }),
      ]);
      results.push({ title, category: c.category, priority: c.priority, due_date: c.due_date, risk: c.risk });
      if (titles.length > 1) await sleep(500);
    }
    const lines = results.map(({ title, category, priority, due_date, risk }) => {
      const pri = priority === "高" ? "🔴" : priority === "中" ? "🟡" : "🟢";
      const riskBadge = risk === "危険" ? " 🚨危険" : risk === "注意" ? " ⚠️注意" : "";
      const due = due_date ? `\n  📅 期限: ${due_date}` : "";
      return `• ${pri} *${title}*\n  ${category}${riskBadge}${due}`;
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
