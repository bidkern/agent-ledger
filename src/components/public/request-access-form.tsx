"use client";

import { useActionState } from "react";
import { requestAccess } from "@/app/actions/request-access";

const initialState = {
  error: "",
  success: "",
  savedRequestId: "",
};

export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(
    requestAccess,
    initialState,
  );

  return (
    <form action={formAction} className="retro-window">
      <div className="retro-titlebar retro-titlebar-green">
        <span>Request access form</span>
        <span>Founder review queue</span>
      </div>
      <div className="retro-window-body">
        <h2 className="text-2xl font-semibold text-ink">
          Tell us how your team wants to govern agents
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          This launch flow is intentionally high-touch. We want to understand the
          workflows, risks, and approval model your team needs before broader rollout.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input name="contactName" required placeholder="Your name" />
          <input name="email" type="email" required placeholder="Work email" />
          <input name="companyName" required placeholder="Company name" />
          <input name="companyUrl" placeholder="Company URL (optional)" />
          <select name="teamSize" defaultValue="6-20">
            <option value="1-5">1-5 employees</option>
            <option value="6-20">6-20 employees</option>
            <option value="21-50">21-50 employees</option>
            <option value="51+">51+ employees</option>
          </select>
          <select name="desiredLaunchWindow" defaultValue="this-quarter">
            <option value="immediately">Need it immediately</option>
            <option value="this-quarter">This quarter</option>
            <option value="next-quarter">Next quarter</option>
            <option value="exploring">Still exploring</option>
          </select>
        </div>

        <textarea
          name="currentAgentStack"
          rows={4}
          required
          className="mt-4"
          placeholder="What agents, automations, or high-risk workflows are you already running?"
        />

        <textarea
          name="notes"
          rows={5}
          required
          className="mt-4"
          placeholder="What decisions should be auto-approved, escalated, or blocked in your environment?"
        />

        {state.error ? (
          <p className="retro-inset mt-4 border-[#7d0016] bg-[#ffe1e1] px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="retro-inset mt-4 border-[#106d27] bg-[#e9ffdc] px-4 py-3 text-sm text-success">
            {state.success} Request ID: {state.savedRequestId}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="mt-5">
          {pending ? "Submitting request..." : "Request access"}
        </button>
      </div>
    </form>
  );
}
