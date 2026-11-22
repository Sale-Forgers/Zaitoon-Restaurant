"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Prints a React node on its own page: kitchen tickets and bills on 80 mm
 * thermal paper, table cards on A4. The node is rendered into a container that
 * is the only thing visible to the printer (see the print rules in globals.css).
 *
 * For hands-free kitchen printing, start Chrome with --kiosk-printing: the
 * print dialog is skipped and tickets go straight to the default printer.
 */

interface Job {
  node: ReactNode;
  /** CSS for the @page rule. */
  page: string;
  id: number;
}

type PrintFn = (node: ReactNode, opts?: { page?: "80mm" | "A4" }) => void;

const PrintContext = createContext<PrintFn>(() => {});

export function PrintProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<Job | null>(null);

  const print = useCallback<PrintFn>((node, opts) => {
    // Tickets leave the paper size to the printer driver: a thermal printer feeds
    // only as much roll as the ticket needs. Table cards ask for A4.
    setJob({ node, page: opts?.page === "A4" ? "size: A4; margin: 0;" : "margin: 0;", id: Date.now() });
  }, []);

  useEffect(() => {
    if (!job) return;
    const done = () => setJob(null);
    window.addEventListener("afterprint", done);
    // Give the browser a moment to lay out the ticket (and load any images).
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [job]);

  return (
    <PrintContext.Provider value={print}>
      {children}
      {job &&
        createPortal(
          <div className="print-only" key={job.id}>
            <style>{`@page { ${job.page} }`}</style>
            {job.node}
          </div>,
          document.body,
        )}
    </PrintContext.Provider>
  );
}

export const usePrint = () => useContext(PrintContext);
