import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionCookieValue,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/data/auth";
import { getAuthStrategy } from "@/data/enterprise-auth";
import {
  exchangeOidcCodeForIdentity,
  OIDC_CODE_VERIFIER_COOKIE,
  OIDC_STATE_COOKIE,
} from "@/data/oidc";
import { logAuditEvent } from "@/data/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (getAuthStrategy() !== "oidc") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const providerError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OIDC_STATE_COOKIE)?.value;
  const storedCodeVerifier = cookieStore.get(OIDC_CODE_VERIFIER_COOKIE)?.value;

  if (providerError || !code || !state) {
    const redirectUrl = new URL("/login?error=sso_failed", request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(OIDC_STATE_COOKIE);
    response.cookies.delete(OIDC_CODE_VERIFIER_COOKIE);
    return response;
  }

  try {
    const identity = await exchangeOidcCodeForIdentity({
      code,
      state,
      storedState,
      storedCodeVerifier,
    });
    const response = NextResponse.redirect(new URL("/workspace", request.url));

    response.cookies.set(
      SESSION_COOKIE,
      createSessionCookieValue({
        email: identity.email,
        name: identity.name,
        authStrategy: "oidc",
      }),
      getSessionCookieOptions(),
    );
    response.cookies.delete(OIDC_STATE_COOKIE);
    response.cookies.delete(OIDC_CODE_VERIFIER_COOKIE);

    await logAuditEvent({
      actorEmail: identity.email,
      action: "auth.login.oidc",
      entityType: "auth",
      entityId: identity.email,
      detail: "Successful enterprise SSO sign-in",
    });

    return response;
  } catch (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "sso_failed",
    );
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(OIDC_STATE_COOKIE);
    response.cookies.delete(OIDC_CODE_VERIFIER_COOKIE);
    return response;
  }
}
