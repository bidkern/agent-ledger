import { z } from "zod";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import {
  getAgentRunById,
  logAuditEvent,
  updateAgentRun,
} from "@/data/repository";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const runResultSchema = z.object({
  status: z.enum(["running", "completed", "failed", "paused"]),
  summary: z.string().trim().min(4).optional(),
  steps: z.array(z.string().trim().min(1)).max(30).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.agent-runs.result",
    actorKey: principal.id,
    limit: 600,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Agent run updates are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const { runId } = await context.params;
  const existing = await getAgentRunById(runId);

  if (!existing) {
    return Response.json(
      {
        error: "Agent run not found.",
      },
      {
        status: 404,
        headers: privateHeaders,
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = runResultSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid agent run result.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  const updated = await updateAgentRun({
    id: runId,
    status: parsed.data.status,
    summary: parsed.data.summary,
    steps: parsed.data.steps,
  });

  if (!updated) {
    return Response.json(
      {
        error: "Unable to update agent run.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  await logAuditEvent({
    actorEmail: `service:${principal.id}`,
    action: `agent-run.${updated.status}`,
    entityType: "agent-run",
    entityId: updated.id,
    detail: updated.summary,
  });

  return Response.json(
    {
      run: updated,
    },
    {
      status: 200,
      headers: privateHeaders,
    },
  );
}
