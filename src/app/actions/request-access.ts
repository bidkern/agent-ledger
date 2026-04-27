"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import { createAccessRequest, logAuditEvent } from "@/data/repository";

type RequestAccessState = {
  error: string;
  success: string;
  savedRequestId: string;
};

const requestAccessSchema = z.object({
  contactName: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid work email."),
  companyName: z.string().trim().min(2, "Enter your company name."),
  companyUrl: z.string().trim().optional(),
  teamSize: z.enum(["1-5", "6-20", "21-50", "51+"]),
  currentAgentStack: z
    .string()
    .trim()
    .min(12, "Describe the agent stack or workflow you are running today."),
  desiredLaunchWindow: z.enum([
    "immediately",
    "this-quarter",
    "next-quarter",
    "exploring",
  ]),
  notes: z
    .string()
    .trim()
    .min(20, "Add a bit more context about what you want to govern."),
});

function cleanCompanyUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function requestAccess(
  _previousState: RequestAccessState,
  formData: FormData,
): Promise<RequestAccessState> {
  const parsed = requestAccessSchema.safeParse({
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    companyUrl: formData.get("companyUrl"),
    teamSize: formData.get("teamSize"),
    currentAgentStack: formData.get("currentAgentStack"),
    desiredLaunchWindow: formData.get("desiredLaunchWindow"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to submit access request.",
      success: "",
      savedRequestId: "",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimit = await consumeRateLimit({
    scope: "public.access-request",
    actorKey: email,
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Too many access requests from this address. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      savedRequestId: "",
    };
  }

  const request = await createAccessRequest({
    contactName: parsed.data.contactName,
    email,
    companyName: parsed.data.companyName,
    companyUrl: cleanCompanyUrl(parsed.data.companyUrl),
    teamSize: parsed.data.teamSize,
    currentAgentStack: parsed.data.currentAgentStack,
    desiredLaunchWindow: parsed.data.desiredLaunchWindow,
    notes: parsed.data.notes,
  });

  await logAuditEvent({
    actorEmail: email,
    action: "access-request.created",
    entityType: "access-request",
    entityId: request.id,
    detail: `Captured public access request from ${request.companyName}`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/pipeline");

  return {
    error: "",
    success:
      "Request received. Agent Ledger captured the details and queued them in the founder pipeline.",
    savedRequestId: request.id,
  };
}
