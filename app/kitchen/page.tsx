import type { Metadata } from "next";
import { PrintProvider } from "@/components/print/PrintHost";
import { KitchenBoard } from "@/components/staff/KitchenBoard";
import { StaffGate } from "@/components/staff/StaffGate";

export const metadata: Metadata = { title: "Kitchen Display" };
export const instant = false;

/** The screen on the kitchen wall: every order, live, with its status and timer. */
export default function KitchenPage() {
  return (
    <StaffGate role="kitchen">
      <PrintProvider>
        <KitchenBoard />
      </PrintProvider>
    </StaffGate>
  );
}
