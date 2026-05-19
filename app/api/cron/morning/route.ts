import { NextRequest, NextResponse } from "next/server";
import { aiMorningSummary } from "../../../../lib/ai";
import { getUnreadGmailsToday } from "../../../../lib/gmail";
import { getUpcomingEvents } from "../../../../lib/googleCalendar";
import { notionQueryTasks, notionUpdateTask } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";

export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);
    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID が未設定です。");

    const today = new Date().toISOString().slice(0, 10);

    const [allPending, events, gmailUnread] = await Promise.all([
      notionQueryTasks({ excludeDone: true }),
      getUpcomingEvents(24),
      getUnreadGmailsToday(),
    ]);

    // 期限日=今日のタスクを自動で「今日やる」ステータスに更新
    const toPromote = allPending.filter(
      (t) => t.due_date === today && t.status !== "今日やる" && t.status !== "完了"
    );
    await Promise.all(toPromote.map((t) => notionUpdateTask(t.id, { status: "今日やる" })));

    const overdue    = allPending.filter((t) => t.due_date && t.due_date < today);
    const todayTasks = allPending.filter((t) => t.due_date === today || t.status === "今日やる");
    const highOther  = allPending
      .filter((t) => t.priority === "高" && t.due_date !== today && (!t.due_date || t.due_date > today))
      .slice(0, 3);

    // AI summary (optional, non-blocking)
    const aiSummary = await aiMorningSummary(allPending, events);

    const lines: string[] = ["🌅 *おはようございます！*", "───────────────────────"];

    if (aiSummary) {
      lines.push(aiSummary);
      lines.push("───────────────────────");
    }

    if (overdue.length > 0) {
      lines.push(`⚠️ *期限切れ（${overdue.length}件）*`);
      overdue.slice(0, 5).forEach((t) => lines.push(`  • 🔴 ${t.title}（${t.due_date}）`));
    }

    if (todayTasks.length > 0) {
      lines.push(`\n📋 *今日のタスク（${todayTasks.length}件）*`);
      todayTasks.slice(0, 5).forEach((t) => {
        const pri = t.priority === "高" ? "🔴" : t.priority === "中" ? "🟡" : "🟢";
        lines.push(`  ${pri} ${t.title}`);
      });
    }

    if (highOther.length > 0) {
      lines.push(`\n🎯 *高優先度（その他）*`);
      highOther.forEach((t) => {
        const due = t.due_date ? ` 📅${t.due_date}` : "";
        lines.push(`  🔴 ${t.title}${due}`);
      });
    }

    if (events.length > 0) {
      lines.push(`\n📅 *今日の予定（${events.length}件）*`);
      events.forEach((e) => {
        const time = e.start.includes("T")
          ? new Date(e.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })
          : "終日";
        lines.push(`  🗓 ${time} ${e.summary}`);
      });
    }

    if (gmailUnread.length > 0) {
      lines.push(`\n📧 *Gmail未読（${gmailUnread.length}件）*`);
      gmailUnread.slice(0, 5).forEach((m) => {
        const from = m.from.replace(/<[^>]+>/, "").trim() || m.from;
        lines.push(`  📨 *${m.subject || "(件名なし)"}*`);
        lines.push(`     _${from}_`);
      });
    }

    lines.push("\n───────────────────────");
    lines.push("💬 `今日の計画` でAI行動計画 / `タスク一覧` で全件確認");

    await postSlackMessage(channel, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 });
  }
}
