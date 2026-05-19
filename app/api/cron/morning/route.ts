import { NextRequest, NextResponse } from "next/server";
import { getUnreadGmailsToday } from "../../../../lib/gmail";
import { getUpcomingEvents } from "../../../../lib/googleCalendar";
import { notionQueryTasks, notionUpdateTask } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";
import { aiSelectMorningTasks, aiFilterReplyEmails } from "../../../../lib/ai";

export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);
    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID が未設定です。");

    const today = new Date().toISOString().slice(0, 10);
    const jstDate = new Date().toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short",
    });

    const [allPending, events, gmailUnread] = await Promise.all([
      notionQueryTasks({ excludeDone: true }),
      getUpcomingEvents(24),
      getUnreadGmailsToday(),
    ]);

    // 期限日=今日のタスクを自動で「今日やる」に昇格
    const toPromote = allPending.filter(
      (t) => t.due_date === today && t.status !== "今日やる" && t.status !== "完了"
    );
    await Promise.all(toPromote.map((t) => notionUpdateTask(t.id, { status: "今日やる" })));

    const [{ top3, next3 }, replyNeeded] = await Promise.all([
      aiSelectMorningTasks(allPending),
      aiFilterReplyEmails(gmailUnread),
    ]);

    const lines: string[] = [
      `🌅 *おはようございます！${jstDate}*`,
      "───────────────────────",
    ];

    // 今日の予定（あれば最初に）
    if (events.length > 0) {
      lines.push(`📅 *今日の予定*`);
      events.forEach((e) => {
        const time = e.start.includes("T")
          ? new Date(e.start).toLocaleTimeString("ja-JP", {
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
            })
          : "終日";
        lines.push(`  🗓 ${time}　${e.summary}`);
      });
      lines.push("");
    }

    // 優先タスク TOP3
    lines.push("🔴 *今日やるべきタスク TOP3*");
    if (top3.length === 0) {
      lines.push("  （未完了タスクはありません）");
    } else {
      top3.forEach((t, i) => {
        const overdue = t.due_date && t.due_date < today ? " ⚠️期限切れ" : "";
        const due     = t.due_date && t.due_date >= today ? ` 📅${t.due_date}` : "";
        const pri     = t.priority === "高" ? "🔴" : t.priority === "中" ? "🟡" : "🟢";
        lines.push(`  ${i + 1}. ${pri} *${t.title}*${overdue}${due}`);
      });
    }

    lines.push("");

    // 追加でやると良いタスク
    if (next3.length > 0) {
      lines.push("💡 *追加でやると良いタスク*");
      next3.forEach((t, i) => {
        const due = t.due_date ? ` 📅${t.due_date}` : "";
        const pri = t.priority === "高" ? "🔴" : t.priority === "中" ? "🟡" : "🟢";
        lines.push(`  ${i + 4}. ${pri} ${t.title}${due}`);
      });
      lines.push("");
    }

    // 返信が必要なメール
    if (replyNeeded.length > 0) {
      lines.push(`📧 *返信が必要なメール（${replyNeeded.length}件）*`);
      replyNeeded.slice(0, 4).forEach((m) => {
        const from = m.from.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
        lines.push(`  • *${m.subject || "(件名なし)"}*`);
        lines.push(`    _from: ${from}_`);
      });
      lines.push("");
    }

    lines.push("───────────────────────");
    lines.push("💬 `今日の計画` でAI分析 / `タスク一覧` で全件確認");

    await postSlackMessage(channel, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 });
  }
}
