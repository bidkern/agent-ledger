"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  createSession,
  destroySession,
  getSession,
  isAllowedEmail,
} from "@/data/auth";
import { getAuthStrategy } from "@/data/enterprise-auth";
import {
  DEMO_OPERATOR_EMAIL,
  isLocalDemoEnabled,
} from "@/data/local-demo";
import { seedDemoCompany } from "@/data/mission";
import { getLoginGuardrailMessage } from "@/data/readiness";
import { logAuditEvent } from "@/data/repository";
import {
  consumeRateLimit,
  formatRetryAfter,
  resetRateLimit,
} from "@/data/rate-limit";

type LoginState = {
  error: string;
};

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  accessCode: z.string().trim().min(12, "Use the full access code."),
  website: z.string().trim().optional(),
});

function constantTimeMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    accessCode: formData.get("accessCode"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Access denied.",
    };
  }

  const guardrailMessage = getLoginGuardrailMessage();

  if (guardrailMessage) {
    return {
      error: guardrailMessage,
    };
  }

  if (getAuthStrategy() !== "access-code") {
    return {
      error:
        "This deployment uses enterprise SSO. Use the identity-provider sign-in button instead of the access-code form.",
    };
  }

  const configuredCode = process.env.APP_ACCESS_CODE;

  if (!configuredCode) {
    return {
      error:
        "APP_ACCESS_CODE is not configured yet. Set it in .env.local before using the private workspace.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const requesterRateLimit = await consumeRateLimit({
    scope: "login",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });

  if (!requesterRateLimit.allowed) {
    return {
      error: `Too many login attempts from this browser or network. Try again in ${formatRetryAfter(requesterRateLimit.retryAfterSeconds)}.`,
    };
  }

  if (parsed.data.website) {
    return {
      error: "Access denied. Check the allowlist and access code.",
    };
  }

  const rateLimit = await consumeRateLimit({
    scope: "login",
    actorKey: email,
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Too many login attempts. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
    };
  }

  if (
    !isAllowedEmail(email) ||
    !constantTimeMatch(configuredCode, parsed.data.accessCode)
  ) {
    return {
      error: "Access denied. Check the allowlist and access code.",
    };
  }

  await resetRateLimit({
    scope: "login",
    actorKey: email,
  });
  await createSession({
    email,
    authStrategy: "access-code",
  });
  await logAuditEvent({
    actorEmail: email,
    action: "auth.login",
    entityType: "auth",
    entityId: email,
    detail: "Successful Agent Ledger founder sign-in",
  });
  redirect("/workspace");
}

export async function enterDemoWorkspace(
  _previousState: LoginState,
): Promise<LoginState> {
  void _previousState;

  if (!isLocalDemoEnabled()) {
    return {
      error:
        "Local demo entry is only available on a localhost access-code deployment.",
    };
  }

  const guardrailMessage = getLoginGuardrailMessage();

  if (guardrailMessage) {
    return {
      error: guardrailMessage,
    };
  }

  const rateLimit = await consumeRateLimit({
    scope: "login",
    actorKey: DEMO_OPERATOR_EMAIL,
    limit: 12,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Too many demo login attempts. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
    };
  }

  await seedDemoCompany(DEMO_OPERATOR_EMAIL);
  await resetRateLimit({
    scope: "login",
    actorKey: DEMO_OPERATOR_EMAIL,
  });
  await createSession({
    email: DEMO_OPERATOR_EMAIL,
    name: "Demo Operator",
    authStrategy: "access-code",
  });
  await logAuditEvent({
    actorEmail: DEMO_OPERATOR_EMAIL,
    action: "auth.login.demo",
    entityType: "auth",
    entityId: DEMO_OPERATOR_EMAIL,
    detail: "Entered the Agent Ledger demo workspace",
  });
  redirect("/workspace");
}

export async function logout() {
  const session = await getSession();

  if (session) {
    await logAuditEvent({
      actorEmail: session.email,
      action: "auth.logout",
      entityType: "auth",
      entityId: session.email,
      detail: "Agent Ledger founder signed out",
    });
  }

  await destroySession();

  if (session?.authStrategy === "oidc") {
    redirect("/api/auth/oidc/logout");
  }

  redirect("/");
}
