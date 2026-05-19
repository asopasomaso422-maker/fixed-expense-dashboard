export type GmailMessage = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
};

async function getGmailToken(): Promise<string | null> {
  const clientId     = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("[gmail] token error:", await res.text());
      return null;
    }
    const json = await res.json();
    return (json.access_token as string) ?? null;
  } catch (e) {
    console.error("[gmail] token fetch error:", e instanceof Error ? e.message : e);
    return null;
  }
}

function extractHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function getUnreadGmailsToday(): Promise<GmailMessage[]> {
  const token = await getGmailToken();
  if (!token) return [];

  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  try {
    const query = encodeURIComponent(`is:unread in:inbox after:${dateStr}`);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) {
      console.error("[gmail] list error:", await listRes.text());
      return [];
    }
    const listData = await listRes.json() as { messages?: { id: string }[] };
    const messageIds = listData.messages ?? [];

    const messages: GmailMessage[] = [];
    for (const { id } of messageIds.slice(0, 8)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json() as {
        id: string;
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers = msg.payload?.headers ?? [];
      messages.push({
        id,
        from:    extractHeader(headers, "From"),
        subject: extractHeader(headers, "Subject"),
        snippet: (msg.snippet ?? "").slice(0, 80),
        date:    extractHeader(headers, "Date"),
      });
    }
    return messages;
  } catch (e) {
    console.error("[gmail] fetch error:", e instanceof Error ? e.message : e);
    return [];
  }
}
