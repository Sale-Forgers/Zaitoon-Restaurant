"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui";
import { setServerNow, useLive } from "@/lib/client/live";
import { errorMessage, rpc } from "@/lib/client/rpc";
import type { Menu, OrderStatus } from "@/lib/types";

/** Live floor state shared by the kitchen, waiter and admin screens. */
export function useBoard() {
  const live = useLive(() => rpc("staff.board"), "board");
  const now = live.data?.now;
  useEffect(() => {
    if (now) setServerNow(now);
  }, [now]);
  return live;
}

/** Moves an order to a new status, with an error toast if it fails. */
export function useOrderActions() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      setBusy(id);
      try {
        await rpc("staff.order.status", { id, status });
      } catch (e) {
        toast({ title: "Could not update the order", text: errorMessage(e), tone: "error" });
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  return { busy, setStatus };
}

/** The menu for staff order taking: reloaded when the manager edits it. */
export function useStaffMenu(rev: number | undefined) {
  const [menu, setMenu] = useState<Menu | null>(null);
  useEffect(() => {
    if (rev === undefined) return;
    let cancelled = false;
    rpc("menu.get")
      .then((m) => !cancelled && setMenu(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rev]);
  return menu;
}

/** A boolean preference remembered on this device (sound on, auto-print on…). */
export function useDevicePref(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch {
      return fallback;
    }
  });
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set];
}
