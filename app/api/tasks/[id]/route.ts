import { NextRequest, NextResponse } from "next/server";
import { supabaseDeleteTask, supabasePatchTask } from "../../../../lib/supabase";
const ALLOWED = new Set(["inbox", "today", "week", "later", "research", "done"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.memo === "string") patch.memo = body.memo.slice(0, 2000);
    if (typeof body.status === "string" && ALLOWED.has(body.status)) patch.status = body.status;
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    await supabasePatchTask(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 }); }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await supabaseDeleteTask(id); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 }); }
}
