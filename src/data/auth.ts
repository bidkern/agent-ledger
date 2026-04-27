import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isOperatorAllowed } from "@/data/enterprise-auth";
import type { AuthStrategy } from "@/data/types";

export type SessionPayload = {
  email: string;
  name?: string;
  role: "founder";
  authStrategy: AuthStrategy;
  expiresAt: number;
};

export const SESSION_COOKIE = "agentledger_session";
const SESSION_MAX_AGE_SECONDS =
  Number(process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 8) || 60 * 60 * 8;
const DEV_FALLBACK_SECRET = "agentledger-dev-session-secret-change-me";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  throw new Error("SESSION_SECRET is required in production.");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function createSessionCookieValue(input: {
  email: string;
  name?: string;
  authStrategy?: AuthStrategy;
}) {
  const payload: SessionPayload = {
    email: input.email.toLowerCase(),
    name: input.name,
    role: "founder",
    authStrategy: input.authStrategy ?? "access-code",
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  return encodeSession(payload);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeSession(rawValue?: string) {
  if (!rawValue) {
    return null;
  }

  const [body, signature] = rawValue.split(".");

  if (!body || !signature) {
    return null;
  }

  if (!safeEqual(signature, sign(body))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.email || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isLocalHost(host: string) {
  const normalized = host.split(":")[0]?.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

async function getLocalTestSession() {
  if (process.env.ENABLE_LOCAL_TEST_ACCESS?.trim().toLowerCase() !== "true") {
    return null;
  }

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host")?.trim() ||
    headerList.get("host")?.trim() ||
    "";

  if (!isLocalHost(host)) {
    return null;
  }

  return {
    email: "local-operator@agentledger.local",
    name: "Local Operator",
    role: "founder",
    authStrategy: "access-code",
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  } satisfies SessionPayload;
}

export function isAllowedEmail(email: string) {
  return isOperatorAllowed({ email });
}

export async function createSession(input: {
  email: string;
  name?: string;
  authStrategy?: AuthStrategy;
}) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    createSessionCookieValue(input),
    getSessionCookieOptions(),
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  return (
    decodeSession(cookieStore.get(SESSION_COOKIE)?.value) ||
    (await getLocalTestSession())
  );
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    unauthorized();
  }

  return session;
}
