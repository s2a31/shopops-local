import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-app paths are allowed as post-login targets (no open redirects). */
function safeNextPath(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  if (user) redirect(nextPath);

  return (
    <AuthFormShell
      title="Sign in"
      footer={{
        prompt: "New to ShopOps Local?",
        linkLabel: "Create an account",
        href: "/register",
      }}
    >
      <LoginForm nextPath={nextPath} />
    </AuthFormShell>
  );
}
