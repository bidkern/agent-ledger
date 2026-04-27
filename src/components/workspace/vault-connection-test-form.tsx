"use client";

import { useActionState } from "react";
import { testVaultConnectionAction } from "@/app/workspace/agents/actions";

const initialState = {
  error: "",
  success: "",
  status: "idle" as const,
  detail: "",
};

export function VaultConnectionTestForm({ vaultItemId }: { vaultItemId: string }) {
  const [state, formAction, pending] = useActionState(
    testVaultConnectionAction,
    initialState,
  );

  const message = state.detail || state.error || state.success;
  const messageClass =
    state.status === "pass"
      ? "border-success/15 bg-green-50 text-success"
      : state.status === "warning"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : state.status === "failed"
          ? "border-danger/15 bg-red-50 text-danger"
          : "border-line bg-white/88 text-muted";

  return (
    <div className="mt-4">
      <form action={formAction}>
        <input type="hidden" name="vaultItemId" value={vaultItemId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-line bg-white/92 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Testing..." : "Test real connection"}
        </button>
      </form>

      {message ? (
        <p className={`mt-3 rounded-md border px-3 py-3 text-sm leading-6 ${messageClass}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
