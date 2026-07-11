import type { Metadata } from "next";

import { DashboardSummaryCards } from "@/features/admin/dashboard/components/dashboard-summary";
import { getDashboardSummary } from "@/server/services/admin.service";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <DashboardSummaryCards summary={summary} />
    </div>
  );
}
