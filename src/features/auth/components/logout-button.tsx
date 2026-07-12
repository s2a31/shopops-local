"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setPending(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleLogout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
