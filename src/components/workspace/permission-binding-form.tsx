"use client";

import { useActionState, type ReactNode } from "react";
import { bindAgentPermissionAction } from "@/app/workspace/agents/actions";
import type { RegisteredAgent, VaultItem } from "@/data/types";

const initialState = {
  error: "",
  success: "",
  permissionId: "",
};

export function PermissionBindingForm({
  agents,
  vaultItems,
}: {
  agents: RegisteredAgent[];
  vaultItems: VaultItem[];
}) {
  const [state, formAction, pending] = useActionState(
    bindAgentPermissionAction,
    initialState,
  );
  const disabled = agents.length === 0 || vaultItems.length === 0;

  return (
    <form action={formAction} className="panel rounded-lg p-5 md:p-6">
      <p className="field-label">Step 4</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">
        Give one permission
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        Pick who can touch what, and what they can do.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FieldBlock label="Agent" hint="Who gets access.">
          <select name="agentId" required className="select-surface" disabled={disabled}>
            {agents.length === 0 ? <option value="">Create an agent first</option> : null}
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="Resource" hint="What it can touch.">
          <select
            name="vaultItemId"
            required
            className="select-surface"
            disabled={disabled}
          >
            {vaultItems.length === 0 ? (
              <option value="">Add a vault item first</option>
            ) : null}
            {vaultItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} / {item.kind}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="Action" hint="What it may do.">
          <select name="scope" defaultValue="read" className="select-surface">
            <option value="read">Read</option>
            <option value="draft">Draft</option>
            <option value="send">Send</option>
            <option value="spend">Spend</option>
            <option value="trade">Trade</option>
            <option value="admin">Admin</option>
            <option value="use">Use</option>
          </select>
        </FieldBlock>

        <FieldBlock label="Daily limit" hint="Optional money cap.">
          <input
            name="dailyLimitUsd"
            type="number"
            min="0"
            step="1"
            className="input-surface"
            placeholder="1"
          />
        </FieldBlock>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-md border border-line bg-white/82 p-4">
        <input
          name="requiresApproval"
          type="checkbox"
          defaultChecked
          className="mt-1 h-4 w-4 rounded border-line"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">
            Ask before using this
          </span>
          <span className="mt-1 block text-sm leading-7 text-muted">
            Use this for money, sends, trades, admin, and live accounts.
          </span>
        </span>
      </label>

      <FieldBlock
        label="Notes"
        hint="Optional safety rule."
        className="mt-4"
      >
        <textarea
          name="notes"
          rows={3}
          className="textarea-surface"
          placeholder="Only use for test purchases. Stop at approval before checkout."
        />
      </FieldBlock>

      {state.error ? (
        <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          {state.success} ID: {state.permissionId}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || disabled}
        className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Binding permission..." : "Bind permission"}
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
