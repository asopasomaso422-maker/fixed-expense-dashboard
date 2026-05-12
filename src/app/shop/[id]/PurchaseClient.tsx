"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { products, formatPrice } from "@/constants/products";
import { trackEvent } from "@/lib/analytics";

const SHIPPING_COST = 240;

export default function PurchaseClient({ productId }: { productId: string }) {
  const product = products.find((p) => p.id === productId)!;
  const crossSell = products.find((p) => p.id !== productId)!;

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [shipping, setShipping] = useState<"standard" | "studio">("standard");

  const [crossAdded, setCrossAdded] = useState(false);
  const [crossSize, setCrossSize] = useState("");
  const [crossQty, setCrossQty] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalQty = qty + (crossAdded ? crossQty : 0);
  const shippingCost = shipping === "studio" || totalQty >= 2 ? 0 : SHIPPING_COST;
  const subtotal =
    product.price * qty + (crossAdded ? crossSell.price * crossQty : 0);
  const total = subtotal + shippingCost;

  async function handleCheckout() {
    if (!size) {
      setError("サイズを選択してください。");
      return;
    }
    if (crossAdded && !crossSize) {
      setError("追加商品のサイズを選択してください。");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const items = [
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          size,
          quantity: qty,
        },
        ...(crossAdded
          ? [
              {
                productId: crossSell.id,
                name: crossSell.name,
                price: crossSell.price,
                size: crossSize,
                quantity: crossQty,
              },
            ]
          : []),
      ];
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shippingMethod: shipping, totalQty }),
      });
      if (!res.ok) throw new Error("checkout failed");
      const { url } = await res.json();
      trackEvent("begin_checkout", { value: total, currency: "JPY" });
      window.location.assign(url);
    } catch {
      setError("決済ページへの移動に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
      <Link
        href="/#shop"
        className="mb-12 inline-block text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
      >
        ← Back to Shop
      </Link>

      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-24">
        {/* ── 画像ギャラリー ── */}
        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#eeeae2]">
            <Image
              src={product.images[activeImage]}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-20 overflow-hidden border bg-[#eeeae2] transition-colors ${
                    i === activeImage ? "border-foreground" : "border-border"
                  }`}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 注文フォーム ── */}
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.4em] text-muted">
            Ballet class with Amy
          </p>
          <h1 className="font-serif text-3xl font-light leading-snug md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 font-serif text-2xl">
            {formatPrice(product.price, product.currency)}
          </p>

          {/* サイズ */}
          <div className="mt-10">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted">サイズ</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(s); setError(""); }}
                  className={`border px-4 py-2 text-[12px] tracking-wide transition-colors ${
                    size === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 枚数 */}
          <div className="mt-8">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted">枚数</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center border border-border text-lg transition-colors hover:border-foreground"
              >
                −
              </button>
              <span className="w-8 text-center font-serif text-lg">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="flex h-10 w-10 items-center justify-center border border-border text-lg transition-colors hover:border-foreground"
              >
                ＋
              </button>
            </div>
          </div>

          {/* 配送方法 */}
          <div className="mt-8">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted">配送方法</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="shipping"
                  value="standard"
                  checked={shipping === "standard"}
                  onChange={() => setShipping("standard")}
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                />
                <span className="text-[13px] leading-relaxed">
                  通常配送
                  <span className="ml-2 text-muted">
                    {totalQty >= 2 ? "（2枚以上まとめ買い送料無料）" : `¥${SHIPPING_COST}`}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="shipping"
                  value="studio"
                  checked={shipping === "studio"}
                  onChange={() => setShipping("studio")}
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                />
                <span className="text-[13px] leading-relaxed">
                  スタジオ受け取り（アトリエ泉野）
                  <span className="ml-2 text-muted">送料無料</span>
                </span>
              </label>
            </div>
          </div>

          {/* 注文概要 */}
          <div className="mt-10 border-t border-border pt-8">
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted">商品合計</span>
                <span>¥{subtotal.toLocaleString("ja-JP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">送料</span>
                <span>{shippingCost === 0 ? "無料" : `¥${shippingCost}`}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-serif text-xl">
                <span>合計</span>
                <span>¥{total.toLocaleString("ja-JP")}</span>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-[12px] text-red-600">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-8 w-full bg-foreground py-5 text-[12px] uppercase tracking-[0.35em] text-background transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "処理中..." : "Stripeで支払う →"}
          </button>

          <p className="mt-4 text-center text-[11px] text-muted">
            クレジットカード決済（Stripe）/ SSL暗号化通信
          </p>
        </div>
      </div>

      {/* ── まとめて購入セクション ── */}
      <div className="mt-32 border-t border-border pt-16">
        <p className="mb-2 text-center text-[11px] uppercase tracking-[0.4em] text-muted">
          — Bundle &amp; Save —
        </p>
        <p className="mb-12 text-center font-serif text-xl font-light">
          まとめて購入で<em className="italic">送料無料</em>
        </p>

        <div className="mx-auto max-w-3xl border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#eeeae2] sm:aspect-auto sm:min-h-[280px]">
              <Image
                src={crossSell.image}
                alt={crossSell.name}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-8 md:p-10">
              <h3 className="font-serif text-2xl font-light leading-snug">
                {crossSell.name}
              </h3>
              <p className="mt-2 font-serif text-lg">
                {formatPrice(crossSell.price, crossSell.currency)}
              </p>

              {!crossAdded ? (
                <button
                  onClick={() => setCrossAdded(true)}
                  className="mt-6 inline-flex items-center justify-center border border-foreground px-6 py-4 text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-foreground hover:text-background"
                >
                  ＋ まとめて購入に追加
                </button>
              ) : (
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted">サイズ</p>
                    <div className="flex flex-wrap gap-2">
                      {crossSell.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setCrossSize(s); setError(""); }}
                          className={`border px-3 py-1.5 text-[11px] tracking-wide transition-colors ${
                            crossSize === s
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted">枚数</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCrossQty((q) => Math.max(1, q - 1))}
                        className="flex h-9 w-9 items-center justify-center border border-border text-base transition-colors hover:border-foreground"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-serif">{crossQty}</span>
                      <button
                        onClick={() => setCrossQty((q) => Math.min(10, q + 1))}
                        className="flex h-9 w-9 items-center justify-center border border-border text-base transition-colors hover:border-foreground"
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCrossAdded(false); setCrossSize(""); setCrossQty(1); }}
                    className="text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {crossAdded && (
          <p className="mt-6 text-center text-[12px] text-muted">
            {totalQty >= 2
              ? "✓ 2枚以上のため送料無料になりました"
              : `あと${2 - totalQty}枚で送料無料`}
          </p>
        )}
      </div>
    </div>
  );
}
