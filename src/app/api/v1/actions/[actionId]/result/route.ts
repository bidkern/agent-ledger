import { z } from "zod";
import { recordGovernedActionResult } from "@/data/governance";
import { getActionLogById } from "@/data/repository";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const actionResultSchema = z.object({
  status: z.enum(["completed", "failed"]),
  externalReferenceId: z.string().trim().optional(),
  resultDetail: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.actions.result",
    actorKey: principal.id,
    limit: 240,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Action result writes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const { actionId } = await context.params;
  const existing = await getActionLogById(actionId);

  if (!existing) {
    return Response.json(
      {
        error: "Action log not found.",
      },
      {
        status: 404,
        headers: privateHeaders,
      },
    );
  }

  if (existing.requestedBy && existing.requestedBy !== principal.id) {
    return Response.json(
      {
        error: "This service is not allowed to update that action log.",
      },
      {
        status: 403,
        headers: privateHeaders,
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = actionResultSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid action result payload.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  try {
    const updated = await recordGovernedActionResult({
      actionLogId: actionId,
      status: parsed.data.status,
      actorEmail: `service:${principal.id}`,
      externalReferenceId: parsed.data.externalReferenceId,
      resultDetail: parsed.data.resultDetail,
    });

    return Response.json(
      {
        actionLogId: updated.id,
        status: updated.status,
        externalReferenceId: updated.externalReferenceId ?? null,
        resultDetail: updated.resultDetail ?? null,
      },
      {
        status: 200,
        headers: privateHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record action result.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }
}
