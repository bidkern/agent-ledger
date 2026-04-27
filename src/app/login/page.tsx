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
    <main className="min-h-screen bg-[#101417] px-6 py-6 text-[#f2f0e8]">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-0 border border-white/10 bg-[#151b1f] shadow-[0_18px_60px_rgba(0,0,0,0.32)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between border-b border-white/10 p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-[#f2f0e8]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-white/12 bg-[#20282d] text-sm font-semibold">
                AL
              </span>
              <span>
                <span className="block text-base font-semibold">Agent Ledger</span>
              </span>
            </Link>

            <div className="mt-10 max-w-xl">
              <h1 className="text-4xl font-semibold leading-tight text-[#f2f0e8] md:text-5xl">
                Create safe agents without needing to be an AI expert.
              </h1>
              <p className="mt-4 text-base leading-8 text-[#c8d0cc]">
                Connect the brain, give it a job, choose what it can touch, and
                make risky actions stop for approval.
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              {plainSteps.map((step, index) => (
                <div
                  key={step}
                  className="grid grid-cols-[2rem_1fr] gap-3 border border-white/10 bg-[#20282d] p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e4ecdf] text-sm font-semibold text-[#172018]">
                    {index + 1}
                  </span>
                  <p className="self-center text-sm leading-6 text-[#d9ded9]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border border-white/10 bg-[#11171a] p-4">
            <p className="text-sm leading-7 text-[#c8d0cc]">
              The app does not need wallet keys, bank logins, card numbers, or
              normal account passwords.
            </p>
          </div>
        </section>

        <section className="flex items-center p-6 md:p-8">
          <div className="w-full max-w-xl">
            <h2 className="text-3xl font-semibold text-[#f2f0e8]">
              Open the Agent Hub
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#c8d0cc]">
              {usesEnterpriseSso
                ? "Continue with your company login."
                : localDemoEnabled
                  ? "Use the demo button for the fastest test run."
                  : "Use an operator email and access code."}
            </p>

            <div className="mt-6 border border-white/10 bg-[#1b2227] p-5">
              {usesEnterpriseSso ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-[#f2f0e8]">
                    Enterprise SSO
                  </p>
                  <p className="text-sm leading-7 text-[#c8d0cc]">
                    Agent Ledger checks operator access after your identity provider
                    returns you here.
                  </p>
                  <a
                    href={isOidcConfigured() ? "/api/auth/oidc/login" : "/login"}
                    className="inline-flex rounded-md bg-[#e4ecdf] px-5 py-3 text-sm font-semibold text-[#172018] transition hover:bg-white"
                  >
                    {isOidcConfigured()
                      ? "Continue with SSO"
                      : "SSO not configured"}
                  </a>
                  {!isOidcConfigured() ? (
                    <p className="text-sm leading-7 text-[#ffb0a5]">
                      Set the OIDC environment variables before SSO can be used.
                    </p>
                  ) : null}
                </div>
              ) : (
                <LoginForm demoCredentials={demoCredentials} />
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-md border border-white/12 px-4 py-2 text-sm font-medium text-[#f2f0e8] transition hover:bg-white/8"
              >
                Back
              </Link>
              <Link
                href="/request-access"
                className="rounded-md border border-white/12 px-4 py-2 text-sm font-medium text-[#f2f0e8] transition hover:bg-white/8"
              >
                Request access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
