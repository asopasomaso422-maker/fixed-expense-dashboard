export type Product = {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  currency: "JPY" | "USD";
  image: string;
  images: string[];
  sizes: string[];
};

export const products: Product[] = [
  {
    id: "original-tee-adult",
    name: "オリジナルTシャツ",
    subtitle: "S / M / L / XL",
    price: 3800,
    currency: "JPY",
    image: "/shop-1.jpg",
    images: ["/shop-1.jpg", "/shop-2.jpg"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "original-tee-kids",
    name: "オリジナルTシャツ（ベビー＆キッズ）",
    subtitle: "90cm ~ 160cm",
    price: 3500,
    currency: "JPY",
    image: "/shop-3.JPG",
    images: ["/shop-3.JPG", "/shop-4.jpg"],
    sizes: ["90cm", "100cm", "110cm", "120cm", "130cm", "140cm", "150cm", "160cm"],
  },
];

export const formatPrice = (price: number, currency: Product["currency"]) => {
  if (currency === "JPY") return `¥${price.toLocaleString("ja-JP")}（税込）`;
  return `$${price.toLocaleString("en-US")}`;
};
