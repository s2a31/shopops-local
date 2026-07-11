import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <span className="sr-only" role="status">
        Loading admin page…
      </span>
      <Skeleton className="h-8 w-44" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
