"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { trackEvent } from "@/lib/analytics";

const LINE_URL =
  "https://line.me/R/ti/p/@038wyqas?ts=07251906&oat_content=url";

const nav = [
  { label: "About", href: "#about" },
  { label: "Lessons", href: "#lessons" },
  { label: "Shop", href: "#shop" },
  { label: "Studio", href: "#studio" },
  { label: "Podcast", href: "#activities" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const isLight = scrolled || menuOpen;

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-all duration-700",
          isLight
            ? "bg-background/95 backdrop-blur-md border-b border-border"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <a
            href="#hero"
            onClick={close}
            className={clsx(
              "font-serif text-xl font-light transition-colors duration-500 md:text-2xl",
              isLight ? "text-foreground" : "text-white"
            )}
          >
            Ballet class with <em className="italic">Amy</em>
          </a>

          {/* デスクトップ nav */}
          <nav className="hidden items-center gap-10 md:flex" aria-label="メインナビゲーション">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={clsx(
                  "text-[11px] uppercase tracking-[0.3em] transition-colors duration-500",
                  scrolled
                    ? "text-foreground/70 hover:text-foreground"
                    : "text-white/70 hover:text-white"
                )}
              >
                {n.label}
              </a>
            ))}
            <a
              href={LINE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("contact_click", { method: "LINE", location: "header" })}
              className={clsx(
                "border px-4 py-2 text-[11px] uppercase tracking-[0.3em] transition-colors duration-500",
                scrolled
                  ? "border-foreground/30 text-foreground/70 hover:border-foreground hover:text-foreground"
                  : "border-white/40 text-white/70 hover:border-white hover:text-white"
              )}
            >
              LINE
            </a>
          </nav>

          {/* モバイルハンバーガー */}
          <button
            className="p-1 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="flex flex-col gap-[5px]">
              <span
                className={clsx(
                  "block h-[1.5px] w-6 transition-all duration-300 origin-center",
                  isLight ? "bg-foreground" : "bg-white",
                  menuOpen && "translate-y-[7px] rotate-45"
                )}
              />
              <span
                className={clsx(
                  "block h-[1.5px] w-6 transition-all duration-300",
                  isLight ? "bg-foreground" : "bg-white",
                  menuOpen && "opacity-0"
                )}
              />
              <span
                className={clsx(
                  "block h-[1.5px] w-6 transition-all duration-300 origin-center",
                  isLight ? "bg-foreground" : "bg-white",
                  menuOpen && "-translate-y-[7px] -rotate-45"
                )}
              />
            </span>
          </button>
        </div>
      </header>

      {/* モバイルメニュー */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={clsx(
          "fixed inset-x-0 top-0 z-40 flex flex-col bg-background px-8 pb-12 pt-28 transition-all duration-500 md:hidden",
          menuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-3"
        )}
      >
        <nav className="flex flex-col gap-8" aria-label="モバイルナビゲーション">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={close}
              className="font-serif text-4xl font-light text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-10">
          <a
            href={LINE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackEvent("contact_click", { method: "LINE", location: "mobile_menu" });
              close();
            }}
            className="flex items-center justify-center border border-foreground py-4 text-[11px] uppercase tracking-[0.3em] text-foreground"
          >
            公式LINEでお問い合わせ
          </a>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=amyodonoghue1121@gmail.com&su=お問い合わせ"
            onClick={() => {
              trackEvent("contact_click", { method: "email", location: "mobile_menu" });
              close();
            }}
            className="text-center text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
          >
            amyodonoghue1121@gmail.com
          </a>
        </div>
      </div>
    </>
  );
}
