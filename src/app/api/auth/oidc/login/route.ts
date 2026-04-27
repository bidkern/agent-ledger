import { NextResponse } from "next/server";
import {
  getAuthStrategy,
  isOidcConfigured,
} from "@/data/enterprise-auth";
import {
  buildOidcAuthorizationRequest,
  OIDC_CODE_VERIFIER_COOKIE,
  OIDC_STATE_COOKIE,
} from "@/data/oidc";

export const dynamic = "force-dynamic";

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  };
}

export async function GET(request: Request) {
  if (getAuthStrategy() !== "oidc" || !isOidcConfigured()) {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", request.url));
  }

  try {
    const transaction = await buildOidcAuthorizationRequest();
    const response = NextResponse.redirect(transaction.authorizationUrl);

    response.cookies.set(
      OIDC_STATE_COOKIE,
      transaction.state,
      getCookieOptions(),
    );
    response.cookies.set(
      OIDC_CODE_VERIFIER_COOKIE,
      transaction.codeVerifier,
      getCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", request.url));
  }
}
