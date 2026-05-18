import { NextRequest, NextResponse } from "next/server";
import { getContentsDueIn } from "../../../../lib/googleSheets";
import { classifyTask } from "../../../../lib/classifyTask";
import { notionAddTask, notionFindTask } from "../../../../lib/notion";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";

export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);

    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID未設定");

    // 3日後に公開予定のコンテンツを取得
    const contents = await getContentsDueIn(3);
    if (contents.length === 0) {
      return NextResponse.json({ ok: true, message: "3日後に公開予定のコンテンツなし" });
    }

    for (const item of contents) {
      const taskTitle = `編集：${item.content}`;

      // 同名タスクが既に存在する場合はスキップ（重複防止）
      const existing = await notionFindTask(taskTitle);
      if (existing.length > 0) {
        console.log(`[sheets cron] スキップ（既存）: ${taskTitle}`);
        continue;
      }

      // Notionに編集タスクを追加
      const c = await classifyTask(taskTitle);
      c.due_date    = item.pubDate;   // 公開日を期限に設定
      c.priority    = "高";
      c.status      = "今日やる";
      c.category    = "編集";
      await notionAddTask(taskTitle, c);

      // Slackにリマインドを送信
      const captionLines = item.caption
        ? item.caption.replace(/\\n/g, "\n").slice(0, 400) +
          (item.caption.length > 400 ? "\n_（続きはスプレッドシートで確認）_" : "")
        : "_（キャプションなし）_";

      const msg = [
        `🎬 *編集リマインド* — 公開 *3日前*`,
        `───────────────────────`,
        `📌 *${item.content}*`,
        `📅 公開予定日: *${item.pubDate}*`,
        ``,
        `*📝 キャプション案:*`,
        captionLines,
        `───────────────────────`,
        `✅ Notionに編集タスクを追加しました`,
        `_完了後: \`完了 ${taskTitle}\`_`,
      ].join("\n");

      await postSlackMessage(channel, msg);
    }

    return NextResponse.json({ ok: true, count: contents.length });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    console.error("[cron/sheets] ERROR:", m);
    return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 });
  }
}
