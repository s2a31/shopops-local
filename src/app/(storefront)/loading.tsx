import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <span className="sr-only" role="status">
        Loading page…
      </span>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
