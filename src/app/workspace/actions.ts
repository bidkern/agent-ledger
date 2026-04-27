"use server";

import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/data/auth";
import { DEMO_OPERATOR_EMAIL, isLocalDemoEnabled } from "@/data/local-demo";
import { seedDemoCompany } from "@/data/mission";
import { consumeRateLimit } from "@/data/rate-limit";

const execFileAsync = promisify(execFile);

export async function seedDemoCompanyAction() {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "demo.seed",
    actorKey: session.email,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return;
  }

  await seedDemoCompany(session.email);

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/policies");
  revalidatePath("/workspace/logs");
  revalidatePath("/workspace/approvals");
  revalidatePath("/workspace/billing");
}

export async function resetLocalDemoWorkspaceAction() {
  const session = await requireSession();

  if (!isLocalDemoEnabled() || session.email !== DEMO_OPERATOR_EMAIL) {
    return;
  }

  const rateLimit = await consumeRateLimit({
    scope: "demo.seed",
    actorKey: session.email,
    limit: 6,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return;
  }

  await execFileAsync(process.execPath, [
    path.join(process.cwd(), "scripts", "prepare-agent-ledger-demo.mjs"),
    "--reset",
  ]);

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/policies");
  revalidatePath("/workspace/logs");
  revalidatePath("/workspace/approvals");
  revalidatePath("/workspace/billing");
  revalidatePath("/workspace/pipeline");
}
