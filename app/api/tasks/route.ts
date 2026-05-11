import { NextResponse } from "next/server";
import { supabaseListTasks } from "../../../lib/supabase";
export async function GET() {
  try { return NextResponse.json(await supabaseListTasks()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 }); }
}
