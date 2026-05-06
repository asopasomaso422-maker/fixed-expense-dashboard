import Image from "next/image";
import Link from "next/link";
import { products, formatPrice } from "@/constants/products";
import FadeIn from "./FadeIn";

export default function Shop() {
  return (
    <section
      id="shop"
      aria-labelledby="shop-heading"
      className="relative border-t border-border py-32 md:py-48"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <FadeIn>
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.4em] text-muted">
            — Shop —
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2
            id="shop-heading"
            className="mx-auto mb-6 max-w-3xl text-center font-serif text-[clamp(2.25rem,4.5vw,3.75rem)] font-light leading-[1.1]"
          >
            Selected <em className="italic">pieces</em>
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mb-24 max-w-md text-center text-sm font-light leading-relaxed text-foreground/70 md:mb-32">
            舞台と日常をつなぐ、小さなコレクション。<br />
            サイズ・枚数を選んでStripe決済でご購入いただけます。
          </p>
        </FadeIn>

        <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-x-12 gap-y-20 sm:grid-cols-2">
          {products.map((p, i) => (
            <li key={p.id}>
              <FadeIn delay={i * 0.08}>
                <article className="group flex flex-col" itemScope itemType="https://schema.org/Product">
                  <meta itemProp="name" content={p.name} />
                  <meta itemProp="description" content={p.subtitle ?? p.name} />

                  <Link
                    href={`/shop/${p.id}`}
                    className="relative block aspect-[4/5] overflow-hidden bg-[#eeeae2]"
                    aria-label={`${p.name} を購入する`}
                  >
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(min-width: 640px) 45vw, 100vw"
                      className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                    />
                  </Link>

                  <div className="mt-6 flex flex-col gap-1">
                    <h3 className="font-serif text-xl font-light leading-snug">
                      {p.name}
                    </h3>
                    {p.subtitle && (
                      <p className="text-[12px] font-light tracking-wide text-muted">
                        {p.subtitle}
                      </p>
                    )}
                    <p className="mt-3 font-serif text-lg tracking-wide" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                      <span itemProp="price" content={String(p.price)}>
                        {formatPrice(p.price, p.currency)}
                      </span>
                      <meta itemProp="priceCurrency" content={p.currency} />
                      <meta itemProp="availability" content="https://schema.org/InStock" />
                    </p>
                  </div>

                  <Link
                    href={`/shop/${p.id}`}
                    className="group/btn mt-6 inline-flex items-center justify-between border-t border-border pt-4 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:text-muted"
                  >
                    <span>Purchase</span>
                    <span className="transition-transform duration-500 ease-out group-hover/btn:translate-x-1">
                      →
                    </span>
                  </Link>
                </article>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
