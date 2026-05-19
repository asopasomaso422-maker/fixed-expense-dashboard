import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/gmail/callback → コードをトークンに交換してrefresh_tokenを表示
export async function GET(req: NextRequest) {
  const code        = req.nextUrl.searchParams.get("code");
  const error       = req.nextUrl.searchParams.get("error");
  const clientId    = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const callbackUrl = process.env.GMAIL_REDIRECT_URI ?? "";

  if (error) {
    return new NextResponse(`認証エラー: ${error}`, { status: 400 });
  }
  if (!code || !clientId || !clientSecret || !callbackUrl) {
    return new NextResponse("必要なパラメータが不足しています", { status: 400 });
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  callbackUrl,
        grant_type:    "authorization_code",
      }),
    });
    const data = await res.json() as { refresh_token?: string; error?: string };

    if (data.error || !data.refresh_token) {
      return new NextResponse(
        `トークン取得エラー: ${JSON.stringify(data)}`,
        { status: 500 }
      );
    }

    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>Gmail認証完了</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}
.token{background:#f0f0f0;padding:12px;border-radius:6px;word-break:break-all;font-family:monospace;font-size:14px}
.step{background:#e8f4ff;padding:12px;border-radius:6px;margin:12px 0}</style>
</head>
<body>
<h2>✅ Gmail認証完了</h2>
<p>以下のRefresh Tokenを <strong>Vercel環境変数</strong> に設定してください：</p>
<p><strong>変数名：</strong> <code>GMAIL_REFRESH_TOKEN</code></p>
<div class="token">${data.refresh_token}</div>
<div class="step">
<strong>設定手順：</strong><br>
1. Vercel → プロジェクト → Settings → Environment Variables<br>
2. GMAIL_REFRESH_TOKEN に上記の値を貼り付け<br>
3. Save → Redeploy
</div>
<p>⚠️ このページを閉じる前にTokenをコピーしてください。</p>
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new NextResponse(
      `エラー: ${e instanceof Error ? e.message : "unknown"}`,
      { status: 500 }
    );
  }
}
