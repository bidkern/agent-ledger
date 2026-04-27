import { getActionLogById, getApprovalById } from "@/data/repository";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "service.approvals.read",
    actorKey: principal.id,
    limit: 360,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Approval reads are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const { approvalId } = await context.params;
  const approval = await getApprovalById(approvalId);

  if (!approval) {
    return Response.json(
      {
        error: "Approval request not found.",
      },
      {
        status: 404,
        headers: privateHeaders,
      },
    );
  }

  const actionLog = await getActionLogById(approval.actionLogId);

  return Response.json(
    {
      approval,
      actionLog:
        actionLog === null
          ? null
          : {
              id: actionLog.id,
              status: actionLog.status,
              externalReferenceId: actionLog.externalReferenceId ?? null,
              resultDetail: actionLog.resultDetail ?? null,
            },
    },
    {
      status: 200,
      headers: privateHeaders,
    },
  );
}
