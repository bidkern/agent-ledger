import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  discoverOidcConfiguration,
  getOidcClaimNames,
  getOidcClientConfig,
  getOidcEndSessionRedirectUri,
  getOperatorRules,
  isOperatorAllowed,
  normalizeGroups,
} from "@/data/enterprise-auth";

export const OIDC_STATE_COOKIE = "agentledger_oidc_state";
export const OIDC_CODE_VERIFIER_COOKIE = "agentledger_oidc_code_verifier";

type TokenResponse = {
  access_token?: string;
  id_token?: string;
};

function encodePkceChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function getClaimValue(
  source: Record<string, unknown>,
  claimName: string,
) {
  return source[claimName];
}

export async function buildOidcAuthorizationRequest() {
  const discovery = await discoverOidcConfiguration();
  const client = getOidcClientConfig();
  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = encodePkceChallenge(codeVerifier);
  const authorizationUrl = new URL(discovery.authorization_endpoint);

  authorizationUrl.searchParams.set("client_id", client.clientId);
  authorizationUrl.searchParams.set("redirect_uri", client.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", client.scopes.join(" "));
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  if (client.prompt) {
    authorizationUrl.searchParams.set("prompt", client.prompt);
  }

  return {
    state,
    codeVerifier,
    authorizationUrl: authorizationUrl.toString(),
  };
}

async function exchangeCodeForTokens(input: {
  code: string;
  codeVerifier: string;
}) {
  const discovery = await discoverOidcConfiguration();
  const client = getOidcClientConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: client.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (client.tokenAuthMethod === "client_secret_post") {
    body.set("client_id", client.clientId);
    body.set("client_secret", client.clientSecret);
  } else {
    headers.Authorization = `Basic ${Buffer.from(
      `${client.clientId}:${client.clientSecret}`,
      "utf8",
    ).toString("base64")}`;
  }

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to exchange the authorization code for tokens.");
  }

  return (await response.json()) as TokenResponse;
}

async function resolveUserProfile(tokens: TokenResponse) {
  const discovery = await discoverOidcConfiguration();

  if (discovery.userinfo_endpoint && tokens.access_token) {
    const response = await fetch(discovery.userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as Record<string, unknown>;
    }
  }

  if (tokens.id_token) {
    return decodeJwtPayload(tokens.id_token);
  }

  throw new Error(
    "The identity provider did not return user information that Agent Ledger could use.",
  );
}

export async function exchangeOidcCodeForIdentity(input: {
  code: string;
  state: string;
  storedState?: string;
  storedCodeVerifier?: string;
}) {
  if (!input.storedState || input.state !== input.storedState) {
    throw new Error("The SSO state check failed. Start the sign-in flow again.");
  }

  if (!input.storedCodeVerifier) {
    throw new Error("The SSO transaction expired. Start the sign-in flow again.");
  }

  const claimNames = getOidcClaimNames();
  const tokens = await exchangeCodeForTokens({
    code: input.code,
    codeVerifier: input.storedCodeVerifier,
  });
  const profile = await resolveUserProfile(tokens);
  const email = String(getClaimValue(profile, claimNames.email) ?? "")
    .trim()
    .toLowerCase();
  const name = String(getClaimValue(profile, claimNames.name) ?? "")
    .trim();
  const groups = normalizeGroups(getClaimValue(profile, claimNames.groups));

  if (!email) {
    throw new Error(
      "The identity provider did not include an email claim for this user.",
    );
  }

  if (!isOperatorAllowed({ email, groups })) {
    const rules = getOperatorRules();
    const configuredRules = [
      ...rules.emails,
      ...rules.domains.map((domain) => `@${domain}`),
      ...rules.groups.map((group) => `group:${group}`),
    ];

    throw new Error(
      configuredRules.length > 0
        ? `This identity is not in the Agent Ledger operator policy (${configuredRules.join(", ")}).`
        : "This identity is not allowed to operate the Agent Ledger founder console.",
    );
  }

  return {
    email,
    name: name || email,
    groups,
  };
}

export async function buildOidcLogoutUrl() {
  const configuredEndpoint = process.env.OIDC_END_SESSION_ENDPOINT?.trim();

  if (configuredEndpoint) {
    const url = new URL(configuredEndpoint);
    url.searchParams.set(
      "post_logout_redirect_uri",
      getOidcEndSessionRedirectUri(),
    );
    return url.toString();
  }

  try {
    const discovery = await discoverOidcConfiguration();

    if (!discovery.end_session_endpoint) {
      return getOidcEndSessionRedirectUri();
    }

    const url = new URL(discovery.end_session_endpoint);
    url.searchParams.set(
      "post_logout_redirect_uri",
      getOidcEndSessionRedirectUri(),
    );
    return url.toString();
  } catch {
    return getOidcEndSessionRedirectUri();
  }
}
