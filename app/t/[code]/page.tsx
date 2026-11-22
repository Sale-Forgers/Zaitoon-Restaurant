import type { Metadata } from "next";
import { Suspense } from "react";
import { Splash } from "@/components/brand";
import { Entry } from "@/components/guest/Entry";
import { ClientOnly, ToastProvider } from "@/components/ui";

export const metadata: Metadata = { title: "Welcome" };
export const instant = false;

/** The address inside every table's QR code and NFC tag: /t/<table code>. */
export default function TableEntryPage() {
  return (
    <Suspense fallback={<Splash />}>
      <ClientOnly fallback={<Splash />}>
        <ToastProvider>
          <Entry />
        </ToastProvider>
      </ClientOnly>
    </Suspense>
  );
}
