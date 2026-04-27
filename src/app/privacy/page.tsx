import { LegalShell } from "@/components/public/legal-shell";

export const metadata = {
  title: "Privacy",
  description: "Privacy overview for Agent Ledger deployments and access requests.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="How Agent Ledger handles operational records and inbound access requests."
      intro="This page describes the privacy model of the current product release. It is a practical overview, not a substitute for counsel on your own deployment."
    >
      <section>
        <h2 className="text-2xl font-semibold text-ink">What data the product stores</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          Agent Ledger stores the information needed to govern autonomous work:
          agent registrations, policy rules, action logs, approval records, billing
          configuration, audit events, and any access requests submitted through the
          public site.
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Why the data is stored</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Operational records are kept so actions can be reviewed, explained,
            approved, exported, and audited.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            Public access requests are stored so the founder team can evaluate fit,
            follow up, and onboard early users.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Storage model</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          The current release writes application data to persistent local disk or
          equivalent attached storage. Teams deploying Agent Ledger are responsible
          for choosing infrastructure that matches their retention, encryption, and
          compliance requirements.
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Sensitive workflows</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          If you plan to store customer data, financial records, regulated data, or
          other sensitive material, you should harden the deployment further before
          relying on it for production operations. That includes managed auth,
          managed storage, and environment-specific security review.
        </div>
      </section>
    </LegalShell>
  );
}
