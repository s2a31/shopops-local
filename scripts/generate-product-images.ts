/**
 * Generates the committed product artwork under public/images/products/.
 *
 * Every image is created locally by this script — nothing is downloaded, so there
 * is no third-party licensing to worry about. The compositions are deterministic
 * (derived from the product slug), so re-running the script reproduces identical
 * files. Run with: pnpm images:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { gallerySlugs, seedProducts } from "../prisma/seed-data";

const OUT_DIR = join(import.meta.dirname, "..", "public", "images", "products");

/** FNV-1a — small, deterministic string hash. */
function hashSlug(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function svgFor(slug: string): string {
  const h = hashSlug(slug);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  // Deterministic layout parameters derived from separate hash bits.
  const cx = 240 + ((h >> 3) % 320);
  const cy = 200 + ((h >> 7) % 200);
  const r = 110 + ((h >> 11) % 70);
  const rectW = 180 + ((h >> 13) % 160);
  const rectH = 120 + ((h >> 17) % 120);
  const rectX = 120 + ((h >> 19) % 280);
  const rectY = 140 + ((h >> 23) % 180);
  const rotate = -18 + ((h >> 5) % 36);
  const ringR = 60 + ((h >> 9) % 50);
  const ringX = 560 - ((h >> 15) % 240);
  const ringY = 160 + ((h >> 21) % 240);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 60% 92%)"/>
      <stop offset="1" stop-color="hsl(${hue} 45% 82%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="24"
        fill="hsl(${hue2} 45% 62%)" opacity="0.85"
        transform="rotate(${rotate} ${rectX + rectW / 2} ${rectY + rectH / 2})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue} 55% 52%)" opacity="0.9"/>
  <circle cx="${ringX}" cy="${ringY}" r="${ringR}" fill="none"
          stroke="hsl(${hue2} 50% 96%)" stroke-width="14" opacity="0.9"/>
  <circle cx="${(cx + ringX) / 2}" cy="${(cy + ringY) / 2}" r="14"
          fill="hsl(${hue2} 55% 30%)" opacity="0.7"/>
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });

const slugs = [...seedProducts.map((p) => p.slug), ...gallerySlugs];
for (const slug of slugs) {
  writeFileSync(join(OUT_DIR, `${slug}.svg`), svgFor(slug));
}

console.log(`Generated ${slugs.length} SVG images in ${OUT_DIR}`);
