import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The committed local artwork under public/images/products/ is the only
 * image source in this project — no uploads, no remote URLs. Server-side
 * only (filesystem access); pages pass the list to the client form.
 */
export async function listGalleryImages(): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "images", "products");
  const files = await readdir(dir);
  return files
    .filter((file) => /^[a-z0-9-]+\.(svg|webp)$/.test(file))
    .sort()
    .map((file) => `/images/products/${file}`);
}
