import { InstagramIcon, YoutubeIcon, MailIcon, LineIcon } from "./icons/BrandIcons";
import Link from "next/link";
import TrackedLink from "./TrackedLink";

const nav = [
  { label: "About", href: "#about" },
  { label: "Lessons", href: "#lessons" },
  { label: "Shop", href: "#shop" },
  { label: "Studio", href: "#studio" },
  { label: "Podcast", href: "#activities" },
];

const legal = [
  { label: "特定商取引法に基づく表記", href: "/legal/tokushoho" },
  { label: "プライバシーポリシー", href: "/legal/privacy" },
  { label: "利用規約", href: "/legal/terms" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-4xl font-light leading-none md:text-5xl">
              Ballet class with <em className="italic">Amy</em>
            </p>
            <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-foreground/70">
              バレエを中心に、ライフスタイルと表現を綴るエディトリアルサイト。
              ご連絡・お仕事のご依頼はLINEまたはメールにて承っております。
            </p>

            <nav
              className="mt-10 flex items-center gap-6"
              aria-label="ソーシャルリンク"
            >
              <TrackedLink
                href="https://www.instagram.com/amyodsan/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (@amyodsan)"
                eventName="social_click"
                eventParams={{ platform: "Instagram", account: "amyodsan" }}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                <InstagramIcon className="h-5 w-5" />
              </TrackedLink>
              <TrackedLink
                href="https://www.youtube.com/@balletaod2804/featured"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                eventName="social_click"
                eventParams={{ platform: "YouTube" }}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                <YoutubeIcon className="h-5 w-5" />
              </TrackedLink>
              <TrackedLink
                href="https://line.me/R/ti/p/@038wyqas?ts=07251906&oat_content=url"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="公式LINE"
                eventName="contact_click"
                eventParams={{ method: "LINE", location: "footer" }}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                <LineIcon className="h-5 w-5" />
              </TrackedLink>
              <TrackedLink
                href="https://mail.google.com/mail/?view=cm&fs=1&to=amyodonoghue1121@gmail.com&su=お問い合わせ"
                aria-label="メールで問い合わせる"
                eventName="contact_click"
                eventParams={{ method: "email", location: "footer" }}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                <MailIcon className="h-5 w-5" />
              </TrackedLink>
            </nav>
          </div>

          <div className="md:col-span-3 md:col-start-7">
            <p className="mb-6 text-[11px] uppercase tracking-[0.3em] text-muted">
              Navigate
            </p>
            <ul className="space-y-3 text-sm font-light">
              {nav.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="mb-6 text-[11px] uppercase tracking-[0.3em] text-muted">
              Legal
            </p>
            <ul className="space-y-3 text-sm font-light">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-start justify-between gap-6 border-t border-border pt-10 md:flex-row md:items-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            © {new Date().getFullYear()} Amy Ballet — All rights reserved.
          </p>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Crafted in Tokyo
          </p>
        </div>
      </div>
    </footer>
  );
}
