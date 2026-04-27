"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/data/auth";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import { createPolicy, logAuditEvent } from "@/data/repository";

type PolicyActionState = {
  error: string;
  success: string;
  savedPolicyId: string;
};

const policySchema = z.object({
  name: z.string().trim().min(2, "Enter a policy name."),
  category: z.enum(["spend", "tool", "vendor", "data", "approval"]),
  enforcement: z.enum(["block", "review", "log"]),
  thresholdUsd: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(0).optional(),
  ),
  appliesTo: z.string().trim().optional(),
  description: z.string().trim().min(8, "Describe the policy intent."),
});

function parseCsv(raw?: string) {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createPolicyAction(
  _previousState: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "policy.create",
    actorKey: session.email,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Policy creation is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      savedPolicyId: "",
    };
  }

  const parsed = policySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    enforcement: formData.get("enforcement"),
    thresholdUsd: formData.get("thresholdUsd"),
    appliesTo: formData.get("appliesTo"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to create policy.",
      success: "",
      savedPolicyId: "",
    };
  }

  const policy = await createPolicy({
    name: parsed.data.name,
    category: parsed.data.category,
    enforcement: parsed.data.enforcement,
    thresholdUsd: parsed.data.thresholdUsd,
    appliesTo: parseCsv(parsed.data.appliesTo),
    description: parsed.data.description,
    enabled: true,
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "policy.created",
    entityType: "policy",
    entityId: policy.id,
    detail: `Created policy ${policy.name}`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/policies");

  return {
    error: "",
    success: `Created policy ${policy.name}.`,
    savedPolicyId: policy.id,
  };
}
