"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/data/auth";
import { consumeRateLimit } from "@/data/rate-limit";
import { logAuditEvent, updateAccessRequestStatus } from "@/data/repository";

const updateAccessRequestSchema = z.object({
  requestId: z.string().trim().min(1, "Missing request id."),
  status: z.enum(["new", "contacted", "qualified", "declined"]),
});

export async function updateAccessRequestStatusAction(formData: FormData) {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "access-request.update",
    actorKey: session.email,
    limit: 100,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return;
  }

  const parsed = updateAccessRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return;
  }

  const request = await updateAccessRequestStatus({
    id: parsed.data.requestId,
    status: parsed.data.status,
  });

  if (!request) {
    return;
  }

  await logAuditEvent({
    actorEmail: session.email,
    action: "access-request.status-updated",
    entityType: "access-request",
    entityId: request.id,
    detail: `Marked ${request.companyName} as ${request.status}`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/pipeline");
}
