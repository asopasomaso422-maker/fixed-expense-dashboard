const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase環境変数が未設定です。");
}

export async function supabaseInsertTask(payload: Record<string, unknown>) {
  assertEnv();
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
    method: "POST",
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function supabaseListTasks() {
  assertEnv();
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks?select=*&order=created_at.desc`, {
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function supabasePatchTask(id: string, payload: Record<string, unknown>) {
  assertEnv();
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function supabaseDeleteTask(id: string) {
  assertEnv();
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(await res.text());
}
