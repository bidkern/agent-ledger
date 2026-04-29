import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/data/auth";
import { getAuthStrategy, isOidcConfigured } from "@/data/enterprise-auth";
import { getLocalDemoCredentials, isLocalDemoEnabled } from "@/data/local-demo";

export const metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const plainSteps = [
  "Connect a model or local agent.",
  "Give it one job and one safe resource.",
  "Run dry tests before live work.",
] as const;

export default async function LoginPage() {
  const session = await getSession();
  const authStrategy = getAuthStrategy();
  const usesEnterpriseSso = authStrategy === "oidc";
  const localDemoEnabled = isLocalDemoEnabled();
  const demoCredentials = getLocalDemoCredentials();

  if (session) {
    redirect("/workspace");
  }

  return (
    <main className="retro-page min-h-screen px-6 py-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="retro-window flex flex-col justify-between">
          <div className="retro-titlebar">
            <span>Operator login</span>
            <span>{usesEnterpriseSso ? "SSO mode" : "Access-code mode"}</span>
          </div>
          <div className="retro-window-body">
            <Link href="/" className="inline-flex items-center gap-3 text-ink">
              <span className="retro-inset flex h-10 w-10 items-center justify-center text-sm font-bold">
                AL
              </span>
              <span className="block text-base font-bold">Agent Ledger</span>
            </Link>

            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl font-semibold leading-tight text-ink md:text-5xl">
                Create safe agents without needing to be an AI expert.
              </h1>
              <p className="mt-4 text-base leading-8 text-muted">
                Connect the brain, give it a job, choose what it can touch, and
                make risky actions stop for approval.
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              {plainSteps.map((step, index) => (
                <div key={step} className="retro-inset grid grid-cols-[2rem_1fr] gap-3 p-3">
                  <span className="retro-window flex h-8 w-8 items-center justify-center text-sm font-bold text-ink">
                    {index + 1}
                  </span>
                  <p className="self-center text-sm leading-6 text-muted">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="retro-window-body pt-0">
            <div className="retro-banner">
              The app does not need wallet keys, bank logins, card numbers, or
              normal account passwords.
            </div>
          </div>
        </section>

        <section className="retro-window flex flex-col">
          <div className="retro-titlebar retro-titlebar-green">
            <span>Open Agent Hub</span>
            <span>{localDemoEnabled ? "Demo ready" : "Manual entry"}</span>
          </div>
          <div className="retro-window-body flex-1">
            <p className="text-sm leading-7 text-muted">
              {usesEnterpriseSso
                ? "Continue with your company login."
                : localDemoEnabled
                  ? "Use the demo button for the fastest test run."
                  : "Use an operator email and access code."}
            </p>

            <div className="mt-6 retro-inset p-5">
              {usesEnterpriseSso ? (
                <div className="space-y-4">
                  <p className="field-label">Enterprise SSO</p>
                  <p className="text-sm leading-7 text-muted">
                    Agent Ledger checks operator access after your identity provider
                    returns you here.
                  </p>
                  <a
                    href={isOidcConfigured() ? "/api/auth/oidc/login" : "/login"}
                    className="retro-link-button retro-button-primary"
                  >
                    {isOidcConfigured()
                      ? "Continue with SSO"
                      : "SSO not configured"}
                  </a>
                  {!isOidcConfigured() ? (
                    <p className="text-sm leading-7 text-danger">
                      Set the OIDC environment variables before SSO can be used.
                    </p>
                  ) : null}
                </div>
              ) : (
                <LoginForm demoCredentials={demoCredentials} />
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/" className="retro-link-button">
                Back
              </Link>
              <Link href="/request-access" className="retro-link-button">
                Request access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
