import "server-only";

import Stripe from "stripe";
import {
  createGovernedActionRecord,
  recordGovernedActionResult,
} from "@/data/governance";

type GovernedRefundInput = {
  agentId: string;
  actorEmail: string;
  requestedBy?: string;
  reasoning: string;
  summary?: string;
  paymentIntentId?: string;
  chargeId?: string;
  amountCents?: number;
  reasonCode?: "duplicate" | "fraudulent" | "requested_by_customer";
  source?: "api" | "mcp" | "stripe-adapter";
};

type RefundTarget =
  | {
      kind: "payment_intent";
      id: string;
      amountCents: number;
      targetLabel: string;
    }
  | {
      kind: "charge";
      id: string;
      amountCents: number;
      targetLabel: string;
    };

let guardedStripeClient: Stripe | null = null;

function getGuardedStripeSecretKey() {
  const secretKey =
    process.env.GOVERNED_STRIPE_SECRET_KEY?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "Configure GOVERNED_STRIPE_SECRET_KEY or STRIPE_SECRET_KEY before using governed Stripe actions.",
    );
  }

  return secretKey;
}

function getGuardedStripeClient() {
  if (!guardedStripeClient) {
    guardedStripeClient = new Stripe(getGuardedStripeSecretKey(), {
      appInfo: {
        name: "Agent Ledger Guarded Actions",
      },
    });
  }

  return guardedStripeClient;
}

async function resolveRefundTarget(input: GovernedRefundInput): Promise<RefundTarget> {
  if (!input.paymentIntentId && !input.chargeId) {
    throw new Error("Provide paymentIntentId or chargeId for the refund target.");
  }

  if (input.paymentIntentId) {
    const paymentIntent = await getGuardedStripeClient().paymentIntents.retrieve(
      input.paymentIntentId,
    );
    const amountCents =
      input.amountCents ??
      (paymentIntent.amount_received || paymentIntent.amount);

    return {
      kind: "payment_intent",
      id: paymentIntent.id,
      amountCents,
      targetLabel: `Stripe payment intent ${paymentIntent.id}`,
    };
  }

  const charge = await getGuardedStripeClient().charges.retrieve(input.chargeId!);
  const amountCents =
    input.amountCents ?? (charge.amount_captured || charge.amount);

  return {
    kind: "charge",
    id: charge.id,
    amountCents,
    targetLabel: `Stripe charge ${charge.id}`,
  };
}

export async function createGovernedStripeRefund(input: GovernedRefundInput) {
  const target = await resolveRefundTarget(input);
  const amountUsd = target.amountCents / 100;
  const proposed = await createGovernedActionRecord({
    agentId: input.agentId,
    actionType: "refund",
    target: target.targetLabel,
    tool: "stripe",
    vendor: "Stripe",
    amountUsd,
    summary:
      input.summary ||
      `Requested Stripe refund against ${target.targetLabel}.`,
    reasoning: input.reasoning,
    actorEmail: input.actorEmail,
    source: input.source ?? "stripe-adapter",
    requestedBy: input.requestedBy,
    allowStatus: "allowed",
  });

  if (proposed.decision !== "allow") {
    return {
      ...proposed,
      refund: null,
    };
  }

  try {
    const refund = await getGuardedStripeClient().refunds.create({
      ...(target.kind === "payment_intent"
        ? { payment_intent: target.id }
        : { charge: target.id }),
      amount: target.amountCents,
      reason: input.reasonCode,
      metadata: {
        agentLedgerActionLogId: proposed.log.id,
        agentLedgerAgentId: input.agentId,
        requestedBy: input.requestedBy || "service",
      },
    });

    const updatedLog = await recordGovernedActionResult({
      actionLogId: proposed.log.id,
      status: "completed",
      actorEmail: input.actorEmail,
      externalReferenceId: refund.id,
      resultDetail: `Stripe refund ${refund.id} created for ${amountUsd.toFixed(2)} USD-equivalent cents value.`,
    });

    return {
      ...proposed,
      log: updatedLog,
      refund: {
        id: refund.id,
        status: refund.status,
        amountCents: refund.amount,
        amountUsd: refund.amount / 100,
      },
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Stripe refund creation failed.";

    await recordGovernedActionResult({
      actionLogId: proposed.log.id,
      status: "failed",
      actorEmail: input.actorEmail,
      resultDetail: detail,
    });

    throw new Error(detail);
  }
}
