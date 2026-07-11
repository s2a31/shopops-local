/**
 * Deterministic demo catalogue for ShopOps Local. All product names are invented;
 * all prices are integer EUR cents. Stock levels deliberately include four
 * low-stock products (≤ 5) and two out-of-stock products so admin dashboards and
 * storefront stock states have real data to show.
 */

export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export interface SeedProduct {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  stock: number;
  categorySlug: string;
}

export const seedCategories: SeedCategory[] = [
  {
    name: "Coffee & Tea",
    slug: "coffee-tea",
    description: "Brewers, grinders, and everything for a better morning cup.",
    sortOrder: 1,
  },
  {
    name: "Kitchen",
    slug: "kitchen",
    description: "Durable tools and cookware for everyday cooking.",
    sortOrder: 2,
  },
  {
    name: "Home Office",
    slug: "home-office",
    description: "Desk gear that makes working from home comfortable.",
    sortOrder: 3,
  },
  {
    name: "Lighting",
    slug: "lighting",
    description: "Lamps and lights for every room and mood.",
    sortOrder: 4,
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Speakers and headphones with honest sound.",
    sortOrder: 5,
  },
  {
    name: "Outdoor",
    slug: "outdoor",
    description: "Gear for hikes, camps, and long afternoons outside.",
    sortOrder: 6,
  },
];

export const seedProducts: SeedProduct[] = [
  // Coffee & Tea
  {
    name: "Aurora Pour-Over Kettle",
    slug: "aurora-pour-over-kettle",
    description:
      "A gooseneck kettle with a slow, precise spout and a thermometer built into the lid. Holds 900 ml and pours like it costs twice as much.",
    priceCents: 6490,
    stock: 42,
    categorySlug: "coffee-tea",
  },
  {
    name: "Cascade Ceramic Dripper",
    slug: "cascade-ceramic-dripper",
    description:
      "A classic cone dripper in matte ceramic. Spiral ribs keep the paper from sticking so water flows evenly through the bed.",
    priceCents: 2890,
    stock: 55,
    categorySlug: "coffee-tea",
  },
  {
    name: "Ember Mug Duo",
    slug: "ember-mug-duo",
    description:
      "Two double-walled 300 ml mugs that keep coffee hot and hands cool. Dishwasher safe, stackable, and hard to chip.",
    priceCents: 3490,
    stock: 23,
    categorySlug: "coffee-tea",
  },
  {
    name: "Meridian French Press",
    slug: "meridian-french-press",
    description:
      "A one-litre press with a fine dual mesh that keeps sludge out of the cup. Borosilicate glass, brushed steel frame.",
    priceCents: 4290,
    stock: 3,
    categorySlug: "coffee-tea",
  },
  {
    name: "Verdant Loose-Leaf Sampler",
    slug: "verdant-loose-leaf-sampler",
    description:
      "Six 40 g tins of loose-leaf tea: two greens, two blacks, an oolong, and a caffeine-free rooibos. A tour in a box.",
    priceCents: 2490,
    stock: 80,
    categorySlug: "coffee-tea",
  },
  {
    name: "Orbit Electric Grinder",
    slug: "orbit-electric-grinder",
    description:
      "A conical burr grinder with 32 settings from espresso-fine to press-coarse. Quiet, slow-turning motor protects flavour.",
    priceCents: 12900,
    stock: 0,
    categorySlug: "coffee-tea",
  },

  // Kitchen
  {
    name: "Alba Chef's Knife 20 cm",
    slug: "alba-chefs-knife",
    description:
      "A balanced all-rounder in stain-resistant steel with a full tang and a comfortable oak handle. Sharp out of the box.",
    priceCents: 8900,
    stock: 34,
    categorySlug: "kitchen",
  },
  {
    name: "Terra Serving Board",
    slug: "terra-serving-board",
    description:
      "A generous acacia board for bread, cheese, or chopping. Oiled finish, juice groove on the reverse side.",
    priceCents: 4990,
    stock: 18,
    categorySlug: "kitchen",
  },
  {
    name: "Nimbus Salad Spinner",
    slug: "nimbus-salad-spinner",
    description:
      "A one-hand pump spinner that actually dries lettuce. The bowl doubles as a serving bowl, the basket as a colander.",
    priceCents: 2790,
    stock: 66,
    categorySlug: "kitchen",
  },
  {
    name: "Copperline Measuring Set",
    slug: "copperline-measuring-set",
    description:
      "Eight stainless measuring cups and spoons with copper-tone handles, engraved metric and imperial markings.",
    priceCents: 1990,
    stock: 120,
    categorySlug: "kitchen",
  },
  {
    name: "Solstice Cast-Iron Skillet",
    slug: "solstice-cast-iron-skillet",
    description:
      "A 26 cm pre-seasoned skillet that goes from hob to oven to table. Heavy, honest, and effectively immortal.",
    priceCents: 7490,
    stock: 5,
    categorySlug: "kitchen",
  },
  {
    name: "Mist Oil Sprayer",
    slug: "mist-oil-sprayer",
    description:
      "A refillable glass sprayer that lays down a fine, even mist of oil for pans, salads, and roasting trays.",
    priceCents: 1590,
    stock: 47,
    categorySlug: "kitchen",
  },

  // Home Office
  {
    name: "Atlas Laptop Stand",
    slug: "atlas-laptop-stand",
    description:
      "An aluminium stand that lifts your screen 18 cm and holds steady while you type. Folds flat for the bag.",
    priceCents: 5490,
    stock: 38,
    categorySlug: "home-office",
  },
  {
    name: "Quill Mechanical Keyboard",
    slug: "quill-mechanical-keyboard",
    description:
      "A compact 75% keyboard with quiet tactile switches, PBT keycaps, and a metal case. Wired, no software required.",
    priceCents: 15900,
    stock: 12,
    categorySlug: "home-office",
  },
  {
    name: "Drift Ergonomic Mouse",
    slug: "drift-ergonomic-mouse",
    description:
      "A vertical mouse that keeps your wrist at a natural angle. Six buttons, silent clicks, weeks of battery.",
    priceCents: 6990,
    stock: 29,
    categorySlug: "home-office",
  },
  {
    name: "Ledger Desk Organizer",
    slug: "ledger-desk-organizer",
    description:
      "A powder-coated steel caddy with slots for notebooks, pens, phone, and the cables you keep losing.",
    priceCents: 3290,
    stock: 74,
    categorySlug: "home-office",
  },
  {
    name: "Focus Monitor Light Bar",
    slug: "focus-monitor-light-bar",
    description:
      "A screen-top bar that lights your desk, not your display. Adjustable warmth and brightness, USB powered.",
    priceCents: 9900,
    stock: 4,
    categorySlug: "home-office",
  },
  {
    name: "Anchor Cable Kit",
    slug: "anchor-cable-kit",
    description:
      "Twelve weighted clips, sleeves, and ties that keep desk cables where you put them. Works on wood, metal, and glass.",
    priceCents: 1490,
    stock: 118,
    categorySlug: "home-office",
  },

  // Lighting
  {
    name: "Halo Desk Lamp",
    slug: "halo-desk-lamp",
    description:
      "A ring-headed lamp with even, shadow-free light and stepless dimming. Remembers your last setting.",
    priceCents: 7990,
    stock: 26,
    categorySlug: "lighting",
  },
  {
    name: "Lumen Floor Lamp",
    slug: "lumen-floor-lamp",
    description:
      "A slim arc floor lamp with a linen shade and a warm 2700 K glow. Footswitch dimmer on the cord.",
    priceCents: 18900,
    stock: 9,
    categorySlug: "lighting",
  },
  {
    name: "Firefly String Lights",
    slug: "firefly-string-lights",
    description:
      "Ten metres of warm micro-LEDs on a bendable copper wire. Indoor or covered outdoor, with an eight-mode timer.",
    priceCents: 2990,
    stock: 88,
    categorySlug: "lighting",
  },
  {
    name: "Eclipse Bedside Lamp",
    slug: "eclipse-bedside-lamp",
    description:
      "A touch-dimmable globe lamp small enough for a nightstand and warm enough to read by. Optional sunrise alarm.",
    priceCents: 5990,
    stock: 15,
    categorySlug: "lighting",
  },
  {
    name: "Beacon Rechargeable Lantern",
    slug: "beacon-rechargeable-lantern",
    description:
      "A camping lantern with 300 lumens, a 48-hour low mode, and a USB-C port that can top up your phone.",
    priceCents: 4490,
    stock: 2,
    categorySlug: "lighting",
  },
  {
    name: "Prism Accent Spotlight",
    slug: "prism-accent-spotlight",
    description:
      "A small pivoting spotlight for shelves and artwork. Clean beam, no spill, mounts with screws or adhesive.",
    priceCents: 3990,
    stock: 30,
    categorySlug: "lighting",
  },

  // Audio
  {
    name: "Reverb Mini Speaker",
    slug: "reverb-mini-speaker",
    description:
      "A palm-sized Bluetooth speaker with surprising low end and twelve hours of battery. Splash resistant.",
    priceCents: 8990,
    stock: 31,
    categorySlug: "audio",
  },
  {
    name: "Cadence Over-Ear Headphones",
    slug: "cadence-over-ear-headphones",
    description:
      "Closed-back headphones tuned flat, with memory-foam pads and a detachable cable. Comfortable for full workdays.",
    priceCents: 24900,
    stock: 14,
    categorySlug: "audio",
  },
  {
    name: "Pulse Earbuds",
    slug: "pulse-earbuds",
    description:
      "True wireless earbuds with reliable touch controls, four microphones, and a pocketable charging case.",
    priceCents: 12900,
    stock: 40,
    categorySlug: "audio",
  },
  {
    name: "Chorus Bookshelf Pair",
    slug: "chorus-bookshelf-pair",
    description:
      "A pair of compact powered bookshelf speakers with silk tweeters and real stereo width. Line, optical, and Bluetooth in.",
    priceCents: 34900,
    stock: 7,
    categorySlug: "audio",
  },
  {
    name: "Retro FM Radio",
    slug: "retro-fm-radio",
    description:
      "An FM radio in a walnut cabinet with one honest full-range driver and a satisfying analogue tuning wheel.",
    priceCents: 6490,
    stock: 0,
    categorySlug: "audio",
  },
  {
    name: "Stagehand Speaker Stands",
    slug: "stagehand-speaker-stands",
    description:
      "A pair of filled-column steel stands that put bookshelf speakers at ear height and keep vibrations out of the floor.",
    priceCents: 9490,
    stock: 21,
    categorySlug: "audio",
  },

  // Outdoor
  {
    name: "Trailhead Daypack 22 L",
    slug: "trailhead-daypack",
    description:
      "A light, weather-resistant daypack with a ventilated back panel, two bottle pockets, and a rain cover in the lid.",
    priceCents: 11900,
    stock: 27,
    categorySlug: "outdoor",
  },
  {
    name: "Flint Camp Stove",
    slug: "flint-camp-stove",
    description:
      "A fold-flat single-burner stove with a piezo igniter and a wide pot stand. Boils a litre in under four minutes.",
    priceCents: 8490,
    stock: 16,
    categorySlug: "outdoor",
  },
  {
    name: "Summit Insulated Bottle 1 L",
    slug: "summit-insulated-bottle",
    description:
      "Double-walled steel that keeps drinks cold for 24 hours or hot for 12. Wide mouth, leak-proof cap, fits most cages.",
    priceCents: 3490,
    stock: 95,
    categorySlug: "outdoor",
  },
  {
    name: "Meadow Picnic Blanket",
    slug: "meadow-picnic-blanket",
    description:
      "A 200 × 150 cm blanket with a soft top and a waterproof underside. Rolls up with a carry strap and shrugs off crumbs.",
    priceCents: 4990,
    stock: 33,
    categorySlug: "outdoor",
  },
  {
    name: "Compass Enamel Mug Set",
    slug: "compass-enamel-mug-set",
    description:
      "Four 350 ml enamel mugs in campfire colours. Light, tough, and fine over open flame.",
    priceCents: 2690,
    stock: 58,
    categorySlug: "outdoor",
  },
  {
    name: "Northwind Hammock",
    slug: "northwind-hammock",
    description:
      "A parachute-nylon hammock with tree straps and carabiners included. Packs to the size of a grapefruit, holds 200 kg.",
    priceCents: 9990,
    stock: 44,
    categorySlug: "outdoor",
  },
];

/** Extra generic artwork available in the admin image gallery for new products. */
export const gallerySlugs = [
  "gallery-amber",
  "gallery-coast",
  "gallery-meadow",
  "gallery-slate",
  "gallery-dusk",
  "gallery-clay",
];

export function productImagePath(slug: string): string {
  return `/images/products/${slug}.svg`;
}

export function productImageAlt(name: string): string {
  return `Stylized geometric artwork representing the ${name}`;
}
