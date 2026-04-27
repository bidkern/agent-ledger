import { NextResponse } from "next/server";
import { buildOidcLogoutUrl } from "@/data/oidc";
import { SESSION_COOKIE } from "@/data/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.redirect(await buildOidcLogoutUrl());
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
