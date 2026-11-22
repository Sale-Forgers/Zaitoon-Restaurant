"use client";

import QRCode from "qrcode";
import { useMemo } from "react";

/**
 * QR code drawn as inline SVG, generated on the device (no QR web service).
 * Crisp at any size and prints perfectly on table cards.
 */
export function Qr({
  value,
  size = 160,
  dark = "#13110e",
  light = "#ffffff",
  margin = 2,
  className,
  level = "M",
}: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
  /** Quiet zone in modules. */
  margin?: number;
  className?: string;
  level?: "L" | "M" | "Q" | "H";
}) {
  const { path, count } = useMemo(() => {
    try {
      const qr = QRCode.create(value || " ", { errorCorrectionLevel: level });
      const n = qr.modules.size;
      const data = qr.modules.data;
      let d = "";
      for (let y = 0; y < n; y++) {
        let run = 0;
        for (let x = 0; x <= n; x++) {
          const on = x < n && data[y * n + x];
          if (on) run++;
          else if (run) {
            // One rectangle per horizontal run keeps the path short.
            d += `M${x - run + margin} ${y + margin}h${run}v1h-${run}z`;
            run = 0;
          }
        }
      }
      return { path: d, count: n + margin * 2 };
    } catch {
      return { path: "", count: 1 };
    }
  }, [value, level, margin]);

  return (
    <svg
      viewBox={`0 0 ${count} ${count}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code"
    >
      <rect width={count} height={count} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
}
