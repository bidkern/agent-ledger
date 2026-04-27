"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  createLocalAccountConnectionAction,
  createRuntimeConnectionAction,
} from "@/app/workspace/agents/actions";
import { VaultConnectionTestForm } from "@/components/workspace/vault-connection-test-form";
import type {
  AgentRuntimeAuthMethod,
  AgentRuntimeConnection,
  AgentRuntimeProvider,
} from "@/data/types";

const initialState = {
  error: "",
  success: "",
  connectionId: "",
};

const localAccountInitialState = {
  error: "",
  success: "",
  connectionId: "",
};

const providers: Array<{
  value: AgentRuntimeProvider;
  label: string;
  hint: string;
  defaultMethod: AgentRuntimeAuthMethod;
}> = [
  {
    value: "openai",
    label: "OpenAI",
    hint: "Use your OpenAI API project key.",
    defaultMethod: "api-key",
  },
  {
    value: "anthropic",
    label: "Claude / Anthropic",
    hint: "Use your Anthropic API key.",
    defaultMethod: "api-key",
  },
  {
    value: "google",
    label: "Google Gemini",
    hint: "Use a Google AI API key from a fresh project.",
    defaultMethod: "api-key",
  },
  {
    value: "xai",
    label: "xAI / Grok",
    hint: "Connect with provider API credentials.",
    defaultMethod: "api-key",
  },
  {
    value: "mistral",
    label: "Mistral",
    hint: "Connect with provider API credentials.",
    defaultMethod: "api-key",
  },
  {
    value: "perplexity",
    label: "Perplexity",
    hint: "Connect with provider API credentials.",
    defaultMethod: "api-key",
  },
  {
    value: "github",
    label: "GitHub / Copilot",
    hint: "Use a fine-grained token for code agents and repo work.",
    defaultMethod: "api-key",
  },
  {
    value: "microsoft",
    label: "Microsoft",
    hint: "Use a Graph token, app token, or isolated work profile.",
    defaultMethod: "api-key",
  },
  {
    value: "slack",
    label: "Slack",
    hint: "Use a Slack bot token for team communication agents.",
    defaultMethod: "api-key",
  },
  {
    value: "notion",
    label: "Notion",
    hint: "Use a Notion integration secret for docs and workspace agents.",
    defaultMethod: "api-key",
  },
  {
    value: "local-mcp",
    label: "Local MCP agent",
    hint: "Point Agent Ledger at a local or remote MCP bridge.",
    defaultMethod: "mcp",
  },
  {
    value: "browser-agent",
    label: "Browser agent",
    hint: "Connect browser agents tied to fresh profiles or local bridges.",
    defaultMethod: "local-app",
  },
  {
    value: "custom",
    label: "Custom runtime",
    hint: "Use any agent that can call REST, MCP, or a local bridge.",
    defaultMethod: "custom",
  },
];

export function RuntimeConnectionForm({
  connections,
}: {
  connections: AgentRuntimeConnection[];
}) {
  const [state, formAction, pending] = useActionState(
    createRuntimeConnectionAction,
    initialState,
  );
  const [localAccountState, localAccountAction, localAccountPending] =
    useActionState(createLocalAccountConnectionAction, localAccountInitialState);
  const [provider, setProvider] = useState<AgentRuntimeProvider>("openai");
  const [authMethod, setAuthMethod] =
    useState<AgentRuntimeAuthMethod>("api-key");
  const selectedProvider = providers.find((item) => item.value === provider);
  const credentialHelp = getCredentialHelp(provider, authMethod);
  const showEndpoint =
    authMethod === "mcp" || authMethod === "local-app" || authMethod === "custom";
  const showSecret = authMethod !== "local-app";

  function chooseProvider(nextProvider: AgentRuntimeProvider) {
    setProvider(nextProvider);
    const next = providers.find((item) => item.value === nextProvider);

    if (next) {
      setAuthMethod(next.defaultMethod);
    }
  }

  return (
    <section className="panel rounded-lg p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="field-label">Step 1</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Connect the brain
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Pick what powers the agent: OpenAI, Claude, a local agent, or a
            custom bridge.
          </p>
        </div>
        <div className="rounded-md border border-line bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
          {connections.length} connected runtime{connections.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form action={formAction} className="grid gap-4">
          <div className="rounded-md border border-line bg-[#f7f9fc] p-4">
            <p className="text-sm font-semibold text-ink">
              Already logged into Claude or Codex on this computer?
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use the local app login. No API key, password, or account token is
              stored in Agent Ledger.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                formAction={localAccountAction}
                formNoValidate
                name="localProvider"
                value="anthropic"
                disabled={localAccountPending}
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                Use Claude Code login
              </button>
              <button
                formAction={localAccountAction}
                formNoValidate
                name="localProvider"
                value="openai"
                disabled={localAccountPending}
                className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-70"
              >
                Use Codex login
              </button>
            </div>
            {localAccountState.error ? (
              <p className="mt-3 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
                {localAccountState.error}
              </p>
            ) : null}
            {localAccountState.success ? (
              <p className="mt-3 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
                {localAccountState.success}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-line bg-[#f7f9fc] p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-ink">{credentialHelp.title}</p>
            {credentialHelp.href ? (
              <a
                href={credentialHelp.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-ink"
              >
                {credentialHelp.linkLabel}
              </a>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Provider" hint={selectedProvider?.hint ?? "Choose a runtime."}>
              <select
                name="provider"
                value={provider}
                onChange={(event) =>
                  chooseProvider(event.target.value as AgentRuntimeProvider)
                }
                className="select-surface"
              >
                {providers.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type" hint="Most users start with API key.">
              <select
                name="authMethod"
                value={authMethod}
                onChange={(event) =>
                  setAuthMethod(event.target.value as AgentRuntimeAuthMethod)
                }
                className="select-surface"
              >
                <option value="api-key">API key or token</option>
                <option value="local-app">Fresh browser/work profile</option>
                <option value="mcp">MCP or agent bridge</option>
                <option value="custom">Custom endpoint</option>
              </select>
            </Field>
          </div>

          <Field label="Name" hint="This appears in Step 2.">
            <input
              name="label"
              required
              className="input-surface"
              placeholder="Claude work account"
            />
          </Field>

          {showSecret ? (
            <Field
              label="API key or access token"
              hint="Never paste passwords, wallet keys, card numbers, or bank logins."
            >
              <input
                name="secretValue"
                type="password"
                className="input-surface"
                autoComplete="off"
                placeholder="Paste key or token"
              />
            </Field>
          ) : null}

          {showEndpoint ? (
            <Field
              label={
                authMethod === "local-app"
                  ? "Browser profile or local app URL"
                  : "Bridge URL"
              }
              hint={
                authMethod === "local-app"
                  ? "Use a fresh profile, not your personal browser."
                  : "For local agents, MCP servers, or custom runtimes."
              }
            >
              <input
                name="endpointUrl"
                className="input-surface"
                placeholder={
                  authMethod === "local-app"
                    ? "Chrome Profile: New Agent Sandbox or http://localhost:7777"
                    : "http://localhost:7777/mcp or https://agent.example.com"
                }
              />
            </Field>
          ) : null}

          <Field label="Notes" hint="Optional. Keep it short.">
            <textarea
              name="notes"
              rows={3}
              className="textarea-surface"
              placeholder="Use for low-risk tests first. Require approval before external actions."
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
            {pending ? "Saving connection..." : "Save connection"}
          </button>
        </form>

        <div className="grid content-start gap-3">
          {connections.length > 0 ? (
            connections.slice(0, 6).map((connection) => (
              <RuntimeCard key={connection.id} connection={connection} />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-line bg-white/72 p-4 text-sm leading-7 text-muted">
              No runtimes yet. Connect OpenAI, Claude, a local MCP agent, or a
              custom bridge first.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RuntimeCard({ connection }: { connection: AgentRuntimeConnection }) {
  return (
    <article className="rounded-md border border-line bg-white/86 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-ink">{connection.label}</p>
          <p className="mt-1 text-sm text-muted">
            {connection.provider} / {connection.authMethod}
          </p>
        </div>
        <span className="rounded-md border border-line bg-[#f7f9fc] px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {connection.status}
        </span>
      </div>
      {connection.endpointUrl ? (
        <p className="mt-3 break-words text-sm leading-6 text-muted">
          {connection.endpointUrl}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {connection.vaultItemId ? (
          <VaultConnectionTestForm vaultItemId={connection.vaultItemId} />
        ) : null}
        {connection.tokenVaultItemId ? (
          <VaultConnectionTestForm vaultItemId={connection.tokenVaultItemId} />
        ) : null}
      </div>
      {connection.notes ? (
        <p className="mt-3 text-sm leading-6 text-muted">{connection.notes}</p>
      ) : null}
    </article>
  );
}

function getCredentialHelp(
  provider: AgentRuntimeProvider,
  authMethod: AgentRuntimeAuthMethod,
) {
  if (authMethod === "local-app") {
    return {
      title: "Use a fresh browser/work profile.",
      text:
        "Create a new browser profile, repo, inbox, wallet, or workspace for the agent. Agent Ledger stores the profile or bridge reference, not a personal password.",
      href: "",
      linkLabel: "",
    };
  }

  if (authMethod === "mcp" || authMethod === "custom") {
    return {
      title: "Paste the bridge URL.",
      text:
        "Start the local agent, MCP server, or custom worker first. Paste its URL here so Agent Ledger can assign it to a specialist agent.",
      href: "",
      linkLabel: "",
    };
  }

  switch (provider) {
    case "openai":
      return {
        title: "OpenAI uses an API key.",
        text:
          "Your ChatGPT login is not used here. Create an OpenAI API key, paste it once, and Agent Ledger can run OpenAI-powered agents.",
        href: "https://platform.openai.com/api-keys",
        linkLabel: "Open OpenAI API keys",
      };
    case "anthropic":
      return {
        title: "Claude uses an API key.",
        text:
          "Your Claude login is not used here. Create an Anthropic API key, paste it once, and Agent Ledger can run Claude-powered agents.",
        href: "https://console.anthropic.com/settings/keys",
        linkLabel: "Open Anthropic keys",
      };
    case "github":
      return {
        title: "GitHub uses a fine-grained token.",
        text:
          "Create a fresh repo or org for the agent, then create a fine-grained token limited to only that environment. Start with read-only access.",
        href: "https://github.com/settings/personal-access-tokens/new",
        linkLabel: "Create GitHub token",
      };
    case "slack":
      return {
        title: "Slack uses an app token.",
        text:
          "Create a test Slack workspace or dedicated app first. Copy a bot token and only grant the scopes this agent actually needs.",
        href: "https://api.slack.com/apps",
        linkLabel: "Open Slack apps",
      };
    case "notion":
      return {
        title: "Notion uses an integration secret.",
        text:
          "Create a clean Notion workspace or page set for the agent. Copy the integration secret and share only those pages.",
        href: "https://www.notion.so/my-integrations",
        linkLabel: "Open Notion integrations",
      };
    case "local-mcp":
    case "browser-agent":
      return {
        title: "Local agents use a bridge URL.",
        text:
          "Start the local agent or MCP server first, then paste its local URL here. Example: http://localhost:7777/mcp.",
        href: "",
        linkLabel: "",
      };
    default:
      return {
        title: "Use a key, token, or bridge.",
        text:
          "Make a fresh sandbox environment first, then connect it with developer keys, access tokens, integration secrets, or a local bridge. Do not paste a normal password.",
        href: "",
        linkLabel: "",
      };
  }
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
