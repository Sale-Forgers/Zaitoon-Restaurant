import { clock, dayLabel, rs } from "@/lib/format";
import { lineOptions } from "@/lib/pricing";
import type { Bill, Order, OrderLine } from "@/lib/types";

/**
 * Paper tickets, sized for an 80 mm thermal printer (72 mm printable width).
 * The same components are used for the on-screen preview and for printing.
 */

const paper: React.CSSProperties = {
  width: "72mm",
  padding: "4mm 3mm 8mm",
  background: "#fff",
  color: "#000",
  fontFamily: 'ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace',
  fontSize: "12px",
  lineHeight: 1.35,
};

const rule: React.CSSProperties = { borderTop: "1px dashed #000", margin: "6px 0" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "8px" };

/** Kitchen Order Ticket: what the kitchen printer produces when an order arrives. */
export function KotTicket({ order }: { order: Order }) {
  const count = order.lines.reduce((a, l) => a + l.qty, 0);
  return (
    <div style={paper}>
      <div style={{ textAlign: "center", fontWeight: 700, letterSpacing: "0.12em" }}>KITCHEN ORDER TICKET</div>
      <div style={{ textAlign: "center", fontSize: "11px" }}>Zaitoon Family Restaurant</div>
      <div style={rule} />
      <div style={{ ...row, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "11px" }}>TABLE</div>
          <div style={{ fontSize: "34px", fontWeight: 800, lineHeight: 1 }}>{order.tableNumber}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>#{order.number}</div>
          <div>
            {dayLabel(order.createdAt)} {clock(order.createdAt)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "4px" }}>
        {order.source === "qr" ? "QR order" : `Waiter: ${order.waiter ?? "-"}`} · {order.guestName}
      </div>
      <div style={rule} />
      {order.lines.map((l, i) => (
        <div key={i} style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>
            {l.qty} x {l.name}
          </div>
          {lineOptions(l) && <div style={{ paddingLeft: "14px" }}>{lineOptions(l)}</div>}
          {l.note && <div style={{ paddingLeft: "14px", fontWeight: 700 }}>** {l.note}</div>}
        </div>
      ))}
      {order.note && (
        <>
          <div style={rule} />
          <div style={{ fontWeight: 700 }}>NOTE: {order.note}</div>
        </>
      )}
      <div style={rule} />
      <div style={row}>
        <span>Items: {count}</span>
        <span>Printed {clock(order.kotPrintedAt ?? order.createdAt)}</span>
      </div>
    </div>
  );
}

/** Guest bill for a table: every order of the visit on one receipt. */
export function BillTicket({
  tableNumber,
  orders,
  bill,
  restaurant,
  waiter,
  at,
}: {
  tableNumber: number;
  orders: Order[];
  bill: Bill;
  restaurant: { name: string; address: string; phone: string };
  waiter?: string;
  at: number;
}) {
  const lines: OrderLine[] = orders.filter((o) => o.status !== "cancelled").flatMap((o) => o.lines);
  return (
    <div style={paper}>
      <div style={{ textAlign: "center", fontSize: "16px", fontWeight: 800 }}>{restaurant.name}</div>
      <div style={{ textAlign: "center", fontSize: "10.5px" }}>{restaurant.address}</div>
      <div style={{ textAlign: "center", fontSize: "10.5px" }}>{restaurant.phone}</div>
      <div style={rule} />
      <div style={row}>
        <span>Table {tableNumber}</span>
        <span>
          {dayLabel(at)} {clock(at)}
        </span>
      </div>
      <div style={row}>
        <span>Orders: {orders.map((o) => `#${o.number}`).join(" ")}</span>
        {waiter && <span>{waiter}</span>}
      </div>
      <div style={rule} />
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: "3px" }}>
          <div style={row}>
            <span>
              {l.qty} x {l.name}
            </span>
            <span>{Math.round(l.total).toLocaleString("en-PK")}</span>
          </div>
          {lineOptions(l) && <div style={{ paddingLeft: "14px", fontSize: "10.5px" }}>{lineOptions(l)}</div>}
        </div>
      ))}
      <div style={rule} />
      <div style={row}>
        <span>Subtotal</span>
        <span>{rs(bill.subtotal)}</span>
      </div>
      {bill.service > 0 && (
        <div style={row}>
          <span>Service charge ({bill.servicePct}%)</span>
          <span>{rs(bill.service)}</span>
        </div>
      )}
      {bill.tax > 0 && (
        <div style={row}>
          <span>
            {bill.taxLabel} ({bill.taxPct}%)
          </span>
          <span>{rs(bill.tax)}</span>
        </div>
      )}
      <div style={{ ...row, fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>
        <span>TOTAL</span>
        <span>{rs(bill.total)}</span>
      </div>
      <div style={rule} />
      <div style={{ textAlign: "center" }}>Thank you for dining with us!</div>
    </div>
  );
}

/** Totals for a set of orders, using the amounts stored on each order. */
export function billOf(orders: Order[], ordering: { servicePct: number; taxPct: number; taxLabel: string }): Bill {
  const live = orders.filter((o) => o.status !== "cancelled");
  return {
    subtotal: live.reduce((a, o) => a + o.subtotal, 0),
    service: live.reduce((a, o) => a + o.service, 0),
    tax: live.reduce((a, o) => a + o.tax, 0),
    total: live.reduce((a, o) => a + o.total, 0),
    servicePct: ordering.servicePct,
    taxPct: ordering.taxPct,
    taxLabel: ordering.taxLabel,
  };
}
