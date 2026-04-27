import { requireSession } from "@/data/auth";
import {
  buildPrivateExportBundle,
  getPrivateExportFilename,
} from "@/data/export";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import { logAuditEvent } from "@/data/repository";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export async function GET() {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "private.export",
    actorKey: session.email,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Export is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: privateHeaders,
      },
    );
  }

  const bundle = await buildPrivateExportBundle();
  const filename = getPrivateExportFilename(bundle.exportedAt);

  await logAuditEvent({
    actorEmail: session.email,
    action: "export.downloaded",
    entityType: "export",
    entityId: filename,
    detail: "Downloaded private workspace export",
  });

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      ...privateHeaders,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
