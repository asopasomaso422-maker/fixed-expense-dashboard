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
    const done = tasks.filter((t) => t.status === "done").slice(0, 5);
    const carry = tasks.filter((t) => t.status === "today" && t.priority !== "high").slice(0, 5);
    const text = `🌙 夜レビュー\n完了:\n${done.map((t) => `- ${t.title}`).join("\n") || "- なし"}\n\n明日に回す候補:\n${carry.map((t) => `- ${t.title}`).join("\n") || "- なし"}`;
    await postSlackMessage(channel, text);
    return NextResponse.json({ ok: true });
  } catch (e) { const m = e instanceof Error ? e.message : "unknown"; return NextResponse.json({ error: m }, { status: m === "unauthorized" ? 401 : 500 }); }
}
