import { z } from "zod";
import { createGovernedStripeRefund } from "@/data/guarded-stripe";
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

const refundSchema = z
  .object({
    agentId: z.string().trim().min(1, "agentId is required."),
    reasoning: z.string().trim().min(8, "reasoning is required."),
    summary: z.string().trim().optional(),
    paymentIntentId: z.string().trim().optional(),
    chargeId: z.string().trim().optional(),
    amountCents: z.coerce.number().int().positive().optional(),
    reasonCode: z
      .enum(["duplicate", "fraudulent", "requested_by_customer"])
      .optional(),
  })
  .refine(
    (value) => Boolean(value.paymentIntentId || value.chargeId),
    "Provide paymentIntentId or chargeId.",
  );

export async function POST(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.stripe.refund",
    actorKey: principal.id,
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Governed Stripe refunds are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = refundSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid refund payload.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }

  try {
    const result = await createGovernedStripeRefund({
      ...parsed.data,
      actorEmail: `service:${principal.id}`,
      requestedBy: principal.id,
      source: "api",
    });

    return Response.json(
      {
        decision: result.decision,
        status: result.log.status,
        actionLogId: result.log.id,
        approvalRequestId: result.approval?.id ?? null,
        policyHits: result.policyHits,
        policyReason: result.policyReason,
        refund: result.refund,
      },
      {
        status: result.decision === "allow" ? 201 : 202,
        headers: privateHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create governed Stripe refund.",
      },
      {
        status: 400,
        headers: privateHeaders,
      },
    );
  }
}
