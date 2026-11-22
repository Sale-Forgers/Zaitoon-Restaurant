import { NextResponse, type NextRequest } from "next/server";
import { STAFF_COOKIE, STAFF_COOKIE_DAYS, authGuest, signSession, verifySession } from "@/lib/server/auth";
import { db, getSecrets } from "@/lib/server/db";
import { ApiError } from "@/lib/server/logic";
import { dispatch, type Ctx } from "@/lib/server/rpc";

export const maxDuration = 30;

/**
 * Single endpoint for every operation: POST { fn, args, guest }.
 * Guests identify themselves with the id + token stored on their phone;
 * staff with a signed, http-only cookie obtained through the PIN screen.
 */
export async function POST(req: NextRequest) {
  let body: { fn?: string; args?: unknown; guest?: { id?: string; token?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  try {
    const store = await db();
    const secrets = await getSecrets(store);
    const ctx: Ctx = {
      store,
      guest: await authGuest(store, body.guest),
      staff: verifySession(req.cookies.get(STAFF_COOKIE)?.value, secrets.sessionSecret),
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local",
      host: req.nextUrl.hostname,
    };
    const data = await dispatch(String(body.fn ?? ""), body.args, ctx);
    const res = NextResponse.json({ ok: true, data: data ?? null }, { headers: { "Cache-Control": "no-store" } });

    if (ctx.session !== undefined) {
      const secure = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
      if (ctx.session) {
        res.cookies.set(STAFF_COOKIE, signSession(ctx.session, secrets.sessionSecret), {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: STAFF_COOKIE_DAYS * 86_400,
        });
      } else {
        res.cookies.set(STAFF_COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
      }
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status: err.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[rpc]", body.fn, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
