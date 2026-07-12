import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <span className="sr-only" role="status">
        Loading account page…
      </span>
      <Skeleton className="h-8 w-44" />
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
