"use client";

import { useActionState, type ReactNode } from "react";
import { createVaultItemAction } from "@/app/workspace/agents/actions";

const initialState = {
  error: "",
  success: "",
  vaultItemId: "",
};

export function VaultForm() {
  const [state, formAction, pending] = useActionState(
    createVaultItemAction,
    initialState,
  );

  return (
    <form action={formAction} className="panel rounded-lg p-5 md:p-6">
      <p className="field-label">Step 3</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">
        Add one resource
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        This is something the agent may touch, like a test repo, inbox, folder,
        or public wallet address.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FieldBlock label="Name" hint="Keep it short.">
          <input
            name="label"
            required
            className="input-surface"
            placeholder="Test card ending 1234"
          />
        </FieldBlock>

        <FieldBlock label="Type" hint="What is it?">
          <select name="kind" defaultValue="api-key" className="select-surface">
            <option value="email">Email account</option>
            <option value="payment-card">Payment card</option>
            <option value="bank-reference">Bank reference</option>
            <option value="wallet">Wallet</option>
            <option value="api-key">API key</option>
            <option value="file-folder">File or folder</option>
            <option value="browser-profile">Isolated browser profile</option>
            <option value="environment">Environment variable</option>
            <option value="custom">Custom</option>
          </select>
        </FieldBlock>

        <FieldBlock label="Provider" hint="Optional.">
          <input
            name="provider"
            className="input-surface"
            placeholder="Provider"
          />
        </FieldBlock>

        <FieldBlock label="Handle" hint="URL, email, address, or path.">
          <input
            name="handle"
            className="input-surface"
          placeholder="sandbox repo, test inbox, or wallet alias"
          />
        </FieldBlock>

        <FieldBlock label="Risk" hint="Use high for money or admin.">
          <select name="riskLevel" defaultValue="medium" className="select-surface">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </FieldBlock>

        <FieldBlock
          label="Secret value"
          hint="API keys only. Never paste wallet keys, seed phrases, bank logins, card numbers, or passwords."
        >
          <input
            name="secretValue"
            type="password"
            className="input-surface"
            placeholder="API key or narrow token only"
            autoComplete="off"
          />
        </FieldBlock>
      </div>

      <FieldBlock
        label="Notes"
        hint="One safety rule."
        className="mt-4"
      >
        <textarea
          name="notes"
          rows={3}
          className="textarea-surface"
          placeholder="Fresh environment only. Do not use for production funds."
        />
      </FieldBlock>

      {state.error ? (
        <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          {state.success} ID: {state.vaultItemId}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Saving vault item..." : "Add vault item"}
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
