import { NextResponse } from "next/server";

// GET /api/auth/gmail → Googleの認証ページにリダイレクト
export async function GET() {
  const clientId    = process.env.GMAIL_CLIENT_ID;
  const callbackUrl = process.env.GMAIL_REDIRECT_URI ?? "";

  if (!clientId || !callbackUrl) {
    return NextResponse.json(
      { error: "GMAIL_CLIENT_ID または GMAIL_REDIRECT_URI が未設定です。Vercel環境変数を確認してください。" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  callbackUrl,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/gmail.readonly",
    access_type:   "offline",
    prompt:        "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
