/**
 * Idempotent seed for ShopOps Local. Wipes all rows and rebuilds a deterministic
 * demo dataset, so running it twice always produces the same state.
 *
 * Profiles (SEED_PROFILE env var):
 *   dev (default) — full demo catalogue, accounts, and fixture orders
 *   e2e           — same, plus fixed-state fixtures the E2E suite depends on
 *                   (e.g. exactly one unit of the Prism Accent Spotlight)
 *
 * Demo credentials are documented in the README. They are local demonstration
 * accounts only — this project has no real secrets anywhere.
 */
import {
  InventoryReason,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  Role,
} from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { calculateLineTotalCents, calculateShippingCents } from "../src/lib/money";
import { productImageAlt, productImagePath, seedCategories, seedProducts } from "./seed-data";

const prisma = new PrismaClient();

const profile = process.env.SEED_PROFILE === "e2e" ? "e2e" : "dev";

/** Slug of the product the E2E suite pins to exactly one unit of stock. */
const E2E_SINGLE_UNIT_SLUG = "prism-accent-spotlight";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  password: string;
  createdDaysAgo: number;
  address: { street: string; city: string; postalCode: string; country: string };
}

const users: SeedUser[] = [
  {
    email: "admin@shopops.local",
    name: "Demo Admin",
    role: Role.ADMIN,
    password: "DemoAdmin123!",
    createdDaysAgo: 60,
    address: { street: "Fő utca 1", city: "Budapest", postalCode: "1011", country: "Hungary" },
  },
  {
    email: "customer@shopops.local",
    name: "Demo Customer",
    role: Role.CUSTOMER,
    password: "DemoCustomer123!",
    createdDaysAgo: 45,
    address: { street: "Váci utca 12", city: "Budapest", postalCode: "1052", country: "Hungary" },
  },
  {
    email: "mia@shopops.local",
    name: "Mia Farkas",
    role: Role.CUSTOMER,
    password: "DemoCustomer123!",
    createdDaysAgo: 40,
    address: { street: "Kossuth tér 4", city: "Debrecen", postalCode: "4024", country: "Hungary" },
  },
  {
    email: "daniel@shopops.local",
    name: "Dániel Szabó",
    role: Role.CUSTOMER,
    password: "DemoCustomer123!",
    createdDaysAgo: 35,
    address: { street: "Dugonics tér 2", city: "Szeged", postalCode: "6720", country: "Hungary" },
  },
  {
    email: "zoe@shopops.local",
    name: "Zoé Nagy",
    role: Role.CUSTOMER,
    password: "DemoCustomer123!",
    createdDaysAgo: 30,
    address: { street: "Széchenyi utca 8", city: "Győr", postalCode: "9021", country: "Hungary" },
  },
  {
    email: "adam@shopops.local",
    name: "Ádám Tóth",
    role: Role.CUSTOMER,
    password: "DemoCustomer123!",
    createdDaysAgo: 25,
    address: { street: "Zsolnay út 16", city: "Pécs", postalCode: "7625", country: "Hungary" },
  },
];

interface SeedOrder {
  customerEmail: string;
  daysAgo: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  items: { slug: string; quantity: number }[];
}

// Fixture orders. The demo customer gets one of each interesting state
// (delivered, cancellable, cancelled); the rest build dashboard history.
const orders: SeedOrder[] = [
  {
    customerEmail: "customer@shopops.local",
    daysAgo: 20,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [
      { slug: "cascade-ceramic-dripper", quantity: 1 },
      { slug: "ember-mug-duo", quantity: 2 },
    ],
  },
  {
    customerEmail: "customer@shopops.local",
    daysAgo: 2,
    status: OrderStatus.PLACED,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    items: [{ slug: "summit-insulated-bottle", quantity: 1 }],
  },
  {
    customerEmail: "customer@shopops.local",
    daysAgo: 10,
    status: OrderStatus.CANCELLED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [{ slug: "quill-mechanical-keyboard", quantity: 1 }],
  },
  {
    customerEmail: "mia@shopops.local",
    daysAgo: 28,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [
      { slug: "alba-chefs-knife", quantity: 1 },
      { slug: "mist-oil-sprayer", quantity: 2 },
    ],
  },
  {
    customerEmail: "daniel@shopops.local",
    daysAgo: 26,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    items: [{ slug: "halo-desk-lamp", quantity: 1 }],
  },
  {
    customerEmail: "zoe@shopops.local",
    daysAgo: 24,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [{ slug: "pulse-earbuds", quantity: 1 }],
  },
  {
    customerEmail: "adam@shopops.local",
    daysAgo: 21,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [
      { slug: "trailhead-daypack", quantity: 1 },
      { slug: "compass-enamel-mug-set", quantity: 2 },
    ],
  },
  {
    customerEmail: "mia@shopops.local",
    daysAgo: 17,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    items: [{ slug: "firefly-string-lights", quantity: 3 }],
  },
  {
    customerEmail: "daniel@shopops.local",
    daysAgo: 14,
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [{ slug: "cadence-over-ear-headphones", quantity: 1 }],
  },
  {
    customerEmail: "zoe@shopops.local",
    daysAgo: 11,
    status: OrderStatus.SHIPPED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [
      { slug: "atlas-laptop-stand", quantity: 1 },
      { slug: "anchor-cable-kit", quantity: 2 },
    ],
  },
  {
    customerEmail: "adam@shopops.local",
    daysAgo: 7,
    status: OrderStatus.SHIPPED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [{ slug: "northwind-hammock", quantity: 1 }],
  },
  {
    customerEmail: "mia@shopops.local",
    daysAgo: 5,
    status: OrderStatus.PROCESSING,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    items: [
      { slug: "nimbus-salad-spinner", quantity: 1 },
      { slug: "copperline-measuring-set", quantity: 1 },
    ],
  },
  {
    customerEmail: "daniel@shopops.local",
    daysAgo: 1,
    status: OrderStatus.PLACED,
    paymentMethod: PaymentMethod.SIMULATED_CARD,
    items: [{ slug: "reverb-mini-speaker", quantity: 1 }],
  },
];

function paymentStatusFor(order: SeedOrder): PaymentStatus {
  if (order.paymentMethod === PaymentMethod.SIMULATED_CARD) {
    return order.status === OrderStatus.CANCELLED ? PaymentStatus.REFUNDED : PaymentStatus.PAID;
  }
  // Cash on delivery is paid when (and only when) the order was delivered.
  return order.status === OrderStatus.DELIVERED ? PaymentStatus.PAID : PaymentStatus.PENDING;
}

async function nextOrderNumber(): Promise<string> {
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq')`;
  const value = rows[0]?.nextval;
  if (value === undefined) throw new Error("order_number_seq returned no value");
  return `SO-${String(Number(value)).padStart(6, "0")}`;
}

async function main() {
  console.log(`Seeding (profile: ${profile}) …`);

  // Full wipe in FK dependency order, then a deterministic rebuild.
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "order_number_seq" RESTART WITH 1042`);

  // Users (two distinct demo passwords; hash each once and reuse).
  const passwordHashes = new Map<string, string>();
  for (const password of new Set(users.map((u) => u.password))) {
    passwordHashes.set(password, await hashPassword(password));
  }
  const userIdByEmail = new Map<string, string>();
  for (const user of users) {
    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: passwordHashes.get(user.password)!,
        createdAt: daysAgo(user.createdDaysAgo),
      },
    });
    userIdByEmail.set(user.email, created.id);
  }
  const adminId = userIdByEmail.get("admin@shopops.local")!;

  // Categories.
  const categoryIdBySlug = new Map<string, string>();
  for (const category of seedCategories) {
    const created = await prisma.category.create({ data: category });
    categoryIdBySlug.set(category.slug, created.id);
  }

  // How many units each product sold across non-cancelled orders. Cancelled
  // orders net to zero in the ledger (ORDER_PLACED − then ORDER_CANCELLED +).
  const soldQty = new Map<string, number>();
  for (const order of orders) {
    if (order.status === OrderStatus.CANCELLED) continue;
    for (const item of order.items) {
      soldQty.set(item.slug, (soldQty.get(item.slug) ?? 0) + item.quantity);
    }
  }

  // Products, their artwork, and an INITIAL_STOCK ledger entry sized so that
  // stockQuantity always equals the sum of the product's adjustment deltas.
  const productIdBySlug = new Map<string, string>();
  const priceBySlug = new Map<string, number>();
  const nameBySlug = new Map<string, string>();
  for (const product of seedProducts) {
    const finalStock =
      profile === "e2e" && product.slug === E2E_SINGLE_UNIT_SLUG ? 1 : product.stock;
    const initialStock = finalStock + (soldQty.get(product.slug) ?? 0);
    const created = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        stockQuantity: finalStock,
        categoryId: categoryIdBySlug.get(product.categorySlug)!,
        createdAt: daysAgo(40),
        images: {
          create: {
            url: productImagePath(product.slug),
            altText: productImageAlt(product.name),
            sortOrder: 0,
          },
        },
        inventoryAdjustments: {
          create: {
            delta: initialStock,
            reason: InventoryReason.INITIAL_STOCK,
            actorUserId: adminId,
            note: "Initial stock",
            createdAt: daysAgo(40),
          },
        },
      },
    });
    productIdBySlug.set(product.slug, created.id);
    priceBySlug.set(product.slug, product.priceCents);
    nameBySlug.set(product.slug, product.name);
  }

  // Orders with price/name snapshots and matching inventory ledger entries.
  let simRef = 0;
  for (const order of orders) {
    const user = users.find((u) => u.email === order.customerEmail)!;
    const createdAt = daysAgo(order.daysAgo);
    const items = order.items.map((item) => {
      const unitPriceCents = priceBySlug.get(item.slug)!;
      return {
        productId: productIdBySlug.get(item.slug)!,
        productName: nameBySlug.get(item.slug)!,
        unitPriceCents,
        quantity: item.quantity,
        lineTotalCents: calculateLineTotalCents(unitPriceCents, item.quantity),
      };
    });
    const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const shippingCents = calculateShippingCents(subtotalCents);
    const paymentStatus = paymentStatusFor(order);

    const created = await prisma.order.create({
      data: {
        orderNumber: await nextOrderNumber(),
        userId: userIdByEmail.get(order.customerEmail)!,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus,
        paymentRef:
          order.paymentMethod === PaymentMethod.SIMULATED_CARD
            ? `SIM-SEED${String(++simRef).padStart(2, "0")}`
            : null,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
        shippingName: user.name,
        shippingStreet: user.address.street,
        shippingCity: user.address.city,
        shippingPostalCode: user.address.postalCode,
        shippingCountry: user.address.country,
        cancelledAt: order.status === OrderStatus.CANCELLED ? daysAgo(order.daysAgo - 1) : null,
        createdAt,
        items: { create: items },
      },
    });

    await prisma.inventoryAdjustment.createMany({
      data: order.items.flatMap((item) => {
        const productId = productIdBySlug.get(item.slug)!;
        const placed = {
          productId,
          delta: -item.quantity,
          reason: InventoryReason.ORDER_PLACED,
          orderId: created.id,
          createdAt,
        };
        if (order.status !== OrderStatus.CANCELLED) return [placed];
        return [
          placed,
          {
            productId,
            delta: item.quantity,
            reason: InventoryReason.ORDER_CANCELLED,
            orderId: created.id,
            createdAt: daysAgo(order.daysAgo - 1),
          },
        ];
      }),
    });
  }

  // Sanity check: the ledger invariant must hold for every product.
  const mismatches = await prisma.$queryRaw<{ slug: string }[]>`
    SELECT p."slug"
    FROM "Product" p
    LEFT JOIN "InventoryAdjustment" a ON a."productId" = p."id"
    GROUP BY p."id"
    HAVING p."stockQuantity" <> COALESCE(SUM(a."delta"), 0)
  `;
  if (mismatches.length > 0) {
    throw new Error(`Inventory ledger mismatch for: ${mismatches.map((m) => m.slug).join(", ")}`);
  }

  const [userCount, productCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  console.log(
    `Seeded ${userCount} users, ${seedCategories.length} categories, ` +
      `${productCount} products, ${orderCount} orders (profile: ${profile}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
