import { z } from "zod";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import { listAgentRuns, listAgentRunsByStatus } from "@/data/repository";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const querySchema = z.object({
  status: z
    .enum(["queued", "running", "needs-approval", "completed", "failed", "paused"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.agent-runs.read",
    actorKey: principal.id,
    limit: 600,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Agent run reads are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") || undefined,
    limit: url.searchParams.get("limit") || "25",
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid agent run query.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  const runs = parsed.data.status
    ? await listAgentRunsByStatus(parsed.data.status, parsed.data.limit)
    : await listAgentRuns(parsed.data.limit);

  return Response.json(
    {
      serviceId: principal.id,
      runs,
    },
    {
      status: 200,
      headers: privateHeaders,
    },
  );
}
