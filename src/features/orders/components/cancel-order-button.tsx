"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelOrderButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const cancel = useMutation({
    mutationFn: () => apiFetch(`/api/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success(`Order ${orderNumber} cancelled. The items are back in stock.`);
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      );
      setOpen(false);
      // The order may have moved on (e.g. an admin started processing) — show
      // its real state instead of a stale "cancellable" view.
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Cancel order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order {orderNumber}?</DialogTitle>
          <DialogDescription>
            The reserved items go back into stock, and a paid simulated-card payment is flagged as
            refunded. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={cancel.isPending}>
            Keep order
          </Button>
          <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {cancel.isPending ? "Cancelling…" : "Cancel order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
