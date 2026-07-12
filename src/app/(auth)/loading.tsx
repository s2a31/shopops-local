import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12"
    >
      <span className="sr-only" role="status">
        Loading page…
      </span>
      <Skeleton className="h-8 w-36" />
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}
