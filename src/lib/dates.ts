const formatter = new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" });

/** The single entry point for displaying dates, e.g. "11 Jul 2026". */
export function formatDate(date: Date): string {
  return formatter.format(date);
}
