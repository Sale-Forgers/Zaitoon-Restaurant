import type { Metadata } from "next";
import { DemoStudio } from "@/components/pitch/DemoStudio";

export const metadata: Metadata = {
  title: "Demo Studio",
  description: "The guest's phone, the kitchen display and the waiter app, live side by side.",
};

// The studio is a client-only screen made of live frames, so navigating into it
// is allowed to show its loading splash first (Next 16 instant-navigation check).
export const instant = false;

export default function DemoPage() {
  return <DemoStudio />;
}
