import { z } from "zod";
import { runAutonomousEngineTick } from "@/data/autonomous-engine";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const tickSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.autonomous.tick",
    actorKey: principal.id,
    limit: 360,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Autonomous engine ticks are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = tickSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid autonomous tick payload.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  const result = await runAutonomousEngineTick({
    actorEmail: `service:${principal.id}`,
    limit: parsed.data.limit,
  });

  return Response.json(
    {
      ...result,
      queued: result.queued.map((item) => ({
        agentId: item.agentId,
        agentName: item.agentName,
        runId: item.run.id,
        task: item.run.task,
        summary: item.run.summary,
        steps: item.run.steps,
        actionLogId: item.actionLogId,
        nextRunAt: item.nextRunAt,
      })),
    },
    {
      status: 200,
      headers: privateHeaders,
    },
  );
}
