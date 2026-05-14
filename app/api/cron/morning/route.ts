import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "../../../../lib/googleCalendar";
import { notionQueryTasks } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";

export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);
    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID が未設定です。");

    const today = new Date().toISOString().slice(0, 10);

    const [allPending, events] = await Promise.all([
      notionQueryTasks({ excludeDone: true }),
      getUpcomingEvents(24),
    ]);

    const overdue = allPending.filter((t) => t.due_date && t.due_date < today);
    const todayTasks = allPending.filter((t) => t.due_date === today || t.status === "today");
    const highPriority = allPending
      .filter((t) => t.priority === "high" && t.due_date !== today && (!t.due_date || t.due_date > today))
      .slice(0, 3);

    const lines: string[] = ["🌅 おはようございます！今日のタスク確認です", "─────────────────────"];

    if (overdue.length > 0) {
      lines.push(`⚠️ *期限切れ（${overdue.length}件）*`);
      overdue.slice(0, 5).forEach((t) => {
        lines.push(`  • 🔴 ${t.title} (期限: ${t.due_date})`);
      });
    }

    if (todayTasks.length > 0) {
      lines.push(`\n📋 *今日のタスク（${todayTasks.length}件）*`);
      todayTasks.slice(0, 5).forEach((t) => {
        const pri = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
        lines.push(`  ${pri} ${t.title}`);
      });
    } else {
      lines.push("\n📋 今日が期限のタスクはありません");
    }

    if (highPriority.length > 0) {
      lines.push(`\n🎯 *高優先度タスク*`);
      highPriority.forEach((t) => {
        const due = t.due_date ? ` (期限: ${t.due_date})` : "";
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

    lines.push("\n─────────────────────");
    lines.push(`💬 \`タスク一覧\` で全タスク / \`完了 タスク名\` で完了`);

    await postSlackMessage(channel, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 });
  }
}
