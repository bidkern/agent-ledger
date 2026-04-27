"use client";

import { useActionState, type ReactNode } from "react";
import { createPolicyAction } from "@/app/workspace/policies/actions";

const initialState = {
  error: "",
  success: "",
  savedPolicyId: "",
};

export function PolicyForm() {
  const [state, formAction, pending] = useActionState(
    createPolicyAction,
    initialState,
  );

  return (
    <form action={formAction} className="panel rounded-[2rem] p-6 md:p-7">
      <p className="eyebrow text-xs font-medium text-muted">
        Policy rules
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">
        Define how the control plane should react
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
        Policies decide whether actions complete automatically, route to approval,
        or stop outright. This is where the product stops being a dashboard and
        becomes real infrastructure.
      </p>

      <div className="soft-card mt-6 rounded-[1.55rem] p-5">
        <p className="text-sm font-semibold text-ink">Start with one clear risk boundary.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <GuidePoint
            title="Block"
            text="Use for actions the system should never finish without a rule change."
          />
          <GuidePoint
            title="Review"
            text="Use when human judgment is still useful but the action should stay visible."
          />
          <GuidePoint
            title="Log"
            text="Use when you want observability first and enforcement later."
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Policy name"
          hint="Use a sentence operators can understand quickly in logs and approvals."
        >
          <input
            name="name"
            required
            className="input-surface"
            placeholder="Policy name"
          />
        </FieldBlock>
        <FieldBlock
          label="Category"
          hint="Choose the main risk surface this rule is watching."
        >
          <select
            name="category"
            defaultValue="spend"
            className="select-surface"
          >
            <option value="spend">Spend</option>
            <option value="tool">Tool allowlist</option>
            <option value="vendor">Vendor allowlist</option>
            <option value="data">Data egress</option>
            <option value="approval">Generic approval gate</option>
          </select>
        </FieldBlock>
        <FieldBlock
          label="Enforcement"
          hint="Review is the best default when you want a readable demo and safe rollout."
        >
          <select
            name="enforcement"
            defaultValue="review"
            className="select-surface"
          >
            <option value="block">Block</option>
            <option value="review">Review</option>
            <option value="log">Log only</option>
          </select>
        </FieldBlock>
        <FieldBlock
          label="Threshold"
          hint="Mostly useful for spend policies. Leave blank when it does not apply."
        >
          <input
            name="thresholdUsd"
            type="number"
            min="0"
            step="1"
            className="input-surface"
            placeholder="Threshold USD (optional)"
          />
        </FieldBlock>
      </div>

      <FieldBlock
        label="Applies to"
        hint="Comma-separated tools, vendors, or action keywords such as stripe, meta, export."
        className="mt-4"
      >
        <input
          name="appliesTo"
          className="input-surface"
          placeholder="Applies to, comma separated (tools, vendors, action keywords)"
        />
      </FieldBlock>

      <FieldBlock
        label="Why this exists"
        hint="This copy appears in the approval queue and is one of the fastest ways to explain the product."
        className="mt-4"
      >
        <textarea
          name="description"
          rows={6}
          required
          className="textarea-surface"
          placeholder="Why does this policy exist and what risk is it trying to control?"
        />
      </FieldBlock>

      {state.error ? (
        <p className="mt-4 rounded-2xl border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-2xl border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          {state.success} ID: {state.savedPolicyId}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Creating policy..." : "Create policy"}
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
