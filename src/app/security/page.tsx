import { LegalShell } from "@/components/public/legal-shell";

export const metadata = {
  title: "Security",
  description:
    "Security posture and current guardrails for Agent Ledger deployments.",
};

export default function SecurityPage() {
  return (
    <LegalShell
      eyebrow="Security"
      title="Agent Ledger is designed to be a bad target."
      intro="The security goal is simple: do not custody dangerous secrets, make automated probing expensive, keep private data out of caches and indexes, and force risky agent actions through policy checks before anything external happens."
    >
      <section>
        <h2 className="text-2xl font-semibold text-ink">Security posture</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Zero-custody vault rules reject wallet private keys, seed phrases,
            payment-card secrets, bank credentials, and normal account passwords.
            Store references and guarded adapter names instead.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Signed founder sessions, enterprise SSO support, `httpOnly` cookies,
            server-side authorization checks, and private route caching controls
            keep the workspace behind an operator boundary.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Login attempts are throttled by browser/network fingerprint and by
            account email. Service APIs require bearer headers and do not accept
            tokens in URLs.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Logs, approvals, run output, policies, MCP responses, and exports pass
            through redaction before storage or response formatting.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Attack deterrence</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Security headers include a content security policy, frame denial,
            browser permission lockdown, content-type sniffing protection, referrer
            limits, and stricter browser isolation defaults.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Private routes, login, and API responses are marked no-store and
            noindex. Robots disallow workspace, login, and API crawling.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            The public MCP discovery endpoint never returns service tokens.
            Runtime OAuth is off by default unless explicitly enabled.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            A standard `/.well-known/security.txt` route points researchers toward
            the security policy instead of encouraging random probing.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Recommended launch posture</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          Launch with OIDC SSO, named operator policy rules, long random session
          and vault keys, managed Postgres, HTTPS, service-token rotation, guarded
          adapters for money movement, Stripe webhooks, backups, dependency
          scanning, and a real incident-response contact. Keep live wallets, bank
          accounts, cards, and admin tools outside the app unless they are wrapped
          behind approval-gated adapters.
        </div>
      </section>
    </LegalShell>
  );
}
