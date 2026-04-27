import type Stripe from "stripe";
import { syncBillingStateFromStripe } from "@/data/billing";
import { logAuditEvent, updateBillingStripeState } from "@/data/repository";
import { parseStripeWebhookEvent } from "@/data/stripe";

export const dynamic = "force-dynamic";

function getObjectId(value: string | { id: string } | null) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature.", { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = parseStripeWebhookEvent(payload, signature);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      await updateBillingStripeState({
        stripeCustomerId: getObjectId(session.customer),
        stripeSubscriptionId: getObjectId(session.subscription),
      });
    }

    if (
      event.type.startsWith("customer.subscription.") ||
      event.type.startsWith("invoice.") ||
      event.type === "checkout.session.completed"
    ) {
      const config = await syncBillingStateFromStripe();

      await logAuditEvent({
        actorEmail: config.billingEmail,
        action: `billing.webhook.${event.type}`,
        entityType: "billing",
        entityId: config.id,
        detail: `Stripe webhook processed. Subscription status is ${config.stripeSubscriptionStatus}.`,
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Webhook verification failed.",
      {
        status: 400,
      },
    );
  }
}
