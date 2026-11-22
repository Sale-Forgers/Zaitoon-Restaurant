import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Panel",
  robots: { index: false, follow: false },
};

// The admin area renders in the browser after the PIN check, so there is nothing
// for Next.js to prerender: opt out of instant-navigation validation.
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
