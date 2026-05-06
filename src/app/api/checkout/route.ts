import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type LineItemInput = {
  productId: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    const { items, shippingMethod, totalQty } = (await request.json()) as {
      items: LineItemInput[];
      shippingMethod: "standard" | "studio";
      totalQty: number;
    };

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "jpy",
        product_data: {
          name: `${item.name}（サイズ: ${item.size}）`,
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const isFreeShipping = shippingMethod === "studio" || totalQty >= 2;
    const shippingCost = isFreeShipping ? 0 : 240;
    const shippingLabel =
      shippingMethod === "studio"
        ? "スタジオ受け取り（無料）"
        : totalQty >= 2
          ? "配送（まとめ買い送料無料）"
          : "通常配送（¥240）";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(shippingMethod !== "studio" && {
        shipping_address_collection: { allowed_countries: ["JP"] },
      }),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCost, currency: "jpy" },
            display_name: shippingLabel,
          },
        },
      ],
      locale: "ja",
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/${items[0].productId}`,
      payment_method_types: ["card"],
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
