import type { Metadata } from "next";
import { Suspense } from "react";
import { OffersView } from "@/components/guest/OffersView";

export const metadata: Metadata = { title: "Offers" };
export const instant = false;

export default function OffersPage() {
  return (
    <Suspense fallback={null}>
      <OffersView />
    </Suspense>
  );
}
