import "server-only";

import {
  getAuthStrategy,
  hasOperatorRules,
  isOidcConfigured,
} from "@/data/enterprise-auth";
import { getAppUrlString } from "@/data/runtime";
import { getStorageBackend } from "@/data/store";
import { getStripeKeyMode } from "@/data/stripe";

export type LaunchCheckStatus = "pass" | "warning" | "blocked";

export type LaunchReadinessCheck = {
  label: string;
  status: LaunchCheckStatus;
  detail: string;
};

function parseList(value?: string) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function buildCheck(input: {
  label: string;
  pass: boolean;
  warning?: boolean;
  passDetail: string;
  warningDetail: string;
  blockedDetail: string;
}): LaunchReadinessCheck {
  if (input.pass) {
    return {
      label: input.label,
      status: "pass",
      detail: input.passDetail,
    };
  }

  if (input.warning) {
    return {
      label: input.label,
      status: "warning",
      detail: input.warningDetail,
    };
  }

  return {
    label: input.label,
    status: "blocked",
    detail: input.blockedDetail,
  };
}

export function getLaunchReadinessReport() {
  const isProduction = process.env.NODE_ENV === "production";
  const authStrategy = getAuthStrategy();
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";
  const allowedOrigins = parseList(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS).map(
    (origin) => origin.replace(/^https?:\/\//, ""),
  );
  const storageBackend = getStorageBackend();
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const stripeKeyMode = getStripeKeyMode();
  const hasStripeWebhookSecret = Boolean(
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
  const hasAnyStripePrices = Boolean(
    process.env.STRIPE_PRICE_STARTER?.trim() ||
      process.env.STRIPE_PRICE_TEAM?.trim() ||
      process.env.STRIPE_PRICE_GROWTH?.trim() ||
      process.env.STRIPE_PRICE_ENTERPRISE?.trim(),
  );

  let protocol = "http:";
  let host = "localhost";

  try {
    const url = new URL(getAppUrlString());
    protocol = url.protocol;
    host = url.host;
  } catch {
    // Keep fallback values so the report can still render.
  }

  const usesPublicHttps =
    protocol === "https:" && !/^(localhost|127\.0\.0\.1)/i.test(host);

  const checks = [
    buildCheck({
      label: "Enterprise authentication",
      pass: authStrategy === "oidc" && isOidcConfigured(),
      warning: !isProduction,
      passDetail:
        "Enterprise SSO is enabled through OpenID Connect and the required provider settings are configured.",
      warningDetail:
        "Local development can stay on access-code auth. Enterprise SSO only turns on when ENABLE_ENTERPRISE_SSO=true and AUTH_STRATEGY=oidc are both configured.",
      blockedDetail:
        "Enterprise deployment requires ENABLE_ENTERPRISE_SSO=true, AUTH_STRATEGY=oidc, OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET.",
    }),
    buildCheck({
      label: "Session secret",
      pass: sessionSecret.length >= 32,
      warning: !isProduction,
      passDetail: "SESSION_SECRET is configured with production-safe length.",
      warningDetail:
        "Set a dedicated SESSION_SECRET before deployment so signed sessions are not relying on development defaults.",
      blockedDetail:
        "SESSION_SECRET must be explicitly configured and long enough before public launch.",
    }),
    buildCheck({
      label: "Operator access policy",
      pass: hasOperatorRules(),
      warning: !isProduction,
      passDetail:
        "Operator access is restricted through explicit email, domain, or group policy.",
      warningDetail:
        "Set APP_ACCESS_EMAILS, APP_ACCESS_DOMAINS, or APP_ACCESS_GROUPS before wider rollout so the console is not relying on an open operator policy.",
      blockedDetail:
        "Enterprise deployment requires an operator access policy through APP_ACCESS_EMAILS, APP_ACCESS_DOMAINS, or APP_ACCESS_GROUPS.",
    }),
    buildCheck({
      label: "Database backend",
      pass: storageBackend === "postgres" && hasDatabaseUrl,
      warning: !isProduction,
      passDetail:
        "Agent Ledger is configured to use the Postgres-backed storage path for operational state.",
      warningDetail:
        "Local development can still use filesystem storage, but enterprise deployment should point DATABASE_URL at managed Postgres.",
      blockedDetail:
        "Enterprise deployment requires STORAGE_BACKEND=postgres plus DATABASE_URL so the filesystem-backed store is not carrying production state.",
    }),
    buildCheck({
      label: "Public app URL",
      pass: usesPublicHttps,
      warning: !isProduction,
      passDetail:
        "APP_URL is using a public HTTPS origin suitable for metadata, cookies, and launch traffic.",
      warningDetail:
        "APP_URL is still local. Point it at your public HTTPS domain before launch so metadata and cookies are correct.",
      blockedDetail:
        "APP_URL must use a public HTTPS domain before launch. Localhost URLs are not public-ready.",
    }),
    buildCheck({
      label: "Server action origins",
      pass: allowedOrigins.includes(host),
      warning: true,
      passDetail:
        "SERVER_ACTIONS_ALLOWED_ORIGINS includes the current app host, which is safer behind proxies and custom domains.",
      warningDetail:
        "SERVER_ACTIONS_ALLOWED_ORIGINS does not include the current app host yet. Add it before launch, especially behind a proxy.",
      blockedDetail:
        "SERVER_ACTIONS_ALLOWED_ORIGINS should include the current app host before launch.",
    }),
    buildCheck({
      label: "Stripe billing",
      pass: Boolean(stripeKeyMode) && hasStripeWebhookSecret && hasAnyStripePrices,
      warning: !isProduction,
      passDetail:
        `Stripe ${stripeKeyMode ?? "billing"} credentials, webhook verification, and price identifiers are configured for subscription flows.`,
      warningDetail:
        "Stripe can stay optional in local development, but enterprise deployment should provide STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and Stripe price ids.",
      blockedDetail:
        "Enterprise deployment requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and Stripe price ids so billing is not still a stub.",
    }),
  ];

  const blockedCount = checks.filter((check) => check.status === "blocked").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const status: LaunchCheckStatus =
    blockedCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "pass";

  return {
    status,
    blockedCount,
    warningCount,
    checks,
  };
}

export function getLoginGuardrailMessage() {
  try {
    const appUrl = new URL(getAppUrlString());

    if (
      appUrl.hostname === "localhost" ||
      appUrl.hostname === "127.0.0.1" ||
      appUrl.hostname === "::1"
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const report = getLaunchReadinessReport();

  if (report.status !== "blocked") {
    return null;
  }

  return (
    report.checks.find((check) => check.status === "blocked")?.detail ??
    "The founder console is not configured safely enough for public use yet."
  );
}
