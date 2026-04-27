"use client";

import { useActionState, useState } from "react";
import { createWalletHandoffAction } from "@/app/workspace/agents/actions";
import type { RegisteredAgent } from "@/data/types";

type EthereumProvider = {
  request: (input: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const testnetChains = {
  sepolia: {
    chainId: "0xaa36a7",
    label: "Ethereum Sepolia",
    chainName: "Sepolia",
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  },
  baseSepolia: {
    chainId: "0x14a34",
    label: "Base Sepolia",
    chainName: "Base Sepolia",
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    nativeCurrency: { name: "Base Sepolia ETH", symbol: "ETH", decimals: 18 },
  },
} as const;

type TestnetChainKey = keyof typeof testnetChains;

const initialState = {
  error: "",
  success: "",
  runId: "",
  decisions: [] as string[],
};

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" || typeof code === "string" ? String(code) : "";
  }

  return "";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function ethToWeiHex(value: string) {
  const trimmed = value.trim() || "0";

  if (!/^\d+(\.\d{0,18})?$/.test(trimmed)) {
    throw new Error("Enter a valid ETH amount with up to 18 decimal places.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const weiPerEth = BigInt(10) ** BigInt(18);
  const wei =
    BigInt(whole) * weiPerEth +
    BigInt((fraction + "0".repeat(18)).slice(0, 18) || "0");

  return `0x${wei.toString(16)}`;
}

function weiHexToEth(value: string) {
  const wei = BigInt(value || "0x0");
  const weiPerEth = BigInt(10) ** BigInt(18);
  const whole = wei / weiPerEth;
  const fraction = (wei % weiPerEth).toString().padStart(18, "0").slice(0, 6);

  return `${whole.toString()}.${fraction}`;
}

export function WalletHandoffLab({ agents }: { agents: RegisteredAgent[] }) {
  const [state, formAction, pending] = useActionState(
    createWalletHandoffAction,
    initialState,
  );
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("");
  const [walletChain, setWalletChain] = useState("");
  const [testnetChain, setTestnetChain] = useState<TestnetChainKey>("sepolia");
  const [testnetAmountEth, setTestnetAmountEth] = useState("0");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [mainnetStatus, setMainnetStatus] = useState("");
  const [mainnetBalance, setMainnetBalance] = useState("");
  const [mainnetGasEstimate, setMainnetGasEstimate] = useState("");

  async function connectBrowserWallet() {
    setWalletStatus("");
    setWalletChain("");

    if (!window.ethereum) {
      setWalletStatus(
        "No wallet extension was found in this browser. Open http://localhost:3260/workspace/agents in Chrome or Brave with MetaMask/Rabby installed.",
      );
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const firstAccount = Array.isArray(accounts) ? accounts[0] : null;

      if (typeof firstAccount !== "string" || !firstAccount.startsWith("0x")) {
        setWalletStatus("Wallet connected, but no public address was returned.");
        return null;
      }

      setWalletAddress(firstAccount);
      setWalletStatus("Wallet connected. MetaMask/Rabby keeps the key; Agent Ledger got the selected account.");

      try {
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        if (typeof chainId === "string") {
          setWalletChain(chainId);
        }
      } catch {
        setWalletChain("");
      }

      return firstAccount;
    } catch (error) {
      setWalletStatus(
        error instanceof Error
          ? error.message
          : "Wallet connection was cancelled or unavailable.",
      );
      return null;
    }
  }

  async function switchToTestnet(chainKey: TestnetChainKey) {
    if (!window.ethereum) {
      throw new Error("No wallet extension was found in this browser.");
    }

    const chain = testnetChains[chainKey];

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chain.chainId }],
      });
    } catch (error) {
      if (getErrorCode(error) !== "4902") {
        throw error;
      }

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chain.chainId,
            chainName: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: chain.blockExplorerUrls,
          },
        ],
      });
    }

    setWalletChain(chain.chainId);
  }

  async function switchToMainnet() {
    if (!window.ethereum) {
      throw new Error("No wallet extension was found in this browser.");
    }

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });
    setWalletChain("0x1");
  }

  async function runMainnetPreview() {
    setMainnetStatus("");
    setMainnetBalance("");
    setMainnetGasEstimate("");

    if (!window.ethereum) {
      setMainnetStatus(
        "No wallet extension was found. Open this page in Chrome or Brave with MetaMask/Rabby installed.",
      );
      return;
    }

    try {
      const from = walletAddress || (await connectBrowserWallet());

      if (!from) {
        setMainnetStatus("Connect a wallet before running a mainnet preview.");
        return;
      }

      await switchToMainnet();

      const balanceHex = await window.ethereum.request({
        method: "eth_getBalance",
        params: [from, "latest"],
      });
      const gasHex = await window.ethereum.request({
        method: "eth_estimateGas",
        params: [
          {
            from,
            to: from,
            value: "0x0",
          },
        ],
      });

      if (typeof balanceHex === "string") {
        setMainnetBalance(`${weiHexToEth(balanceHex)} ETH`);
      }

      if (typeof gasHex === "string") {
        setMainnetGasEstimate(`${BigInt(gasHex).toString()} gas units`);
      }

      setMainnetStatus(
        "Mainnet preview complete. Agent Ledger read wallet state and gas only; no signature or transaction request was sent.",
      );
    } catch (error) {
      setMainnetStatus(
        getErrorMessage(error, "Mainnet preview was cancelled or unavailable."),
      );
    }
  }

  async function requestTestnetTransaction() {
    setTransactionStatus("");
    setTransactionHash("");

    if (!window.ethereum) {
      setTransactionStatus(
        "No wallet extension was found. Open this page in Chrome or Brave with MetaMask/Rabby installed.",
      );
      return;
    }

    try {
      const from = walletAddress || (await connectBrowserWallet());

      if (!from) {
        setTransactionStatus("Connect a wallet before requesting a transaction.");
        return;
      }

      const value = ethToWeiHex(testnetAmountEth);
      await switchToTestnet(testnetChain);
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: from,
            value,
          },
        ],
      });

      if (typeof txHash === "string") {
        setTransactionHash(txHash);
        setTransactionStatus(
          "Wallet accepted the testnet transaction request. The hash is below.",
        );
      } else {
        setTransactionStatus("Wallet returned without a transaction hash.");
      }
    } catch (error) {
      setTransactionStatus(
        getErrorMessage(error, "Wallet rejected or could not send the testnet transaction."),
      );
    }
  }

  return (
    <section className="panel-strong rounded-lg p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="field-label">Wallet autonomy test</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Connect a wallet without handing over the key.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            MetaMask or Rabby holds the wallet. Agent Ledger gives the agent a
            controlled account handle, spending rules, and an action log.
          </p>

          <div className="mt-5 grid gap-3">
            <SafetyLine text="Create agent, give prompt, set limits, run." />
            <SafetyLine text="The wallet signs; Agent Ledger never stores the key." />
            <SafetyLine text="A private-key textbox is intentionally blocked." />
            <SafetyLine text="Unattended mainnet autonomy needs a capped smart-wallet session." />
          </div>
        </div>

        <form action={formAction} className="rounded-md border border-line bg-white/86 p-4">
          <label className="block">
            <span className="field-label">Agent</span>
            <select
              name="agentId"
              required
              className="select-surface mt-2"
              disabled={agents.length === 0}
            >
              {agents.length === 0 ? (
                <option value="">Create an agent first</option>
              ) : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="field-label">Wallet account</span>
            <input
              name="walletAddress"
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              placeholder="0x..."
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              className="input-surface mt-2"
            />
            <p className="field-note">
              Connect MetaMask/Rabby to fill this. The account identifies the
              signer; it does not give Agent Ledger spending power by itself.
            </p>
          </label>

          <div className="mt-3 rounded-md border border-line bg-white/72 p-3">
            <button
              type="button"
              onClick={connectBrowserWallet}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#f7f9fc]"
            >
              Connect MetaMask / Rabby
            </button>
            <p className="mt-2 text-xs leading-5 text-muted">
              This asks your wallet which account to use. It does not ask for a
              seed phrase or private key.
            </p>
            {walletStatus ? (
              <p className="mt-2 text-xs leading-5 text-muted">{walletStatus}</p>
            ) : null}
            {walletChain ? (
              <p className="mt-1 text-xs leading-5 text-muted">
                Connected chain: {walletChain}
              </p>
            ) : null}
          </div>

          <div className="mt-3 rounded-md border border-[#edd89b] bg-[#fff7e2] p-3 text-sm leading-6 text-[#6f4b00]">
            Private-key import is not supported. If an agent can read a key, a
            bug, injected prompt, browser exploit, or malicious dependency can
            use it too. Wallet-provider signing and session-limited smart
            wallets are the safer path.
          </div>

          <div className="mt-4 rounded-md border border-line bg-white/72 p-4">
            <p className="field-label">Testnet execution lane</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              This is the first real transaction path: the agent can request a
              wallet action, but MetaMask/Rabby still shows the final signing
              screen. Mainnet is intentionally not available here.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Network</span>
                <select
                  value={testnetChain}
                  onChange={(event) =>
                    setTestnetChain(event.target.value as TestnetChainKey)
                  }
                  className="select-surface mt-2"
                >
                  {Object.entries(testnetChains).map(([key, chain]) => (
                    <option key={key} value={key}>
                      {chain.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="field-label">Test ETH amount</span>
                <input
                  value={testnetAmountEth}
                  onChange={(event) => setTestnetAmountEth(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="input-surface mt-2"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={requestTestnetTransaction}
              className="mt-4 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Request testnet wallet transaction
            </button>

            <p className="mt-3 text-xs leading-5 text-muted">
              Sends a wallet-confirmed testnet transaction from the connected
              account back to itself. Use test ETH only.
            </p>

            {transactionStatus ? (
              <p className="mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                {transactionStatus}
              </p>
            ) : null}

            {transactionHash ? (
              <p className="mt-2 break-all rounded-md border border-success/15 bg-green-50 px-3 py-2 text-xs leading-5 text-success">
                {transactionHash}
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-md border border-line bg-white/72 p-4">
            <p className="field-label">Mainnet preview lane</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              This uses real Ethereum mainnet for read-only checks: balance,
              selected account, and gas estimate. It does not request a
              signature and does not broadcast a transaction.
            </p>

            <button
              type="button"
              onClick={runMainnetPreview}
              className="mt-4 rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-[#f7f9fc]"
            >
              Run mainnet preview
            </button>

            {mainnetStatus ? (
              <p className="mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                {mainnetStatus}
              </p>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {mainnetBalance ? (
                <div className="rounded-md border border-line bg-white px-3 py-3">
                  <p className="field-label">Live balance</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {mainnetBalance}
                  </p>
                </div>
              ) : null}
              {mainnetGasEstimate ? (
                <div className="rounded-md border border-line bg-white px-3 py-3">
                  <p className="field-label">Self-transfer estimate</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {mainnetGasEstimate}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="field-label">Test type</span>
            <select name="mode" required defaultValue="limited-sandbox" className="select-surface mt-2">
              <option value="limited-sandbox">Limited $4 sandbox run</option>
              <option value="growth-gauntlet">Growth gauntlet</option>
              <option value="swap-handoff">One swap handoff</option>
              <option value="read-only">Read-only wallet checks</option>
            </select>
            <p className="field-note">
              Limited sandbox is the closest safe version of prompt plus wallet
              plus spending rules plus autonomous run.
            </p>
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="field-label">Virtual balance</span>
              <input
                name="startingBalanceUsd"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue="4"
                className="input-surface mt-2"
              />
            </label>
            <label className="block">
              <span className="field-label">Max per attempt</span>
              <input
                name="maxAttemptUsd"
                type="number"
                min="0"
                max="25"
                step="0.01"
                defaultValue="1"
                className="input-surface mt-2"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={pending || agents.length === 0}
            className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Running wallet test..." : "Run wallet test"}
          </button>

          {state.error ? (
            <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <div className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
              <p>{state.success}</p>
              {state.decisions.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {state.decisions.map((decision) => (
                    <p key={decision} className="text-xs leading-5 text-success">
                      {decision}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-line bg-white/86 px-4 py-3 text-sm leading-6 text-muted">
      {text}
    </div>
  );
}
