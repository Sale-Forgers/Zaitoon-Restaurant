import type { Metadata } from "next";
import { PrintProvider } from "@/components/print/PrintHost";
import { StaffGate } from "@/components/staff/StaffGate";
import { WaiterApp } from "@/components/staff/WaiterApp";

export const metadata: Metadata = { title: "Waiter App" };
export const instant = false;

/** The waiter's tablet: table map, guest calls, order taking and bills. */
export default function WaiterPage() {
  return (
    <StaffGate role="waiter">
      <PrintProvider>
        <WaiterApp />
      </PrintProvider>
    </StaffGate>
  );
}
