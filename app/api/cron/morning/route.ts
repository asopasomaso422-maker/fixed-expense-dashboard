import { NextRequest, NextResponse } from "next/server";
import { getUnreadGmailsToday, type GmailMessage } from "../../../../lib/gmail";
import { getUpcomingEvents } from "../../../../lib/googleCalendar";
import { notionQueryTasks, notionUpdateTask, type NotionTask } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";

// タスクを緊急度順にソート
function sortByUrgency(tasks: NotionTask[]): NotionTask[] {
  const today = new Date().toISOString().slice(0, 10);
  const priOrder: Record<string, number> = { "高": 0, "中": 1, "低": 2 };
  const statusOrder: Record<string, number> = { "今日やる": 0, "今週やる": 1, "未着手": 2, "後回し": 3 };
  return [...tasks].sort((a, b) => {
    const aOver = !!(a.due_date && a.due_date < today);
    const bOver = !!(b.due_date && b.due_date < today);
    if (aOver !== bOver) return aOver ? -1 : 1;
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return (priOrder[a.priority] ?? 2) - (priOrder[b.priority] ?? 2);
  });
}

// 返信が必要そうなメールだけ抽出
const SKIP_PATTERNS = [
  /noreply|no-reply|donotreply|do-not-reply/i,
  /newsletter|magazine|mailing|mailchimp|sendgrid|substack/i,
  /notification|alert|update|confirm|verify|receipt|invoice/i,
  /info@|support@|help@|admin@|system@|service@|team@/i,
  /google|twitter|facebook|instagram|linkedin|notion|slack|zoom/i,
];

function filterReplyNeeded(emails: GmailMessage[]): GmailMessage[] {
  return emails.filter((m) => {
    const from = m.from.toLowerCase();
    const subj = m.subject.toLowerCase();
    if (SKIP_PATTERNS.some((p) => p.test(from) || p.test(subj))) return false;
    return true;
  });
}

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

    const sorted = sortByUrgency(allPending);
    const top3   = sorted.slice(0, 3);
    const next3  = sorted.slice(3, 6);
    const replyNeeded = filterReplyNeeded(gmailUnread);

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
