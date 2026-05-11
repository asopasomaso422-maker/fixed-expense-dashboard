import { NextRequest } from "next/server";
export function assertCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET が未設定です。");
  if ((req.headers.get("authorization") || "") !== `Bearer ${secret}`) throw new Error("unauthorized");
}
