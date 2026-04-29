"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { enterDemoWorkspace, login } from "@/app/actions/auth";

const initialState = {
  error: "",
};

type LoginFormProps = {
  demoCredentials?: {
    email: string;
    accessCode: string;
  } | null;
};

export function LoginForm({ demoCredentials = null }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [demoState, demoAction, demoPending] = useActionState(
    enterDemoWorkspace,
    initialState,
  );
  const searchParams = useSearchParams();
  const shouldPrefillDemo = searchParams.get("demo") === "1" && demoCredentials;
  const [email, setEmail] = useState(() =>
    shouldPrefillDemo ? demoCredentials.email : "",
  );
  const [accessCode, setAccessCode] = useState(() =>
    shouldPrefillDemo ? demoCredentials.accessCode : "",
  );
  const localDemoEnabled = Boolean(demoCredentials);

  function fillDemoCredentials() {
    if (!demoCredentials) {
      return;
    }

    setEmail(demoCredentials.email);
    setAccessCode(demoCredentials.accessCode);
  }

  const errorMessage = state.error || demoState.error;

  return (
    <div className="space-y-5">
      {localDemoEnabled ? (
        <div className="retro-window">
          <div className="retro-titlebar retro-titlebar-green">
            <span>Demo mode</span>
            <span>Seeded sample data</span>
          </div>
          <div className="retro-window-body">
            <p className="text-sm leading-7 text-muted">
              Open a seeded workspace with sample agents, vault items, permissions,
              and runs.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={fillDemoCredentials}>
                Fill form
              </button>
              <form action={demoAction}>
                <button type="submit" disabled={demoPending}>
                  {demoPending ? "Opening..." : "Enter demo"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <form action={formAction} className="space-y-5">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div className="space-y-2">
          <label htmlFor="email" className="field-label">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full"
            placeholder="founder@agentledger.ai"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="accessCode" className="field-label">
            Access code
          </label>
          <input
            id="accessCode"
            name="accessCode"
            type="password"
            autoComplete="current-password"
            required
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            className="w-full"
            placeholder="Use the founder access code"
          />
        </div>

        {errorMessage ? (
          <p className="retro-inset border-[#7d0016] bg-[#ffe1e1] px-4 py-3 text-sm text-[#7d0016]">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking..." : "Enter workspace"}
        </button>
      </form>
    </div>
  );
}
