import "server-only";

import type { AuthStrategy } from "@/data/types";
import { getAppUrlString } from "@/data/runtime";

type OidcDiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
};

type OperatorRules = {
  emails: string[];
  domains: string[];
  groups: string[];
};

function parseList(value?: string) {
  return value
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) ?? [];
}

export function getAuthStrategy(): AuthStrategy {
  const configured = process.env.AUTH_STRATEGY?.trim().toLowerCase();
  const enterpriseSsoEnabled =
    process.env.ENABLE_ENTERPRISE_SSO?.trim().toLowerCase() === "true";

  return enterpriseSsoEnabled && configured === "oidc" ? "oidc" : "access-code";
}

export function getOperatorRules(): OperatorRules {
  return {
    emails: parseList(process.env.APP_ACCESS_EMAILS),
    domains: parseList(process.env.APP_ACCESS_DOMAINS),
    groups: parseList(process.env.APP_ACCESS_GROUPS),
  };
}

export function hasOperatorRules() {
  const rules = getOperatorRules();
  return rules.emails.length > 0 || rules.domains.length > 0 || rules.groups.length > 0;
}

export function isOperatorAllowed(input: {
  email: string;
  groups?: string[];
}) {
  const email = input.email.trim().toLowerCase();
  const groups = input.groups?.map((group) => group.trim().toLowerCase()) ?? [];
  const rules = getOperatorRules();

  if (!hasOperatorRules()) {
    return process.env.NODE_ENV !== "production";
  }

  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  return (
    rules.emails.includes(email) ||
    rules.domains.includes(domain) ||
    groups.some((group) => rules.groups.includes(group))
  );
}

export function isOidcConfigured() {
  return Boolean(
    process.env.OIDC_ISSUER?.trim() &&
      process.env.OIDC_CLIENT_ID?.trim() &&
      process.env.OIDC_CLIENT_SECRET?.trim(),
  );
}

export function getOidcRedirectUri() {
  return (
    process.env.OIDC_REDIRECT_URI?.trim() ||
    `${getAppUrlString()}/api/auth/oidc/callback`
  );
}

export function getOidcScopes() {
  return (process.env.OIDC_SCOPES?.trim() || "openid profile email")
    .split(/\s+/)
    .filter(Boolean);
}

export function getOidcTokenAuthMethod() {
  return process.env.OIDC_TOKEN_AUTH_METHOD === "client_secret_post"
    ? "client_secret_post"
    : "client_secret_basic";
}

export function getOidcClaimNames() {
  return {
    email: process.env.OIDC_EMAIL_CLAIM?.trim() || "email",
    name: process.env.OIDC_NAME_CLAIM?.trim() || "name",
    groups: process.env.OIDC_GROUPS_CLAIM?.trim() || "groups",
  };
}

export function getOidcEndSessionRedirectUri() {
  return (
    process.env.OIDC_POST_LOGOUT_REDIRECT_URI?.trim() || `${getAppUrlString()}/`
  );
}

export async function discoverOidcConfiguration() {
  const issuer = process.env.OIDC_ISSUER?.trim();

  if (!issuer) {
    throw new Error("OIDC_ISSUER must be configured for enterprise SSO.");
  }

  const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load the OpenID Connect discovery document.");
  }

  return (await response.json()) as OidcDiscoveryDocument;
}

export function getOidcClientConfig() {
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("OIDC client credentials are not configured.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getOidcRedirectUri(),
    scopes: getOidcScopes(),
    tokenAuthMethod: getOidcTokenAuthMethod(),
    prompt: process.env.OIDC_PROMPT?.trim() || undefined,
  };
}

export function normalizeGroups(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
