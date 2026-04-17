import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "studio_admin_session";
const DEFAULT_PASSWORD = "change-me-please";

function isLocalDev() {
  return process.env.NODE_ENV !== "production";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function isAuthenticated() {
  if (isLocalDev()) {
    return true;
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!sessionValue) {
    return false;
  }

  const expected = Buffer.from(hashValue(`password:${getAdminPassword()}`));
  const actual = Buffer.from(sessionValue);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createAdminSession() {
  if (isLocalDev()) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, hashValue(`password:${getAdminPassword()}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  if (isLocalDev()) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export function verifyPassword(input: string) {
  if (isLocalDev()) {
    return true;
  }

  return input === getAdminPassword();
}

export function getDefaultPasswordNotice() {
  if (isLocalDev()) {
    return null;
  }

  return process.env.ADMIN_PASSWORD ? null : DEFAULT_PASSWORD;
}
