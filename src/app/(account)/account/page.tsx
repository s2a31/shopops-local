import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/guards";

import { LogoutButton } from "@/features/auth/components/logout-button";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  // The layout guard guarantees a user here.
  const user = (await getCurrentUser())!;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-medium text-zinc-600">Name</dt>
        <dd>{user.name}</dd>
        <dt className="font-medium text-zinc-600">Email</dt>
        <dd>{user.email}</dd>
      </dl>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
