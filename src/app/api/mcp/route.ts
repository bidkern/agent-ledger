import { z } from "zod";
import { createGovernedActionRecord } from "@/data/governance";
import { createGovernedStripeRefund } from "@/data/guarded-stripe";
import { getApprovalById, listAgents, redactSensitiveText } from "@/data/repository";
import {
  authenticateServiceRequest,
  getServiceAuthErrorResponse,
} from "@/data/service-auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";

export const dynamic = "force-dynamic";

const jsonHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

const jsonRpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().trim().min(1),
  params: z.any().optional(),
});

const proposeActionArgsSchema = z.object({
  agentId: z.string().trim().min(1),
  actionType: z.string().trim().min(2),
  target: z.string().trim().min(2),
  tool: z.string().trim().min(2),
  vendor: z.string().trim().optional(),
  amountUsd: z.coerce.number().min(0).optional(),
  summary: z.string().trim().min(8),
  reasoning: z.string().trim().min(8),
});

const refundArgsSchema = z
  .object({
    agentId: z.string().trim().min(1),
    reasoning: z.string().trim().min(8),
    summary: z.string().trim().optional(),
    paymentIntentId: z.string().trim().optional(),
    chargeId: z.string().trim().optional(),
    amountCents: z.coerce.number().int().positive().optional(),
    reasonCode: z
      .enum(["duplicate", "fraudulent", "requested_by_customer"])
      .optional(),
  })
  .refine(
    (value) => Boolean(value.paymentIntentId || value.chargeId),
    "Provide paymentIntentId or chargeId.",
  );

const approvalArgsSchema = z.object({
  approvalId: z.string().trim().min(1),
});

function jsonRpcResult(
  id: string | number | null | undefined,
  result: unknown,
) {
  return new Response(
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        result,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
}

function jsonRpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown,
) {
  return new Response(
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        error: {
          code,
          message,
          ...(typeof data === "undefined" ? {} : { data }),
        },
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
}

function redactMcpValue<T>(value: T): T {
  if (typeof value === "string") {
    return (redactSensitiveText(value) ?? "") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactMcpValue(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactMcpValue(item)]),
    ) as T;
  }

  return value;
}

function buildToolResult(payload: unknown) {
  const safePayload = redactMcpValue(payload);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(safePayload, null, 2),
      },
    ],
    structuredContent: safePayload,
  };
}

const mcpTools = [
  {
    name: "list_agents",
    description:
      "List the currently registered governed agents available in Agent Ledger.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "propose_action",
    description:
      "Ask Agent Ledger to evaluate a risky action and decide whether to allow, review, or block it.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        actionType: { type: "string" },
        target: { type: "string" },
        tool: { type: "string" },
        vendor: { type: "string" },
        amountUsd: { type: "number" },
        summary: { type: "string" },
        reasoning: { type: "string" },
      },
      required: ["agentId", "actionType", "target", "tool", "summary", "reasoning"],
      additionalProperties: false,
    },
  },
  {
    name: "get_approval_status",
    description:
      "Read the status of a human approval request created by Agent Ledger.",
    inputSchema: {
      type: "object",
      properties: {
        approvalId: { type: "string" },
      },
      required: ["approvalId"],
      additionalProperties: false,
    },
  },
  {
    name: "stripe_create_refund",
    description:
      "Create a Stripe refund through Agent Ledger's guarded Stripe adapter. Uses policy checks before issuing the refund.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        reasoning: { type: "string" },
        summary: { type: "string" },
        paymentIntentId: { type: "string" },
        chargeId: { type: "string" },
        amountCents: { type: "number" },
        reasonCode: {
          type: "string",
          enum: ["duplicate", "fraudulent", "requested_by_customer"],
        },
      },
      required: ["agentId", "reasoning"],
      additionalProperties: false,
    },
  },
] as const;

export async function GET() {
  return Response.json(
    {
      name: "Agent Ledger MCP",
      endpoint: "/api/mcp",
      tools: mcpTools.map((tool) => tool.name),
      auth: "Bearer token required. Configure SERVICE_ACCOUNT_TOKENS locally; tokens are never returned by this endpoint.",
      notes: [
        "This remote MCP endpoint is intended for Claude custom connectors and ChatGPT developer-mode custom apps.",
        "Write actions should be reviewed carefully before enabling them in any external connector UI.",
      ],
    },
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
}

export async function POST(request: Request) {
  const principal = authenticateServiceRequest(request);

  if (!principal) {
    return getServiceAuthErrorResponse();
  }

  const rateLimit = await consumeRateLimit({
    scope: "mcp.call",
    actorKey: principal.id,
    limit: 600,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return jsonRpcError(
      null,
      -32000,
      `MCP calls are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = jsonRpcSchema.safeParse(rawBody);

  if (!parsed.success) {
    return jsonRpcError(null, -32700, "Invalid JSON-RPC request body.");
  }

  const { id, method, params } = parsed.data;

  if (method === "initialize") {
    const requestedVersion =
      typeof params?.protocolVersion === "string"
        ? params.protocolVersion
        : "2024-11-05";

    return jsonRpcResult(id, {
      protocolVersion: requestedVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: "Agent Ledger MCP",
        version: "0.1.0",
      },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, {
      status: 202,
      headers: jsonHeaders,
    });
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (method === "resources/list" || method === "prompts/list") {
    return jsonRpcResult(id, {
      resources: [],
      prompts: [],
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, {
      tools: mcpTools,
    });
  }

  if (method !== "tools/call") {
    return jsonRpcError(id, -32601, `Method ${method} is not supported.`);
  }

  const toolName = params?.name;
  const toolArgs = params?.arguments ?? {};

  if (typeof toolName !== "string") {
    return jsonRpcError(id, -32602, "Tool name is required.");
  }

  try {
    if (toolName === "list_agents") {
      const agents = await listAgents();

      return jsonRpcResult(
        id,
        buildToolResult({
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
            status: agent.status,
            allowedTools: agent.allowedTools,
            dailyBudgetUsd: agent.dailyBudgetUsd,
            monthlyBudgetUsd: agent.monthlyBudgetUsd,
          })),
        }),
      );
    }

    if (toolName === "propose_action") {
      const validArgs = proposeActionArgsSchema.parse(toolArgs);
      const result = await createGovernedActionRecord({
        ...validArgs,
        actorEmail: `service:${principal.id}`,
        source: "mcp",
        requestedBy: principal.id,
        allowStatus: "allowed",
      });

      return jsonRpcResult(
        id,
        buildToolResult({
          decision: result.decision,
          status: result.status,
          actionLogId: result.log.id,
          approvalRequestId: result.approval?.id ?? null,
          policyHits: result.policyHits,
          policyReason: result.policyReason,
        }),
      );
    }

    if (toolName === "get_approval_status") {
      const validArgs = approvalArgsSchema.parse(toolArgs);
      const approval = await getApprovalById(validArgs.approvalId);

      if (!approval) {
        return jsonRpcResult(
          id,
          {
            isError: true,
            ...buildToolResult({
              error: "Approval request not found.",
            }),
          },
        );
      }

      return jsonRpcResult(
        id,
        buildToolResult({
          approval,
        }),
      );
    }

    if (toolName === "stripe_create_refund") {
      const validArgs = refundArgsSchema.parse(toolArgs);
      const result = await createGovernedStripeRefund({
        ...validArgs,
        actorEmail: `service:${principal.id}`,
        requestedBy: principal.id,
        source: "mcp",
      });

      return jsonRpcResult(
        id,
        buildToolResult({
          decision: result.decision,
          status: result.log.status,
          actionLogId: result.log.id,
          approvalRequestId: result.approval?.id ?? null,
          policyHits: result.policyHits,
          policyReason: result.policyReason,
          refund: result.refund,
        }),
      );
    }

    return jsonRpcError(id, -32601, `Tool ${toolName} is not defined.`);
  } catch (error) {
    return jsonRpcResult(id, {
      isError: true,
      ...buildToolResult({
        error:
          error instanceof Error
            ? redactSensitiveText(error.message)
            : "Tool execution failed.",
      }),
    });
  }
}
