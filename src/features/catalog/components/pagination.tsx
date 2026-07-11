import Link from "next/link";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a given page, preserving all other filters. */
  hrefFor: (page: number) => string;
}

/** Real links (shareable, back-button-safe), with aria-current on the active page. */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" className="px-3 py-2 text-sm text-muted-foreground/50">
          Previous
        </span>
      )}

      <ul className="flex items-center gap-1">
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium hover:bg-muted",
                p === page && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {p}
            </Link>
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Next
        </Link>
      ) : (
        <span aria-hidden="true" className="px-3 py-2 text-sm text-muted-foreground/50">
          Next
        </span>
      )}
    </nav>
  );
}
