import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <span className="sr-only" role="status">
        Loading products…
      </span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-6 h-24 w-full rounded-xl" />
      <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
