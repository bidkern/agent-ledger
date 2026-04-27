import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/data/auth";
import {
  exchangeOAuthCode,
  getOAuthCookieName,
  parseOAuthSession,
} from "@/data/oauth";
import {
  createVaultItem,
  getAgentRuntimeConnectionById,
  getVaultItemSecret,
  logAuditEvent,
  updateAgentRuntimeConnection,
} from "@/data/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await requireSession();

  if (process.env.ENABLE_RUNTIME_OAUTH?.trim().toLowerCase() !== "true") {
    redirect("/workspace/agents?connection=browser-profile");
  }

  const { connectionId } = await context.params;
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    redirect(
      `/workspace/agents?oauth=error&reason=${encodeURIComponent(errorDescription || error)}`,
    );
  }

  const connection = await getAgentRuntimeConnectionById(connectionId);

  if (!connection) {
    redirect("/workspace/agents?oauth=missing");
  }

  const cookieStore = await cookies();
  const cookieName = getOAuthCookieName(connection.id);
  const oauthSession = parseOAuthSession(cookieStore.get(cookieName)?.value);
  cookieStore.delete(cookieName);

  if (
    !oauthSession ||
    oauthSession.connectionId !== connection.id ||
    oauthSession.state !== state ||
    Date.now() - oauthSession.createdAt > 10 * 60 * 1000
  ) {
    redirect("/workspace/agents?oauth=state");
  }

  if (!code) {
    redirect("/workspace/agents?oauth=missing-code");
  }

  const clientSecret = connection.vaultItemId
    ? await getVaultItemSecret(connection.vaultItemId)
    : null;
  const token = await exchangeOAuthCode({
    connection,
    code,
    clientSecret,
  });
  const tokenVaultItem = await createVaultItem({
    label: `${connection.label} OAuth token`,
    kind: "api-key",
    provider: connection.provider,
    handle: connection.oauthClientId,
    secretValue: JSON.stringify(token),
    riskLevel: "high",
    notes: "OAuth token bundle created by Agent Ledger. Rotate from the provider if access should be revoked.",
  });
  await updateAgentRuntimeConnection({
    id: connection.id,
    status: "oauth-connected",
    tokenVaultItemId: tokenVaultItem.id,
    oauthConnectedAt: String(token.connected_at || new Date().toISOString()),
    oauthExpiresAt:
      typeof token.expires_at === "string" ? token.expires_at : undefined,
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "runtime-connection.oauth.connected",
    entityType: "runtime-connection",
    entityId: connection.id,
    detail: "Completed an optional runtime OAuth handshake.",
  });

  redirect("/workspace/agents?oauth=connected");
}
