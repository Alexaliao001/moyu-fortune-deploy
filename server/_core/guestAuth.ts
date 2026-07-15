/**
 * Guest / email session auth — replaces Manus OAuth for Path C.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

function sessionSecret() {
  const secret = ENV.cookieSecret || "moyu-dev-insecure-jwt-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT({
    openId: payload.openId,
    appId: payload.appId || ENV.appId || "moyu-fortune",
    name: payload.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(sessionSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, sessionSecret(), {
      algorithms: ["HS256"],
    });
    const openId = payload.openId;
    const appId = payload.appId;
    const name = payload.name;
    if (
      typeof openId !== "string" ||
      !openId ||
      typeof appId !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }
    return { openId, appId, name };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined) {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    map.set(part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim()));
  }
  return map;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);
  if (!session) return null;

  let user = await db.getUserByOpenId(session.openId);
  if (!user) return null;

  // touch lastSignedIn occasionally is fine; skip for every request noise
  return user;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export function guestOpenId(deviceId?: string): string {
  if (deviceId && /^[a-zA-Z0-9_-]{8,80}$/.test(deviceId)) {
    return `guest_${deviceId.slice(0, 48)}`;
  }
  return `guest_${randomBytes(16).toString("hex")}`;
}

export function emailOpenId(email: string): string {
  const dig = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 24);
  return `email_${dig}`;
}

export async function setSessionCookie(
  req: Request,
  res: Response,
  user: User
): Promise<void> {
  const token = await signSession({
    openId: user.openId,
    appId: ENV.appId || "moyu-fortune",
    name: user.name || "摸鱼达人",
  });
  const opts = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...opts,
    maxAge: ONE_YEAR_MS,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...opts, maxAge: -1 });
}
