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
    <form action={formAction} className="panel rounded-[2rem] p-6 md:p-7">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
        Request access
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">
        Tell us how your team wants to govern agents
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
        This launch flow is intentionally high-touch. We want to understand the
        workflows, risks, and approval model your team needs before broader rollout.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          name="contactName"
          required
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          placeholder="Your name"
        />
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          placeholder="Work email"
        />
        <input
          name="companyName"
          required
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          placeholder="Company name"
        />
        <input
          name="companyUrl"
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          placeholder="Company URL (optional)"
        />
        <select
          name="teamSize"
          defaultValue="6-20"
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
        >
          <option value="1-5">1-5 employees</option>
          <option value="6-20">6-20 employees</option>
          <option value="21-50">21-50 employees</option>
          <option value="51+">51+ employees</option>
        </select>
        <select
          name="desiredLaunchWindow"
          defaultValue="this-quarter"
          className="w-full rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
        >
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
        className="mt-4 w-full rounded-[1.6rem] border border-line bg-white px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-accent"
        placeholder="What agents, automations, or high-risk workflows are you already running?"
      />

      <textarea
        name="notes"
        rows={5}
        required
        className="mt-4 w-full rounded-[1.6rem] border border-line bg-white px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-accent"
        placeholder="What decisions should be auto-approved, escalated, or blocked in your environment?"
      />

      {state.error ? (
        <p className="mt-4 rounded-2xl border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-2xl border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          {state.success} Request ID: {state.savedRequestId}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Submitting request..." : "Request access"}
      </button>
    </form>
  );
}
