import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/guards";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { CartButton } from "@/features/cart/components/cart-button";
import { CartDrawer } from "@/features/cart/components/cart-drawer";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold tracking-tight whitespace-nowrap">
            ShopOps Local
          </Link>
          <nav aria-label="Main">
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/products"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Products
                </Link>
              </li>
              {user?.role === "ADMIN" && (
                <li>
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Admin
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CartButton />
          {user ? (
            <UserMenu name={user.name} />
          ) : (
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      <CartDrawer />
    </header>
  );
}
