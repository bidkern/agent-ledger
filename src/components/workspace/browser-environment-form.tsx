"use client";

import { useActionState, type ReactNode } from "react";
import { createBrowserEnvironmentAction } from "@/app/workspace/agents/actions";

const initialState = {
  error: "",
  success: "",
  connectionId: "",
  vaultItemId: "",
  commands: [] as string[],
};

export function BrowserEnvironmentForm() {
  const [state, formAction, pending] = useActionState(
    createBrowserEnvironmentAction,
    initialState,
  );

  return (
    <section className="rounded-lg border border-line bg-white/70 p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="field-label">Browser account</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Save a fresh browser profile
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
            Use this when an agent needs a website account. You sign in manually.
            Agent Ledger stores only the profile reference.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white/84 px-4 py-3 text-sm leading-6 text-muted">
          No passwords stored.
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" hint="Something you recognize.">
              <input
                name="label"
                required
                className="input-surface"
                placeholder="GitHub sandbox browser"
              />
            </Field>

            <Field label="Profile" hint="Optional. We can generate it.">
              <input
                name="profileName"
                className="input-surface"
                placeholder="github-sandbox"
              />
            </Field>
          </div>

          <Field label="Login URL" hint="Where you sign in.">
            <input
              name="loginUrl"
              type="url"
              className="input-surface"
              placeholder="https://github.com/login"
            />
          </Field>

          <Field
            label="Bridge reference"
            hint="Optional. Leave blank for a generic profile reference."
          >
            <input
              name="bridgeUrl"
              className="input-surface"
              placeholder="browser-profile:github-sandbox or http://localhost:7777"
            />
          </Field>

          <Field label="Rule" hint="One short safety note.">
            <textarea
              name="notes"
              rows={3}
              className="textarea-surface"
              placeholder="Use only the sandbox GitHub org. Require approval before opening PRs or pushing code."
            />
          </Field>

          {state.error ? (
            <p className="rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
              {state.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Saving environment..." : "Save browser environment"}
          </button>
        </form>

        <div className="rounded-md border border-line bg-white/84 p-4">
          <p className="text-sm font-semibold text-ink">
            What happens after saving
          </p>
          <div className="mt-4 grid gap-3">
            <Step
              label="1"
              text="Run the generated terminal commands or use the matching browser bridge."
            />
            <Step
              label="2"
              text="Sign into the fresh account yourself inside the isolated browser."
            />
            <Step
              label="3"
              text="Assign it to an agent and set strict permissions."
            />
          </div>

          {state.commands.length > 0 ? (
            <div className="mt-5">
              <p className="field-label">Neutral bridge setup template</p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-[#26323a] bg-[#11181d] p-4 text-xs leading-6 text-[#d7e6e0]">
                <code>{state.commands.join("\n")}</code>
              </pre>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-line bg-[#f7f9fc] p-4 text-sm leading-7 text-muted">
              Save this profile to get a neutral setup template.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-line bg-[#f7f9fc] px-3 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-sm font-semibold text-white">
        {label}
      </span>
      <p className="self-center text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      <p className="field-note">{hint}</p>
    </label>
  );
}
