import { listAgents } from "@/data/repository";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function GET(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const agents = await listAgents();

  return Response.json(
    {
      serviceId: principal.id,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        mission: agent.mission,
        autonomy: agent.autonomy,
        operatingMode: agent.operatingMode ?? "autonomous",
        standingPrompt: agent.standingPrompt ?? agent.mission,
        cadenceMinutes: agent.cadenceMinutes ?? null,
        maxActionsPerDay: agent.maxActionsPerDay ?? null,
        maxEmailsPerDay: agent.maxEmailsPerDay ?? null,
        requireApprovalForRiskyActions:
          agent.requireApprovalForRiskyActions ?? true,
        nextRunAt: agent.nextRunAt ?? null,
        lastAutonomousRunAt: agent.lastAutonomousRunAt ?? null,
        status: agent.status,
        allowedTools: agent.allowedTools,
        dailyBudgetUsd: agent.dailyBudgetUsd,
        monthlyBudgetUsd: agent.monthlyBudgetUsd,
      })),
    },
    {
      status: 200,
      headers: privateHeaders,
    },
  );
}
