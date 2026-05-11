import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "../../../../lib/security";
import { postSlackMessage } from "../../../../lib/slack";
import { supabaseListTasks } from "../../../../lib/supabase";
type Task = { title: string; status: string; priority: string };
export async function GET(req: NextRequest) {
  try {
    assertCronAuthorized(req);
    const channel = process.env.SLACK_DEFAULT_CHANNEL_ID;
    if (!channel) throw new Error("SLACK_DEFAULT_CHANNEL_ID が未設定です。");
    const tasks = (await supabaseListTasks()) as Task[];
    const top3 = tasks.filter((t) => t.status === "today" && t.priority === "high").slice(0, 3);
    const text = top3.length ? `🌅 朝レビュー\n今日やるべき3つ:\n${top3.map((t, i) => `${i + 1}. ${t.title}`).join("\n")}` : "🌅 朝レビュー: today/high のタスクがありません。";
    await postSlackMessage(channel, text);
    return NextResponse.json({ ok: true });
  } catch (e) { const m = e instanceof Error ? e.message : "unknown"; return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 }); }
}
