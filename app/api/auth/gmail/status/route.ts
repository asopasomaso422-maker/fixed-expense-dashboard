import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    GMAIL_CLIENT_ID:     process.env.GMAIL_CLIENT_ID     ? "✅ 設定済み" : "❌ 未設定",
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? "✅ 設定済み" : "❌ 未設定",
    GMAIL_REDIRECT_URI:  process.env.GMAIL_REDIRECT_URI  ?? "❌ 未設定",
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? "✅ 設定済み" : "❌ 未設定（Step3未完了）",
  });
}
