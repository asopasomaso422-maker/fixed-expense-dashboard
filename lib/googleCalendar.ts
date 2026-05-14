import { createSign } from "crypto";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
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
      console.error("[gcal] token error:", await res.text());
      return null;
    }
    const json = await res.json();
    return (json.access_token as string) ?? null;
  } catch (e) {
    console.error("[gcal] token fetch error:", e instanceof Error ? e.message : e);
    return null;
  }
}

export type CalendarEvent = { summary: string; start: string };

export async function getUpcomingEvents(hours = 24): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const calId = process.env.GOOGLE_CALENDAR_ID ?? "primary";
  const now = new Date();
  const later = new Date(now.getTime() + hours * 3600 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: later.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "10",
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error("[gcal] events error:", await res.text());
      return [];
    }
    const json = await res.json() as { items?: Record<string, unknown>[] };
    return (json.items ?? []).map((e) => ({
      summary: String(e.summary ?? "(無題)"),
      start: String(
        (e.start as Record<string, string>)?.dateTime ??
        (e.start as Record<string, string>)?.date ?? ""
      ),
    }));
  } catch (e) {
    console.error("[gcal] events fetch error:", e instanceof Error ? e.message : e);
    return [];
  }
}
