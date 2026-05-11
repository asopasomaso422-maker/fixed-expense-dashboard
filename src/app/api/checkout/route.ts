export async function POST() {
  return Response.json(
    {
      error: "checkout_disabled",
      message: "この環境では決済機能（Stripe）は無効化されています。",
    },
    { status: 410 },
  );
}
