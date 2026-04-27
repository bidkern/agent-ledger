"use client";

import { useActionState, useEffect } from "react";
import {
  openBillingPortalAction,
  startCheckoutAction,
  syncBillingAction,
  type BillingActionState,
} from "@/app/workspace/billing/actions";
import type { BillingConfig } from "@/data/types";

const initialState: BillingActionState = {
  error: "",
  success: "",
  redirectUrl: undefined,
};

function useRedirect(state: BillingActionState) {
  useEffect(() => {
    if (state.redirectUrl) {
      window.location.assign(state.redirectUrl);
    }
  }, [state.redirectUrl]);
}

export function BillingQuickActions({ config }: { config: BillingConfig }) {
  const [syncState, syncAction, syncPending] = useActionState(
    syncBillingAction,
    initialState,
  );
  const [checkoutState, checkoutAction, checkoutPending] = useActionState(
    startCheckoutAction,
    initialState,
  );
  const [portalState, portalAction, portalPending] = useActionState(
    openBillingPortalAction,
    initialState,
  );
  const stripeEnabled = config.stripeMode !== "manual";

  useRedirect(checkoutState);
  useRedirect(portalState);

  return (
    <div className="space-y-4">
      <div className="soft-card rounded-[1.5rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Current mode</p>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              stripeEnabled
                ? "border-success/18 bg-green-50 text-success"
                : "border-line bg-white text-muted"
            }`}
          >
            {config.stripeMode}
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">
          {stripeEnabled
            ? "Stripe-backed actions are enabled for this workspace."
            : "Stripe-backed actions are disabled until you switch out of manual mode."}
        </p>
      </div>

      <div className="soft-card rounded-[1.5rem] p-5">
        <p className="field-label">Step 1</p>
        <p className="mt-3 text-sm font-semibold text-ink">Sync billing state</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Pull the latest customer and subscription details from Stripe and write
          them back into the Agent Ledger billing record.
        </p>
        <form action={syncAction} className="mt-4">
          <button
            type="submit"
            disabled={syncPending || !stripeEnabled}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncPending ? "Syncing..." : "Sync with Stripe"}
          </button>
        </form>
        {!stripeEnabled ? (
          <p className="mt-3 text-sm leading-7 text-muted">
            Save the billing config in Stripe test or live mode before syncing.
          </p>
        ) : null}
        <ActionMessage state={syncState} />
      </div>

      <div className="soft-card rounded-[1.5rem] p-5">
        <p className="field-label">Step 2</p>
        <p className="mt-3 text-sm font-semibold text-ink">Launch checkout</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Open a Stripe-hosted subscription checkout for the configured plan and
          store the resulting customer linkage in the billing record.
        </p>
        <form action={checkoutAction} className="mt-4">
          <button
            type="submit"
            disabled={checkoutPending || !stripeEnabled}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutPending ? "Starting checkout..." : "Open Stripe Checkout"}
          </button>
        </form>
        {!stripeEnabled ? (
          <p className="mt-3 text-sm leading-7 text-muted">
            Save the billing config in Stripe test or live mode before opening
            checkout.
          </p>
        ) : null}
        <ActionMessage state={checkoutState} />
      </div>

      <div className="soft-card rounded-[1.5rem] p-5">
        <p className="field-label">Step 3</p>
        <p className="mt-3 text-sm font-semibold text-ink">Open customer portal</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Jump into the Stripe billing portal to inspect the customer, payment
          method, invoices, and active subscription.
        </p>
        <form action={portalAction} className="mt-4">
          <button
            type="submit"
            disabled={portalPending || !stripeEnabled}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {portalPending ? "Opening portal..." : "Open billing portal"}
          </button>
        </form>
        {!stripeEnabled ? (
          <p className="mt-3 text-sm leading-7 text-muted">
            The billing portal is only available when Stripe billing is enabled.
          </p>
        ) : null}
        <ActionMessage state={portalState} />
      </div>
    </div>
  );
}

function ActionMessage({ state }: { state: BillingActionState }) {
  if (state.error) {
    return (
      <p className="mt-4 rounded-2xl border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="mt-4 rounded-2xl border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
        {state.success}
      </p>
    );
  }

  return null;
}
