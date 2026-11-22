import type { Metadata } from "next";
import { MenuView } from "@/components/guest/MenuView";

export const metadata: Metadata = { title: "Menu" };
export const instant = false;

export default function MenuPage() {
  return <MenuView />;
}
