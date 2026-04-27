import { listAuditEvents } from "@/data/repository";

export const dynamic = "force-dynamic";

async function buildHealthResponse() {
  const checkedAt = new Date().toISOString();

  try {
    await listAuditEvents(1);

    return {
      status: 200,
      body: {
        status: "ok",
        checkedAt,
      },
    };
  } catch {
    return {
      status: 503,
      body: {
        status: "degraded",
        checkedAt,
      },
    };
  }
}

export async function GET() {
  const response = await buildHealthResponse();

  return Response.json(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function HEAD() {
  const response = await buildHealthResponse();

  return new Response(null, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
