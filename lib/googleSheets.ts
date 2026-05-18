import { createSign } from "crypto";

async function getSheetsToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const sig = sign.sign(key, "base64url");
  const jwt = `${unsigned}.${sig}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error("[sheets] token error:", await res.text());
      return null;
    }
    const json = await res.json();
    return (json.access_token as string) ?? null;
  } catch (e) {
    console.error("[sheets] token error:", e instanceof Error ? e.message : e);
    return null;
  }
}

export type ContentRow = {
  no: string;
  content: string;   // コンテンツ名
  pubDate: string;   // YYYY-MM-DD
  caption: string;   // キャプション案
};

// "M/D" → YYYY-MM-DD（過去日付は翌年とみなす）
function parseSheetDate(md: string): string | null {
  const match = md.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  // 7日以上前の日付は翌年扱い
  if (candidate.getTime() < now.getTime() - 7 * 24 * 3600 * 1000) year++;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function getContentsDueIn(days: number): Promise<ContentRow[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("[sheets] GOOGLE_SPREADSHEET_ID未設定");
    return [];
  }

  const token = await getSheetsToken();
  if (!token) {
    console.error("[sheets] トークン取得失敗");
    return [];
  }

  const target = new Date();
  target.setDate(target.getDate() + days);
  const targetDate = target.toISOString().slice(0, 10);

  try {
    const range = encodeURIComponent("A:N");
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error("[sheets] API error:", await res.text());
      return [];
    }
    const data = (await res.json()) as { values?: string[][] };
    const rows = data.values ?? [];

    const results: ContentRow[] = [];
    for (const row of rows.slice(1)) {  // 1行目はヘッダーをスキップ
      const no         = row[1]  ?? "";
      const content    = row[2]  ?? "";
      const pubDateRaw = row[4]  ?? "";
      const caption    = row[13] ?? "";

      if (!content.trim() || !pubDateRaw.trim()) continue;
      const pubDate = parseSheetDate(pubDateRaw);
      if (!pubDate || pubDate !== targetDate) continue;

      results.push({ no, content: content.trim(), pubDate, caption: caption.trim() });
    }
    return results;
  } catch (e) {
    console.error("[sheets] fetch error:", e instanceof Error ? e.message : e);
    return [];
  }
}
