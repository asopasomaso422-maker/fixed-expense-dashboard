import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "../../../../lib/classifyTask";
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

// 箇条書き（・ - • 改行）を個別タスクに分割
function splitTasks(text: string): string[] {
  const lines = text.split(/\n|・|•/).map((l) =>
    l.replace(/^[-・•\s]+/, "").trim()
  );
  const tasks = lines.filter((l) => l.length > 0).map((l) => l.slice(0, MAX_TITLE_LEN));
  return tasks.length > 0 ? tasks : [];
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

    const titles = splitTasks(rawText);
    if (titles.length === 0) return NextResponse.json({ ok: true });

    const results = await Promise.all(
      titles.map(async (title) => {
        const c = await classifyTask(title);
        await supabaseInsertTask({
          title, memo: "", project: c.project, status: c.status, priority: c.priority,
          urgency: c.urgency, impact: c.impact,
          source: "slack", slack_user_id: String(event.user || ""), slack_channel_id: String(event.channel || ""),
        });
        return { title, c };
      })
    );

    const lines = results.map(({ title, c }) => `• *${title}*\n  → ${c.project} / ${c.status} / ${c.priority}優先`);
    const reply = results.length === 1
      ? `✅ 追加しました\n${lines[0]}`
      : `✅ ${results.length}件追加しました\n${lines.join("\n")}`;

    await postSlackMessage(String(event.channel), reply);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[slack] ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
