import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ご注文完了",
};

export default function ShopSuccessPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-muted">
        — Order Complete —
      </p>
      <h1 className="font-serif text-[clamp(2.5rem,6vw,4rem)] font-light leading-[1.05]">
        Thank <em className="italic">you</em>
      </h1>
      <p className="mt-8 max-w-sm text-sm font-light leading-relaxed text-foreground/70">
        ご注文ありがとうございます。<br />
        確認メールをお送りしましたのでご確認ください。
      </p>
      <div className="mt-8 max-w-sm space-y-4 border border-border p-6 text-left text-[13px] font-light leading-relaxed text-foreground/70">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted">通常配送</p>
          <p>発送は1週間以内を予定しております。</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted">スタジオ受け取り</p>
          <p>受け取り日程についてはAmyより後日ご連絡いたします。</p>
        </div>
      </div>
      <Link
        href="/#shop"
        className="mt-12 inline-flex border border-foreground px-10 py-4 text-[11px] uppercase tracking-[0.35em] transition-colors hover:bg-foreground hover:text-background"
      >
        ショップへ戻る
      </Link>
    </div>
  );
}
