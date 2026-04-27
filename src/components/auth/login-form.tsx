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
        <div className="border border-[#435149] bg-[#20282d] p-4">
          <p className="text-sm font-semibold text-[#f2f0e8]">Demo mode</p>
          <p className="mt-2 text-sm leading-7 text-[#c8d0cc]">
            Open a seeded workspace with sample agents, vault items, permissions,
            and runs.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="rounded-md border border-white/12 px-4 py-2 text-sm font-medium text-[#f2f0e8] transition hover:bg-white/8"
            >
              Fill form
            </button>
            <form action={demoAction}>
              <button
                type="submit"
                disabled={demoPending}
                className="rounded-md bg-[#e4ecdf] px-4 py-2 text-sm font-semibold text-[#172018] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {demoPending ? "Opening..." : "Enter demo"}
              </button>
            </form>
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
          <label htmlFor="email" className="text-sm font-medium text-[#f2f0e8]">
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
            className="w-full rounded-md border border-white/12 bg-[#11171a] px-4 py-3 text-sm text-[#f2f0e8] outline-none transition placeholder:text-[#7f8b8b] focus:border-[#9fb2aa]"
            placeholder="founder@agentledger.ai"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="accessCode" className="text-sm font-medium text-[#f2f0e8]">
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
            className="w-full rounded-md border border-white/12 bg-[#11171a] px-4 py-3 text-sm text-[#f2f0e8] outline-none transition placeholder:text-[#7f8b8b] focus:border-[#9fb2aa]"
            placeholder="Use the founder access code"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-[#8a3f34] bg-[#321c1a] px-4 py-3 text-sm text-[#ffb0a5]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[#f2f0e8] px-5 py-3 text-sm font-semibold text-[#12181c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Checking..." : "Enter workspace"}
        </button>
      </form>
    </div>
  );
}
