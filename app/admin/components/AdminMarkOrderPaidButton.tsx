"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handleRes } from "@/lib/response";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAdminAccess } from "./AdminAccessContext";

export default function AdminMarkOrderPaidButton({
  orderId,
  orderNumber,
}: {
  orderId: number;
  orderNumber: string;
}) {
  const { isSuperAdmin } = useAdminAccess();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSuperAdmin) return null;

  const handleMarkPaid = async () => {
    setIsSubmitting(true);

    try {
      await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: "POST",
      }).then(handleRes);
      toast.success(`Order ${orderNumber} marked as paid.`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to manually mark order as paid.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 gap-1.5 border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Manual Paid
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark order as paid?</DialogTitle>
            <DialogDescription>
              Order {orderNumber} will be treated as fully paid. Renewal or
              upgrade orders will immediately update the subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleMarkPaid}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              {isSubmitting ? "Processing..." : "Confirm Paid"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
