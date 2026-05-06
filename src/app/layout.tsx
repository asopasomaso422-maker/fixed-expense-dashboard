import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import SchemaOrg from "@/components/SchemaOrg";
import Analytics from "@/components/Analytics";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amyballet.jp";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ballet class with Amy",
    template: "%s | Ballet class with Amy",
  },
  description:
    "東京を拠点に活動するバレエダンサー・Amyの公式サイト。ワガノワバレエアカデミー卒業、ロシア国立チャイコフスキー記念バレエ団元団員。プライベートバレエレッスン開講中。",
  keywords: [
    "バレエ",
    "バレエダンサー",
    "東京",
    "クラシックバレエ",
    "Ballet class with Amy",
    "バレエレッスン",
    "プライベートレッスン",
    "ワガノワ",
    "ballet class Tokyo",
    "エイミー",
  ],
  authors: [{ name: "Amy Odonoghue", url: SITE_URL }],
  creator: "Amy Odonoghue",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: "Ballet class with Amy",
    title: "Ballet class with Amy",
    description:
      "東京を拠点に活動するバレエダンサー・Amyの公式サイト。プライベートバレエレッスン開講中。",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ballet class with Amy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ballet class with Amy",
    description:
      "東京を拠点に活動するバレエダンサー・Amyの公式サイト。プライベートバレエレッスン開講中。",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <SchemaOrg />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
