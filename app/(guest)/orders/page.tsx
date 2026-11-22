import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/components/guest/OrdersView";

export const metadata: Metadata = { title: "My order" };
export const instant = false;

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersView />
    </Suspense>
  );
}
