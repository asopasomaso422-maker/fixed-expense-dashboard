import { products } from "@/constants/products";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amyballet.jp";

export default function SchemaOrg() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: "Amy Odonoghue",
        alternateName: ["エイミー", "Amy Ballet", "エイミー バレエ"],
        url: SITE_URL,
        image: `${SITE_URL}/about-main.jpg`,
        description:
          "東京を拠点に活動するバレエダンサー。3歳からクラシックバレエを始め、舞台・撮影・バレエ指導の現場で活動。Ballet dancer based in Tokyo, active in stage performance, editorial photography, and teaching since age 3.",
        jobTitle: "Ballet Dancer",
        knowsAbout: [
          "クラシックバレエ",
          "バレエ教育",
          "舞台芸術",
          "エディトリアル撮影",
          "Classical Ballet",
          "Ballet Teaching",
        ],
        sameAs: [
          "https://www.instagram.com/amyodsan/",
          "https://www.instagram.com/amy_ballet_sensei/",
          "https://www.youtube.com/@balletaod2804",
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tokyo",
          addressCountry: "JP",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "general",
          email: "amyodonoghue1121@gmail.com",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Ballet class with Amy",
        description:
          "東京を拠点に活動するバレエダンサー・Amyの公式サイト。プライベートバレエレッスン開講中。",
        publisher: { "@id": `${SITE_URL}/#person` },
        inLanguage: ["ja", "en"],
      },
      {
        "@type": "ItemList",
        name: "Amy Ballet Shop",
        description:
          "舞台と日常をつなぐ、Amy Balletのオリジナルコレクション。",
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: p.subtitle ?? p.name,
            image: p.image,
            brand: { "@type": "Brand", name: "Amy Ballet" },
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: p.currency,
              availability: "https://schema.org/InStock",
              url: `${SITE_URL}/shop/${p.id}`,
              seller: { "@id": `${SITE_URL}/#person` },
            },
          },
        })),
      },
    ],
  };

  const safeJson = JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(new RegExp("\u2028", "g"), "\\u2028")
    .replace(new RegExp("\u2029", "g"), "\\u2029");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
