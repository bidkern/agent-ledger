import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";
import { getVaultItemById, getVaultItemSecret } from "@/data/repository";
import type { VaultItem } from "@/data/types";

export type VaultConnectionTestStatus = "pass" | "warning" | "failed";

export type VaultConnectionTestResult = {
  status: VaultConnectionTestStatus;
  title: string;
  detail: string;
  checkedAt: string;
};

type KnownConnector =
  | "openai"
  | "anthropic"
  | "google"
  | "github"
  | "cloudflare"
  | "stripe"
  | "folder"
  | "wallet"
  | "email"
  | "browser-profile"
  | "generic";

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function hasAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function classifyConnector(item: VaultItem): KnownConnector {
  const text = [
    item.label,
    item.kind,
    item.provider,
    item.handle,
    item.notes,
  ]
    .map((value) => normalize(value))
    .join(" ");

  if (hasAny(text, ["openai", "chatgpt", "gpt"])) {
    return "openai";
  }

  if (hasAny(text, ["anthropic", "claude"])) {
    return "anthropic";
  }

  if (hasAny(text, ["google", "gmail", "calendar", "drive", "gemini"])) {
    return "google";
  }

  if (hasAny(text, ["github", "gh pat"])) {
    return "github";
  }

  if (hasAny(text, ["cloudflare", "workers", "pages", "dns"])) {
    return "cloudflare";
  }

  if (hasAny(text, ["stripe", "payment", "billing"])) {
    return "stripe";
  }

  if (item.kind === "file-folder") {
    return "folder";
  }

  if (item.kind === "wallet") {
    return "wallet";
  }

  if (item.kind === "email") {
    return "email";
  }

  if (item.kind === "browser-profile") {
    return "browser-profile";
  }

  return "generic";
}

function result(
  status: VaultConnectionTestStatus,
  title: string,
  detail: string,
): VaultConnectionTestResult {
  return {
    status,
    title,
    detail,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 12000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractAccessToken(secret: string) {
  const trimmed = secret.trim();

  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as { access_token?: string };
    return parsed.access_token?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

async function testOpenAI(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return result(
      "failed",
      "OpenAI key was rejected",
      `OpenAI returned HTTP ${response.status}. Check that the API key is active and has access to the selected model.`,
    );
  }

  return result(
    "pass",
    "OpenAI key works",
    "Agent Ledger authenticated with OpenAI. The in-app worker can use this key for real model-backed runs.",
  );
}

async function testAnthropic(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": accessToken,
    },
  });

  if (!response.ok) {
    return result(
      "failed",
      "Anthropic key was rejected",
      `Anthropic returned HTTP ${response.status}. Check that the API key is active and has model access.`,
    );
  }

  return result(
    "pass",
    "Anthropic key works",
    "Agent Ledger authenticated with Anthropic. Claude-backed agents can use this runtime connection.",
  );
}

async function testGoogle(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    {},
  );

  if (!response.ok) {
    return result(
      "failed",
      "Google token was rejected",
      `Google returned HTTP ${response.status}. Check that the token is active and scoped to a fresh test project.`,
    );
  }

  return result(
    "pass",
    "Google token works",
    "Google accepted the token. Keep Gmail, Drive, Calendar, and admin scopes as narrow as possible.",
  );
}

async function testGitHub(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Agent-Ledger",
    },
  });

  if (!response.ok) {
    return result(
      "failed",
      "GitHub token was rejected",
      `GitHub returned HTTP ${response.status}. Check the token value, expiration, and selected scopes.`,
    );
  }

  const body = (await response.json().catch(() => null)) as { login?: string } | null;
  return result(
    "pass",
    "GitHub token works",
    `GitHub authenticated${body?.login ? ` as ${body.login}` : ""}. Keep repository write, deploy, and admin scopes approval-gated.`,
  );
}

async function testCloudflare(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    return result(
      "failed",
      "Cloudflare token was rejected",
      `Cloudflare returned HTTP ${response.status}. Check that the API token is active and not copied with extra spaces.`,
    );
  }

  const body = (await response.json().catch(() => null)) as
    | { success?: boolean }
    | null;

  return result(
    body?.success === false ? "failed" : "pass",
    body?.success === false ? "Cloudflare token did not verify" : "Cloudflare token works",
    body?.success === false
      ? "Cloudflare responded, but the token verification result was unsuccessful."
      : "Cloudflare verified the token. Keep DNS, deploy, and account admin permissions approval-gated.",
  );
}

async function testStripe(secret: string) {
  const accessToken = extractAccessToken(secret);
  const response = await fetchWithTimeout("https://api.stripe.com/v1/balance", {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    return result(
      "failed",
      "Stripe key was rejected",
      `Stripe returned HTTP ${response.status}. Use a restricted or test-mode key while validating the agent flow.`,
    );
  }

  const mode = accessToken.startsWith("sk_live_")
    ? "live"
    : accessToken.startsWith("sk_test_")
      ? "test"
      : "unknown";

  return result(
    mode === "live" ? "warning" : "pass",
    mode === "live" ? "Stripe live key works" : "Stripe key works",
    mode === "live"
      ? "This is a live Stripe key. The connection works, but keep refunds, charges, and subscription changes approval-gated."
      : "Stripe authenticated in non-live mode. This is the right starting point for real connector testing.",
  );
}

async function testFolder(item: VaultItem, secret: string | null) {
  const rawPath = item.handle?.trim() || secret?.trim();

  if (!rawPath) {
    return result(
      "failed",
      "Folder path missing",
      "Add a local folder path in the handle field, then test again.",
    );
  }

  const resolved = path.resolve(rawPath);

  try {
    await access(resolved);
    return result(
      "pass",
      "Folder is reachable",
      `Agent Ledger can see the local path: ${resolved}`,
    );
  } catch {
    return result(
      "failed",
      "Folder is not reachable",
      `The path could not be opened from this machine: ${resolved}`,
    );
  }
}

function testWallet(item: VaultItem, secret: string | null) {
  const address = item.handle?.trim() || "";
  const looksLikeEvm = /^0x[a-fA-F0-9]{40}$/.test(address);
  const looksLikeBitcoin = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i.test(address);

  if (secret) {
    return result(
      "warning",
      "Wallet secret is stored",
      "This legacy item has a stored wallet secret. Remove it and re-add the wallet as a public address or guarded wallet adapter reference only.",
    );
  }

  if (looksLikeEvm || looksLikeBitcoin) {
    return result(
      "pass",
      "Wallet reference looks valid",
      "The wallet address format looks valid. Signing, swaps, bridges, transfers, and approvals still need a dedicated guarded wallet adapter.",
    );
  }

  return result(
    "warning",
    "Wallet reference saved",
    "This is stored as a wallet reference, but Agent Ledger cannot prove wallet access without a guarded wallet adapter.",
  );
}

function testEmail(item: VaultItem, secret: string | null) {
  if (!secret) {
    return result(
      "warning",
      "Email account saved as a reference",
      "Add a narrow token, app password, or guarded email adapter only when you are ready for controlled email testing.",
    );
  }

  return result(
    "warning",
    "Email credential is stored",
    "The secret is encrypted in the vault, but authenticated email sending requires a guarded Gmail, Outlook, or SMTP adapter before live sends are allowed.",
  );
}

function testBrowserProfile(item: VaultItem) {
  const profileName = item.handle?.trim();

  if (!profileName) {
    return result(
      "warning",
      "Browser profile reference is missing a name",
      "Add the profile name in the handle field so agents and operators know which isolated browser environment to use.",
    );
  }

  return result(
    "warning",
    "Browser profile reference is saved",
    `Agent Ledger saved the isolated profile reference "${profileName}". Start the browser bridge and sign in manually before assigning it to live agent work.`,
  );
}

export async function testVaultConnection(vaultItemId: string) {
  const item = await getVaultItemById(vaultItemId);

  if (!item) {
    return result("failed", "Vault item not found", "Choose an existing vault item.");
  }

  const connector = classifyConnector(item);
  const secret = await getVaultItemSecret(item.id);

  try {
    if (connector === "folder") {
      return testFolder(item, secret);
    }

    if (connector === "wallet") {
      return testWallet(item, secret);
    }

    if (connector === "email") {
      return testEmail(item, secret);
    }

    if (connector === "browser-profile") {
      return testBrowserProfile(item);
    }

    if (!secret) {
      return result(
        "failed",
        "No secret stored",
        "This connector needs a stored secret before Agent Ledger can run a real authentication test.",
      );
    }

    if (connector === "openai") {
      return testOpenAI(secret);
    }

    if (connector === "anthropic") {
      return testAnthropic(secret);
    }

    if (connector === "google") {
      return testGoogle(secret);
    }

    if (connector === "github") {
      return testGitHub(secret);
    }

    if (connector === "cloudflare") {
      return testCloudflare(secret);
    }

    if (connector === "stripe") {
      return testStripe(secret);
    }

    return result(
      "warning",
      "Secret is stored, connector not implemented yet",
      "Agent Ledger can store this credential, but there is no live connector test for this provider yet.",
    );
  } catch (error) {
    return result(
      "failed",
      "Connection test failed",
      error instanceof Error
        ? error.message
        : "The connector test failed before the provider returned a response.",
    );
  }
}
