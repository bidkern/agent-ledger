"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/data/auth";
import { decideApproval } from "@/data/mission";
import { consumeRateLimit } from "@/data/rate-limit";

const approvalSchema = z.object({
  approvalId: z.string().trim().min(1, "Missing approval id."),
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().trim().optional(),
});

export async function processApprovalAction(formData: FormData) {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "approval.decide",
    actorKey: session.email,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return;
  }

  const parsed = approvalSchema.safeParse({
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote"),
  });

  if (!parsed.success) {
    return;
  }

  await decideApproval({
    approvalId: parsed.data.approvalId,
    status: parsed.data.decision,
    decidedBy: session.email,
    decisionNote: parsed.data.decisionNote,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/logs");
  revalidatePath("/workspace/approvals");
  revalidatePath("/workspace/billing");
}
