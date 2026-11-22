"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Real-time sync without websockets.
 *
 * The server keeps a version number that changes on every write. Each open
 * screen checks it about once a second (a tiny request) and reloads its data
 * only when the number moved. Tabs in the same browser also tell each other
 * instantly through a BroadcastChannel, so side-by-side demo windows update
 * the moment something happens.
 */

const POLL_MS = 1300;

let version: number | null = null;
let local = 0;
let stamp = "0:0";
let online = true;
let timer: ReturnType<typeof setInterval> | null = null;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

function emit() {
  stamp = `${version}:${local}`;
  listeners.forEach((l) => l());
}

async function poll() {
  if (document.visibilityState !== "visible") return;
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    const { v } = (await res.json()) as { v: number };
    const wasOffline = !online;
    online = res.ok;
    if (v !== version || wasOffline) {
      version = v;
      emit();
    }
  } catch {
    if (online) {
      online = false;
      emit();
    }
  }
}

function start() {
  if (timer) return;
  timer = setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", poll);
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel("zr-sync");
    channel.onmessage = () => {
      local++;
      emit();
    };
  }
  // The service worker pings open pages when a push arrives.
  navigator.serviceWorker?.addEventListener("message", (e) => {
    if (e.data?.type === "zr-push") {
      local++;
      emit();
    }
  });
  void poll();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", poll);
  channel?.close();
  channel = null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => {
    listeners.delete(cb);
    if (!listeners.size) stop();
  };
}

/** Call after changing something so every screen (this tab and others) reloads now. */
export function notifyChange() {
  local++;
  emit();
  try {
    channel?.postMessage("change");
  } catch {
    /* channel closed */
  }
}

export function useStamp() {
  return useSyncExternalStore(
    subscribe,
    () => stamp,
    () => "ssr",
  );
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => online,
    () => true,
  );
}

export interface Live<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads data and keeps it fresh: reloads whenever anything changes on the
 * server. `key` restarts the load when its inputs change.
 */
export function useLive<T>(load: () => Promise<T>, key = "", enabled = true): Live<T> {
  const current = useStamp();
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const loader = useRef(load);
  const running = useRef(false);
  const dirty = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    loader.current = load;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (running.current) {
      dirty.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        dirty.current = false;
        const data = await loader.current();
        if (alive.current) setState({ data, error: null, loading: false });
      } while (dirty.current);
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, error: e as Error, loading: false }));
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [current, key, enabled, refresh]);

  return { ...state, refresh };
}

// ───────────────────────────── Clock ─────────────────────────────

let offset = 0;

/** Aligns timers with the server clock so every screen shows the same elapsed time. */
export function setServerNow(serverNow: number) {
  offset = serverNow - Date.now();
}

/** A shared ticking clock: one interval no matter how many components listen. */
function makeClock(intervalMs: number) {
  let value = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const subs = new Set<() => void>();
  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      if (!timer) {
        value = Date.now() + offset;
        timer = setInterval(() => {
          value = Date.now() + offset;
          subs.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        subs.delete(cb);
        if (!subs.size && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    // Snapshots must be stable between ticks, so the value is cached.
    snapshot() {
      if (!value) value = Date.now() + offset;
      return value;
    },
  };
}

const second = makeClock(1000);
const halfMinute = makeClock(30_000);

/** Current time, ticking every second (for timers). 0 during server rendering. */
export function useNow() {
  return useSyncExternalStore(second.subscribe, second.snapshot, () => 0);
}

/** Current time, refreshed every 30 seconds (for "5 min ago" labels and expiry checks). */
export function useSlowNow() {
  return useSyncExternalStore(halfMinute.subscribe, halfMinute.snapshot, () => 0);
}
