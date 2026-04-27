"use client";

import { useActionState, type ReactNode } from "react";
import { updateBillingAction } from "@/app/workspace/billing/actions";
import type { BillingConfig } from "@/data/types";

const initialState = {
  error: "",
  success: "",
};

export function BillingForm({ config }: { config: BillingConfig }) {
  const [state, formAction, pending] = useActionState(
    updateBillingAction,
    initialState,
  );

  return (
    <form action={formAction} className="panel rounded-[2rem] p-6 md:p-7">
      <p className="eyebrow text-xs font-medium text-muted">
        Billing config
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">
        Set how the control plane should charge
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
        This config defines the company, plan, billing mode, and revenue model
        that the founder console will enforce. Stripe test and live modes require
        matching keys, prices, and webhook verification.
      </p>

      <div className="soft-card mt-6 rounded-[1.55rem] p-5">
        <p className="text-sm font-semibold text-ink">Billing is the monetization layer on top of governed execution.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <GuidePoint
            title="Manual"
            text="Use during procurement, pilots, or internal demos."
          />
          <GuidePoint
            title="Test"
            text="Use when you want the real Stripe lifecycle without charging live cards."
          />
          <GuidePoint
            title="Live"
            text="Use once price IDs, webhooks, and customer operations are production-ready."
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Company name"
          hint="This is the customer-facing billing identity."
          className="md:col-span-2"
        >
          <input
            name="companyName"
            type="text"
            defaultValue={config.companyName}
            className="input-surface"
            placeholder="Company name"
          />
        </FieldBlock>
        <FieldBlock
          label="Plan"
          hint="The pricing tier currently attached to this workspace."
        >
          <select
            name="plan"
            defaultValue={config.plan}
            className="select-surface"
          >
            <option value="starter">Starter</option>
            <option value="team">Team</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </FieldBlock>
        <FieldBlock
          label="Stripe mode"
          hint="Manual for demos, test for staging, live for production."
        >
          <select
            name="stripeMode"
            defaultValue={config.stripeMode}
            className="select-surface"
          >
            <option value="manual">Manual</option>
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </FieldBlock>
        <FieldBlock
          label="Billing email"
          hint="Where invoicing and account ownership communications should land."
        >
          <input
            name="billingEmail"
            type="email"
            defaultValue={config.billingEmail}
            className="input-surface"
            placeholder="Billing email"
          />
        </FieldBlock>
        <FieldBlock
          label="Base fee"
          hint="The fixed platform fee for access to the control plane."
        >
          <input
            name="baseFeeUsd"
            type="number"
            min="0"
            step="1"
            defaultValue={config.baseFeeUsd}
            className="input-surface"
            placeholder="Base fee"
          />
        </FieldBlock>
        <FieldBlock
          label="Per-agent fee"
          hint="Charge for each named worker the customer keeps active."
        >
          <input
            name="perAgentUsd"
            type="number"
            min="0"
            step="1"
            defaultValue={config.perAgentUsd}
            className="input-surface"
            placeholder="Per-agent fee"
          />
        </FieldBlock>
        <FieldBlock
          label="Per-thousand-actions fee"
          hint="Charge for governed action volume instead of raw token usage."
        >
          <input
            name="perThousandActionsUsd"
            type="number"
            min="0"
            step="1"
            defaultValue={config.perThousandActionsUsd}
            className="input-surface"
            placeholder="Per-thousand-actions fee"
          />
        </FieldBlock>
      </div>

      <FieldBlock
        label="Internal billing notes"
        hint="Useful for rollout notes, contract caveats, or Stripe migration reminders."
        className="mt-4"
      >
        <textarea
          name="notes"
          rows={6}
          defaultValue={config.notes}
          className="textarea-surface"
          placeholder="Billing notes"
        />
      </FieldBlock>

      {state.error ? (
        <p className="mt-4 rounded-2xl border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-2xl border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Saving billing config..." : "Save billing settings"}
      </button>
    </form>
  );
}

function FieldBlock({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      <p className="field-note">{hint}</p>
    </label>
  );
}

function GuidePoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-white/92 px-4 py-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}
