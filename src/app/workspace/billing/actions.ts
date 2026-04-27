"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/data/auth";
import {
  prepareBillingCheckout,
  prepareBillingPortal,
  syncBillingStateFromStripe,
} from "@/data/billing";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import { logAuditEvent, upsertBillingConfig } from "@/data/repository";
import {
  getStripeConfigurationError,
  getStripePriceIdForPlan,
} from "@/data/stripe";

export type BillingActionState = {
  error: string;
  success: string;
  redirectUrl?: string;
};

const billingSchema = z.object({
  companyName: z.string().trim().min(2, "Enter a company name."),
  plan: z.enum(["starter", "team", "growth", "enterprise"]),
  stripeMode: z.enum(["manual", "test", "live"]),
  billingEmail: z.string().trim().email("Enter a valid billing email."),
  baseFeeUsd: z.coerce.number().min(0, "Base fee must be zero or higher."),
  perAgentUsd: z.coerce.number().min(0, "Per-agent fee must be zero or higher."),
  perThousandActionsUsd: z.coerce
    .number()
    .min(0, "Per-thousand-actions fee must be zero or higher."),
  notes: z.string().trim().min(4, "Add a short billing note."),
});

function revalidateBillingPaths() {
  revalidatePath("/workspace");
  revalidatePath("/workspace/billing");
}

export async function updateBillingAction(
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "billing.update",
    actorKey: session.email,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Billing updates are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
    };
  }

  const parsed = billingSchema.safeParse({
    companyName: formData.get("companyName"),
    plan: formData.get("plan"),
    stripeMode: formData.get("stripeMode"),
    billingEmail: formData.get("billingEmail"),
    baseFeeUsd: formData.get("baseFeeUsd"),
    perAgentUsd: formData.get("perAgentUsd"),
    perThousandActionsUsd: formData.get("perThousandActionsUsd"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to update billing config.",
      success: "",
    };
  }

  const stripeError = getStripeConfigurationError({
    mode: parsed.data.stripeMode,
    plan: parsed.data.plan,
  });

  if (stripeError) {
    return {
      error: stripeError,
      success: "",
    };
  }

  const config = await upsertBillingConfig({
    ...parsed.data,
    stripePriceId:
      parsed.data.stripeMode === "manual"
        ? undefined
        : getStripePriceIdForPlan(parsed.data.plan) ?? undefined,
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "billing.updated",
    entityType: "billing",
    entityId: config.id,
    detail: `Updated billing config for ${config.companyName} on the ${config.plan} plan`,
  });

  revalidateBillingPaths();

  return {
    error: "",
    success: "Updated the Agent Ledger billing configuration.",
    redirectUrl: undefined,
  };
}

export async function syncBillingAction(
  _previousState: BillingActionState,
): Promise<BillingActionState> {
  void _previousState;
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "billing.sync",
    actorKey: session.email,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Stripe sync is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      redirectUrl: undefined,
    };
  }

  try {
    const config = await syncBillingStateFromStripe();

    await logAuditEvent({
      actorEmail: session.email,
      action: "billing.synced",
      entityType: "billing",
      entityId: config.id,
      detail: `Synced Stripe billing state. Subscription status is ${config.stripeSubscriptionStatus}.`,
    });

    revalidateBillingPaths();

    return {
      error: "",
      success: "Synced the latest Stripe customer and subscription state.",
      redirectUrl: undefined,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to sync the latest Stripe state.",
      success: "",
      redirectUrl: undefined,
    };
  }
}

export async function startCheckoutAction(
  _previousState: BillingActionState,
): Promise<BillingActionState> {
  void _previousState;
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "billing.checkout",
    actorKey: session.email,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Checkout launches are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      redirectUrl: undefined,
    };
  }

  try {
    const redirectUrl = await prepareBillingCheckout();

    await logAuditEvent({
      actorEmail: session.email,
      action: "billing.checkout.started",
      entityType: "billing",
      entityId: "default",
      detail: "Started a Stripe Checkout session from the billing console.",
    });

    revalidateBillingPaths();

    return {
      error: "",
      success: "Redirecting to Stripe Checkout...",
      redirectUrl,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to start the Stripe Checkout flow.",
      success: "",
      redirectUrl: undefined,
    };
  }
}

export async function openBillingPortalAction(
  _previousState: BillingActionState,
): Promise<BillingActionState> {
  void _previousState;
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "billing.portal",
    actorKey: session.email,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Portal launches are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      redirectUrl: undefined,
    };
  }

  try {
    const redirectUrl = await prepareBillingPortal();

    await logAuditEvent({
      actorEmail: session.email,
      action: "billing.portal.started",
      entityType: "billing",
      entityId: "default",
      detail: "Opened the Stripe billing portal from the founder console.",
    });

    revalidateBillingPaths();

    return {
      error: "",
      success: "Redirecting to the Stripe billing portal...",
      redirectUrl,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to open the Stripe billing portal.",
      success: "",
      redirectUrl: undefined,
    };
  }
}
