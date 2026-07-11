import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthFormShell
      title="Create account"
      footer={{ prompt: "Already have an account?", linkLabel: "Sign in", href: "/login" }}
    >
      <RegisterForm />
    </AuthFormShell>
  );
}
