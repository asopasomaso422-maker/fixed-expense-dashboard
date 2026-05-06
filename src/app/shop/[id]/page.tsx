import { notFound } from "next/navigation";
import { products, formatPrice } from "@/constants/products";
import type { Metadata } from "next";
import PurchaseClient from "./PurchaseClient";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} — ${formatPrice(product.price, product.currency)}`,
  };
}

export default async function ShopProductPage({ params }: Props) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return <PurchaseClient productId={id} />;
}
