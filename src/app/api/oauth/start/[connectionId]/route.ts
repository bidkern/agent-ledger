import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/data/auth";
import {
  buildOAuthAuthorizationUrl,
  createOAuthState,
  getOAuthCookieName,
  serializeOAuthSession,
} from "@/data/oauth";
import { getAgentRuntimeConnectionById, logAuditEvent } from "@/data/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await requireSession();

  if (process.env.ENABLE_RUNTIME_OAUTH?.trim().toLowerCase() !== "true") {
    redirect("/workspace/agents?connection=browser-profile");
  }

  const { connectionId } = await context.params;
  const connection = await getAgentRuntimeConnectionById(connectionId);

  if (!connection) {
    redirect("/workspace/agents?oauth=missing");
  }

  if (connection.authMethod !== "oauth") {
    redirect("/workspace/agents?oauth=not-oauth");
  }

  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set(
    getOAuthCookieName(connection.id),
    serializeOAuthSession({
      connectionId: connection.id,
      state,
      createdAt: Date.now(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    },
  );

  await logAuditEvent({
    actorEmail: session.email,
    action: "runtime-connection.oauth.started",
    entityType: "runtime-connection",
    entityId: connection.id,
    detail: "Started an optional runtime OAuth handshake.",
  });

  redirect(buildOAuthAuthorizationUrl({ connection, state }).toString());
}
