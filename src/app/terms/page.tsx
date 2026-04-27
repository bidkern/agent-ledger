import { LegalShell } from "@/components/public/legal-shell";

export const metadata = {
  title: "Terms",
  description: "Terms overview for evaluating and deploying Agent Ledger.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="A practical terms overview for the current Agent Ledger release."
      intro="These terms are a lightweight operating summary for this release. They are designed to set correct expectations while the product is still early."
    >
      <section>
        <h2 className="text-2xl font-semibold text-ink">Evaluation use</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          Unless separately agreed, the current public release should be treated as
          an early commercial product for evaluation, pilot deployments, and
          controlled production usage rather than a blanket promise of enterprise
          suitability in every environment.
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Customer responsibility</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            You are responsible for configuring access codes, operator allowlists,
            domains, storage, and external integrations appropriately for your use
            case.
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
            You are also responsible for deciding what agents may do automatically,
            what requires human review, and what data should never enter the system.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">No overclaiming</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          Agent Ledger is built to improve governance around autonomous systems, but
          no software can eliminate operational risk entirely. The product is a
          control layer, not a guarantee that every agent action is safe or correct.
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Future commercial terms</h2>
        <div className="rounded-[1.5rem] border border-line bg-white/80 p-5">
          Pricing, support commitments, data processing commitments, and deployment
          requirements can be formalized in a separate commercial agreement as the
          product moves from early launch into broader production rollout.
        </div>
      </section>
    </LegalShell>
  );
}
