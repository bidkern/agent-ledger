import "server-only";

import { randomBytes } from "node:crypto";
import { getAppUrlString } from "@/data/runtime";
import type { AgentRuntimeConnection } from "@/data/types";

export const OAUTH_COOKIE_PREFIX = "agentledger_oauth_";

export type OAuthSession = {
  connectionId: string;
  state: string;
  createdAt: number;
};

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function serializeOAuthSession(session: OAuthSession) {
  return encodeBase64Url(JSON.stringify(session));
}

export function parseOAuthSession(rawValue?: string) {
  if (!rawValue) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(rawValue)) as OAuthSession;

    if (!session.connectionId || !session.state || !session.createdAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function getOAuthCookieName(connectionId: string) {
  return `${OAUTH_COOKIE_PREFIX}${connectionId}`;
}

export function getOAuthRedirectUri(connectionId: string) {
  return `${getAppUrlString()}/api/oauth/callback/${connectionId}`;
}

function normalizeProvider(value: string) {
  return value.trim().toLowerCase();
}

export function getDefaultOAuthConfig(provider: AgentRuntimeConnection["provider"]) {
  switch (provider) {
    case "google":
      return {
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: "openid email profile",
      };
    case "github":
      return {
        authorizeUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: "read:user user:email",
      };
    case "microsoft":
      return {
        authorizeUrl:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: "openid email profile offline_access",
      };
    case "slack":
      return {
        authorizeUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        scopes: "users:read users:read.email",
      };
    case "notion":
      return {
        authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
        tokenUrl: "https://api.notion.com/v1/oauth/token",
        scopes: "",
      };
    default:
      return {
        authorizeUrl: "",
        tokenUrl: "",
        scopes: "",
      };
  }
}

export function getConnectionOAuthConfig(connection: AgentRuntimeConnection) {
  const defaults = getDefaultOAuthConfig(connection.provider);

  return {
    authorizeUrl: connection.oauthAuthorizeUrl || defaults.authorizeUrl,
    tokenUrl: connection.oauthTokenUrl || defaults.tokenUrl,
    scopes: connection.oauthScopes ?? defaults.scopes,
  };
}

export function buildOAuthAuthorizationUrl(input: {
  connection: AgentRuntimeConnection;
  state: string;
}) {
  const config = getConnectionOAuthConfig(input.connection);

  if (!input.connection.oauthClientId?.trim()) {
    throw new Error("OAuth client ID is missing for this connection.");
  }

  if (!config.authorizeUrl) {
    throw new Error("OAuth authorization URL is missing for this connection.");
  }

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.connection.oauthClientId);
  url.searchParams.set("redirect_uri", getOAuthRedirectUri(input.connection.id));
  url.searchParams.set("state", input.state);

  if (config.scopes.trim()) {
    url.searchParams.set("scope", config.scopes.trim());
  }

  if (input.connection.provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  if (input.connection.provider === "notion") {
    url.searchParams.set("owner", "user");
  }

  return url;
}

export async function exchangeOAuthCode(input: {
  connection: AgentRuntimeConnection;
  code: string;
  clientSecret?: string | null;
}) {
  const config = getConnectionOAuthConfig(input.connection);

  if (!input.connection.oauthClientId?.trim()) {
    throw new Error("OAuth client ID is missing for this connection.");
  }

  if (!config.tokenUrl) {
    throw new Error("OAuth token URL is missing for this connection.");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", input.code);
  body.set("redirect_uri", getOAuthRedirectUri(input.connection.id));
  body.set("client_id", input.connection.oauthClientId);

  if (input.clientSecret?.trim()) {
    body.set("client_secret", input.clientSecret.trim());
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (
    input.connection.provider === "notion" &&
    input.clientSecret?.trim()
  ) {
    headers.Authorization = `Basic ${Buffer.from(
      `${input.connection.oauthClientId}:${input.clientSecret.trim()}`,
    ).toString("base64")}`;
    body.delete("client_secret");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as OAuthTokenResponse | null)
    : parseTokenQueryString(await response.text());

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        `OAuth token exchange failed with HTTP ${response.status}.`,
    );
  }

  const expiresAt =
    typeof payload.expires_in === "number"
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined;

  return {
    ...payload,
    expires_at: expiresAt,
    provider: normalizeProvider(input.connection.provider),
    connected_at: new Date().toISOString(),
  };
}

function parseTokenQueryString(rawValue: string): OAuthTokenResponse {
  const params = new URLSearchParams(rawValue);
  const payload: OAuthTokenResponse = {};

  for (const [key, value] of params.entries()) {
    payload[key] = key === "expires_in" ? Number(value) : value;
  }

  return payload;
}
