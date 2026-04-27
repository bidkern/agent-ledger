import "server-only";

import { timingSafeEqual } from "node:crypto";

export type ServicePrincipal = {
  id: string;
  tokenPreview: string;
};

function parseConfiguredTokens(rawValue?: string) {
  return rawValue
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex <= 0) {
        return null;
      }

      const id = entry.slice(0, separatorIndex).trim();
      const token = entry.slice(separatorIndex + 1).trim();

      if (!id || !token) {
        return null;
      }

      return {
        id,
        token,
      };
    })
    .filter((entry): entry is { id: string; token: string } => Boolean(entry)) ?? [];
}

function getConfiguredTokens() {
  return parseConfiguredTokens(process.env.SERVICE_ACCOUNT_TOKENS);
}

function parseAuthorizationHeader(value: string | null) {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(/\s+/, 2);

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function buildPrincipal(id: string, token: string): ServicePrincipal {
  return {
    id,
    tokenPreview: `${token.slice(0, 4)}...${token.slice(-4)}`,
  };
}

export function isServiceAuthConfigured() {
  return getConfiguredTokens().length > 0;
}

export function authenticateServiceToken(rawToken?: string | null) {
  const token = rawToken?.trim();

  if (!token) {
    return null;
  }

  for (const configured of getConfiguredTokens()) {
    if (safeEqual(token, configured.token)) {
      return buildPrincipal(configured.id, configured.token);
    }
  }

  return null;
}

export function authenticateServiceRequest(request: Request) {
  const headerToken =
    parseAuthorizationHeader(request.headers.get("authorization")) ||
    request.headers.get("x-agent-ledger-service-key");

  return authenticateServiceToken(headerToken);
}

export function getServiceAuthErrorResponse() {
  return Response.json(
    {
      error:
        "Service authentication failed. Send Authorization: Bearer <token> or x-agent-ledger-service-key.",
    },
    { status: 401 },
  );
}
