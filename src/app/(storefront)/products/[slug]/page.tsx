import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/money";

import { Badge } from "@/components/ui/badge";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import { getProductBySlug } from "@/server/services/catalog.service";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? product.name : "Product not found" };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const image = product.images[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/products" className="hover:text-foreground hover:underline">
              Products
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground hover:underline"
            >
              {product.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border bg-muted">
          {image && (
            <Image
              src={image.url}
              alt={image.altText}
              width={800}
              height={600}
              priority
              className="size-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <StockBadge product={product} />
          </div>

          <p className="text-3xl font-semibold">{formatMoney(product.priceCents)}</p>

          <p className="text-muted-foreground">{product.description}</p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{product.category.name}</Badge>
            {product.priceCents >= FREE_SHIPPING_THRESHOLD_CENTS && (
              <Badge variant="secondary">Free shipping</Badge>
            )}
          </div>

          {/* Add-to-cart arrives with the cart milestone (M6). */}
        </div>
      </div>
    </div>
  );
}
