import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductCard } from "@/features/catalog/components/product-card";
import { listCategories, listFeaturedProducts } from "@/server/services/catalog.service";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([listFeaturedProducts(4), listCategories()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border bg-card px-6 py-14 text-center sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everyday gear, demonstrated properly.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          ShopOps Local is a fully working demo storefront — browse the catalogue, fill a cart, and
          check out with simulated payments. Nothing real is sold.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="mt-12">
        <h2 id="featured-heading" className="text-xl font-semibold tracking-tight">
          New arrivals
        </h2>
        <ul className="mt-4 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="categories-heading" className="mt-12">
        <h2 id="categories-heading" className="text-xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <ul className="mt-4 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Card className="relative transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {category.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {category.description} ({category._count.products} products)
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
