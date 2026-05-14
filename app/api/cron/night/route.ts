import { NextRequest, NextResponse } from "next/server";
import { notionQueryTasks } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";

export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);
    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID が未設定です。");

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const allPending = await notionQueryTasks({ excludeDone: true });

    const overdue = allPending.filter((t) => t.due_date && t.due_date < today);
    const stillToday = allPending.filter((t) => t.due_date === today || t.status === "today");
    const tomorrowTasks = allPending.filter((t) => t.due_date === tomorrow);

    const lines: string[] = ["🌙 お疲れ様です！夜のタスク確認です", "─────────────────────"];

    if (overdue.length > 0) {
      lines.push(`⚠️ *期限切れ（${overdue.length}件）*`);
      overdue.slice(0, 5).forEach((t) => {
        lines.push(`  • 🔴 ${t.title} (期限: ${t.due_date})`);
      });
    }

    if (stillToday.length > 0) {
      lines.push(`\n📋 *未完了の今日タスク（${stillToday.length}件）*`);
      stillToday.slice(0, 5).forEach((t) => {
        const pri = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
        lines.push(`  ${pri} ${t.title}`);
      });
    } else {
      lines.push("\n✅ 今日のタスクはすべて完了しています！");
    }

    if (tomorrowTasks.length > 0) {
      lines.push(`\n📌 *明日が期限（${tomorrowTasks.length}件）*`);
      tomorrowTasks.forEach((t) => {
        const pri = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
        lines.push(`  ${pri} ${t.title}`);
      });
    }

    lines.push("\n─────────────────────");
    lines.push(`💬 \`完了 タスク名\` で完了マーク`);

    await postSlackMessage(channel, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 });
  }
}
