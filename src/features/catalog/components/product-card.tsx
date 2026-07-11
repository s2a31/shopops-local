import Image from "next/image";
import Link from "next/link";

import { formatMoney } from "@/lib/money";

import { StockBadge } from "@/features/catalog/components/stock-badge";
import type { ProductListItem } from "@/server/services/catalog.service";

export function ProductCard({ product }: { product: ProductListItem }) {
  const image = product.images[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="aspect-4/3 overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText}
            width={800}
            height={600}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div aria-hidden="true" className="size-full" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-medium">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="font-semibold">{formatMoney(product.priceCents)}</p>
          <StockBadge product={product} />
        </div>
      </div>
    </article>
  );
}
