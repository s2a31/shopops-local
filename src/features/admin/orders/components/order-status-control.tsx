"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABELS } from "@/features/orders/constants";
import { ADMIN_STATUS_TRANSITIONS } from "@/features/orders/transitions";
import type { AdminOrderDetail } from "@/server/services/admin.service";

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

/**
 * Offers only the transitions the status machine allows; the server validates
 * again and 409s if the order changed in the meantime.
 */
export function OrderStatusControl({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const options = ADMIN_STATUS_TRANSITIONS[status];
  const [next, setNext] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (nextStatus: OrderStatus) =>
      apiFetch<AdminOrderDetail>(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      }),
    onSuccess: (order) => {
      toast.success(`${order.orderNumber} is now ${ORDER_STATUS_LABELS[order.status]}.`);
      setNext("");
      router.refresh();
    },
  });

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ORDER_STATUS_LABELS[status]} is a final state — no further transitions.
      </p>
    );
  }

  const selectId = `order-status-${orderId}`;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!next) return;
        setError(null);
        try {
          await mutation.mutateAsync(next);
        } catch (submitError) {
          setError(
            submitError instanceof ApiError
              ? submitError.message
              : "Something went wrong. Please try again.",
          );
          router.refresh();
        }
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={selectId}>Change status for order {orderNumber}</Label>
          <select
            id={selectId}
            value={next}
            onChange={(event) => setNext(event.target.value as OrderStatus | "")}
            className={selectClass}
          >
            <option value="">Pick the next status…</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {ORDER_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!next || mutation.isPending}>
          {mutation.isPending ? "Applying…" : "Apply"}
        </Button>
      </div>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
