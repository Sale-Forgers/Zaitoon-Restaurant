import { connection } from "next/server";
import { db } from "@/lib/server/db";

/**
 * Cheap heartbeat: returns the data version. Every screen polls this about once
 * a second and refetches only when the number changes.
 */
export async function GET() {
  await connection();
  try {
    const store = await db();
    return Response.json({ v: await store.version() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[sync]", err);
    return Response.json({ v: -1 }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
