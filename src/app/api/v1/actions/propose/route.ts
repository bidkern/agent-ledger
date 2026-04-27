import { z } from "zod";
import { createGovernedActionRecord } from "@/data/governance";
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

const proposeActionSchema = z.object({
  agentId: z.string().trim().min(1, "agentId is required."),
  actionType: z.string().trim().min(2, "actionType is required."),
  target: z.string().trim().min(2, "target is required."),
  tool: z.string().trim().min(2, "tool is required."),
  vendor: z.string().trim().optional(),
  amountUsd: z.coerce.number().min(0).optional(),
  summary: z.string().trim().min(8, "summary is required."),
  reasoning: z.string().trim().min(8, "reasoning is required."),
});

export async function POST(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.actions.propose",
    actorKey: principal.id,
    limit: 240,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Action proposals are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = proposeActionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid action proposal payload.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  try {
    const result = await createGovernedActionRecord({
      ...parsed.data,
      actorEmail: `service:${principal.id}`,
      source: "api",
      requestedBy: principal.id,
      allowStatus: "allowed",
    });

    return Response.json(
      {
        decision: result.decision,
        status: result.status,
        actionLogId: result.log.id,
        approvalRequestId: result.approval?.id ?? null,
        policyHits: result.policyHits,
        policyReason: result.policyReason,
        projectedDailySpendUsd: result.projectedDailySpendUsd,
        projectedMonthlySpendUsd: result.projectedMonthlySpendUsd,
      },
      {
        status: 201,
        headers: privateHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to propose action.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }
}
