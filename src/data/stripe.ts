import "server-only";

import Stripe from "stripe";
import { getAppUrlString } from "@/data/runtime";
import type {
  BillingConfig,
  BillingPlan,
  BillingStatus,
  StripeMode,
} from "@/data/types";

type StripeSyncState = {
  stripePriceId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus: BillingStatus;
  stripeSubscriptionAmountUsd?: number | null;
  stripeCurrentPeriodEnd?: string | null;
  lastSyncedAt: string;
};

let stripeClient: Stripe | null = null;

function now() {
  return new Date().toISOString();
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be configured for Stripe billing.");
  }

  return secretKey;
}

function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET must be configured before Stripe webhooks can be verified.",
    );
  }

  return webhookSecret;
}

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      appInfo: {
        name: "Agent Ledger",
      },
    });
  }

  return stripeClient;
}

function buildUrl(path: string) {
  return new URL(path, `${getAppUrlString()}/`).toString();
}

function getCheckoutSuccessUrl() {
  return (
    process.env.STRIPE_BILLING_SUCCESS_URL?.trim() ||
    buildUrl("/workspace/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}")
  );
}

function getCheckoutCancelUrl() {
  return (
    process.env.STRIPE_BILLING_CANCEL_URL?.trim() ||
    buildUrl("/workspace/billing?checkout=canceled")
  );
}

function getPortalReturnUrl() {
  return (
    process.env.STRIPE_BILLING_PORTAL_RETURN_URL?.trim() ||
    buildUrl("/workspace/billing")
  );
}

function getPortalConfigurationId() {
  return process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined;
}

export function getStripeKeyMode(): Exclude<StripeMode, "manual"> | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return null;
}

export function getStripePriceIdForPlan(plan: BillingPlan) {
  switch (plan) {
    case "starter":
      return process.env.STRIPE_PRICE_STARTER?.trim() || null;
    case "team":
      return process.env.STRIPE_PRICE_TEAM?.trim() || null;
    case "growth":
      return process.env.STRIPE_PRICE_GROWTH?.trim() || null;
    case "enterprise":
      return process.env.STRIPE_PRICE_ENTERPRISE?.trim() || null;
  }
}

export function getStripeConfigurationError(input: {
  mode: StripeMode;
  plan: BillingPlan;
}) {
  if (input.mode === "manual") {
    return null;
  }

  const keyMode = getStripeKeyMode();

  if (!keyMode) {
    return "Configure STRIPE_SECRET_KEY before enabling Stripe billing.";
  }

  if (keyMode !== input.mode) {
    return `The configured STRIPE_SECRET_KEY is a ${keyMode} key, so billing mode must also be ${keyMode}.`;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return "Configure STRIPE_WEBHOOK_SECRET before enabling Stripe billing.";
  }

  if (!getStripePriceIdForPlan(input.plan)) {
    return `Configure STRIPE_PRICE_${input.plan.toUpperCase()} before enabling the ${input.plan} plan in Stripe billing mode.`;
  }

  return null;
}

async function findCustomerById(customerId?: string) {
  if (!customerId) {
    return null;
  }

  try {
    const customer = await getStripeClient().customers.retrieve(customerId);
    return "deleted" in customer && customer.deleted ? null : customer;
  } catch {
    return null;
  }
}

async function findCustomerByEmail(email: string) {
  if (!email) {
    return null;
  }

  const customers = await getStripeClient().customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] ?? null;
}

async function ensureCustomer(config: BillingConfig) {
  const existingById = await findCustomerById(config.stripeCustomerId);

  if (existingById) {
    return existingById;
  }

  const existingByEmail = await findCustomerByEmail(config.billingEmail);

  if (existingByEmail) {
    return existingByEmail;
  }

  return getStripeClient().customers.create({
    email: config.billingEmail,
    name: config.companyName,
    metadata: {
      app: "agent-ledger",
      billingConfigId: config.id,
      companyName: config.companyName,
      plan: config.plan,
    },
  });
}

function normalizeStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "unpaid":
      return "unpaid";
    case "paused":
      return "paused";
  }

  return "incomplete";
}

function getPreferredSubscription(subscriptions: Stripe.Subscription[]) {
  if (subscriptions.length === 0) {
    return null;
  }

  const priority: Record<BillingStatus, number> = {
    active: 1,
    trialing: 2,
    past_due: 3,
    incomplete: 4,
    unpaid: 5,
    paused: 6,
    canceled: 7,
    incomplete_expired: 8,
    "checkout-required": 9,
    manual: 10,
  };

  return [...subscriptions].sort((left, right) => {
    const leftPriority = priority[normalizeStatus(left.status)];
    const rightPriority = priority[normalizeStatus(right.status)];

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.created - left.created;
  })[0];
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id;
}

function getSubscriptionAmountUsd(subscription: Stripe.Subscription) {
  const totalCents = subscription.items.data.reduce((sum, item) => {
    const unitAmount = item.price?.unit_amount ?? 0;
    return sum + unitAmount * (item.quantity ?? 1);
  }, 0);

  return totalCents > 0 ? totalCents / 100 : undefined;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const latestItemPeriodEnd = subscription.items.data.reduce<number | null>(
    (latest, item) =>
      latest === null ? item.current_period_end : Math.max(latest, item.current_period_end),
    null,
  );

  return typeof latestItemPeriodEnd === "number"
    ? new Date(latestItemPeriodEnd * 1000).toISOString()
    : undefined;
}

async function findSubscription(config: BillingConfig, customerId?: string) {
  if (config.stripeSubscriptionId) {
    try {
      return await getStripeClient().subscriptions.retrieve(
        config.stripeSubscriptionId,
      );
    } catch {
      // Fall through to customer search below.
    }
  }

  if (!customerId) {
    return null;
  }

  const subscriptions = await getStripeClient().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  return getPreferredSubscription(subscriptions.data);
}

export async function createStripeCheckoutSession(config: BillingConfig) {
  if (config.stripeMode === "manual") {
    throw new Error("Switch billing mode to Stripe test or live before checkout.");
  }

  const priceId = getStripePriceIdForPlan(config.plan);

  if (!priceId) {
    throw new Error(
      `The ${config.plan} plan does not have a Stripe price id configured.`,
    );
  }

  const customer = await ensureCustomer(config);
  const session = await getStripeClient().checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: config.id,
    success_url: getCheckoutSuccessUrl(),
    cancel_url: getCheckoutCancelUrl(),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      app: "agent-ledger",
      billingConfigId: config.id,
      companyName: config.companyName,
      plan: config.plan,
    },
    subscription_data: {
      metadata: {
        app: "agent-ledger",
        billingConfigId: config.id,
        companyName: config.companyName,
        plan: config.plan,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return {
    url: session.url,
    customerId: customer.id,
    priceId,
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id,
  };
}

export async function createStripePortalSession(config: BillingConfig) {
  if (config.stripeMode === "manual") {
    throw new Error("Billing portal is only available when Stripe billing is enabled.");
  }

  const customer = await ensureCustomer(config);
  const portalSession = await getStripeClient().billingPortal.sessions.create({
    customer: customer.id,
    return_url: getPortalReturnUrl(),
    ...(getPortalConfigurationId()
      ? { configuration: getPortalConfigurationId() }
      : {}),
  });

  return {
    url: portalSession.url,
    customerId: customer.id,
  };
}

export async function syncStripeBillingState(
  config: BillingConfig,
): Promise<StripeSyncState> {
  if (config.stripeMode === "manual") {
    return {
      stripePriceId: config.stripePriceId ?? null,
      stripeCustomerId: config.stripeCustomerId ?? null,
      stripeSubscriptionId: config.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: "manual",
      stripeSubscriptionAmountUsd: null,
      stripeCurrentPeriodEnd: null,
      lastSyncedAt: now(),
    };
  }

  const configuredPriceId = getStripePriceIdForPlan(config.plan) ?? config.stripePriceId;
  const customer = await (async () => {
    const existingById = await findCustomerById(config.stripeCustomerId);
    return existingById ?? findCustomerByEmail(config.billingEmail);
  })();

  if (!customer) {
    return {
      stripePriceId: configuredPriceId ?? undefined,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "checkout-required",
      stripeSubscriptionAmountUsd: null,
      stripeCurrentPeriodEnd: null,
      lastSyncedAt: now(),
    };
  }

  const subscription = await findSubscription(config, customer.id);

  if (!subscription) {
    return {
      stripePriceId: configuredPriceId ?? undefined,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "checkout-required",
      stripeSubscriptionAmountUsd: null,
      stripeCurrentPeriodEnd: null,
      lastSyncedAt: now(),
    };
  }

  return {
    stripePriceId: getSubscriptionPriceId(subscription) ?? configuredPriceId ?? undefined,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: normalizeStatus(subscription.status),
    stripeSubscriptionAmountUsd: getSubscriptionAmountUsd(subscription),
    stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    lastSyncedAt: now(),
  };
}

export function parseStripeWebhookEvent(payload: string, signature: string) {
  return getStripeClient().webhooks.constructEvent(
    payload,
    signature,
    getStripeWebhookSecret(),
  );
}
