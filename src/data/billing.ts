import "server-only";

import {
  getBillingConfig,
  listActionLogs,
  listAgents,
  listApprovals,
  updateBillingStripeState,
} from "@/data/repository";
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  syncStripeBillingState,
} from "@/data/stripe";

export async function getBillingSnapshot() {
  const [config, agents, logs, approvals] = await Promise.all([
    getBillingConfig(),
    listAgents(),
    listActionLogs(),
    listApprovals(),
  ]);

  const protectedLogs = logs.filter((log) =>
    ["completed", "approved"].includes(log.status),
  );
  const protectedSpendUsd = protectedLogs.reduce(
    (sum, log) => sum + (log.amountUsd ?? 0),
    0,
  );
  const meteredActions = protectedLogs.length;
  const projectedMrrUsd =
    config.baseFeeUsd +
    agents.length * config.perAgentUsd +
    Math.ceil(meteredActions / 1000) * config.perThousandActionsUsd;

  return {
    config,
    meteredActions,
    protectedSpendUsd,
    projectedMrrUsd,
    liveSubscriptionMrrUsd: config.stripeSubscriptionAmountUsd ?? null,
    hasStripeCustomer: Boolean(config.stripeCustomerId),
    hasStripeSubscription: Boolean(config.stripeSubscriptionId),
    pendingApprovals: approvals.filter((approval) => approval.status === "pending")
      .length,
  };
}

export async function prepareBillingCheckout() {
  const config = await getBillingConfig();
  const session = await createStripeCheckoutSession(config);

  await updateBillingStripeState({
    stripeCustomerId: session.customerId,
    stripeSubscriptionId: session.subscriptionId ?? config.stripeSubscriptionId,
    stripePriceId: session.priceId,
    stripeSubscriptionStatus:
      config.stripeMode === "manual"
        ? "manual"
        : config.stripeSubscriptionStatus === "manual"
          ? "checkout-required"
          : config.stripeSubscriptionStatus,
    lastSyncedAt: new Date().toISOString(),
  });

  return session.url;
}

export async function prepareBillingPortal() {
  const config = await getBillingConfig();
  const portal = await createStripePortalSession(config);

  if (portal.customerId !== config.stripeCustomerId) {
    await updateBillingStripeState({
      stripeCustomerId: portal.customerId,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  return portal.url;
}

export async function syncBillingStateFromStripe() {
  const config = await getBillingConfig();
  const synced = await syncStripeBillingState(config);

  return updateBillingStripeState(synced);
}
