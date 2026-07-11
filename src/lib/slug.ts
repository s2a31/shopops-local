/**
 * URL-safe slug from a human name: "Café Crème 2" → "cafe-creme-2".
 *
 * NFKD splits accented letters into base letter + combining marks, and every
 * combining mark (Unicode category M) is dropped — so composed and decomposed
 * inputs produce the same slug. Letters without an ASCII decomposition
 * (ß, æ, Cyrillic, CJK, …) fall through to the hyphen replacement; a name made
 * only of those yields "" and the caller must ask for an explicit slug.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
