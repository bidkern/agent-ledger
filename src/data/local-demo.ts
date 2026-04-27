import "server-only";

import { getAuthStrategy } from "@/data/enterprise-auth";
import { getAppUrl } from "@/data/runtime";

export const DEMO_OPERATOR_EMAIL = "demo@agentledger.ai";

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function isLocalDemoEnabled() {
  if (process.env.ENABLE_LOCAL_DEMO !== "true") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (getAuthStrategy() !== "access-code") {
    return false;
  }

  if (!process.env.APP_ACCESS_CODE?.trim()) {
    return false;
  }

  return isLocalHost(getAppUrl().hostname);
}

export function getLocalDemoCredentials() {
  if (!isLocalDemoEnabled()) {
    return null;
  }

  return {
    email: DEMO_OPERATOR_EMAIL,
    accessCode: process.env.APP_ACCESS_CODE?.trim() || "",
  };
}
