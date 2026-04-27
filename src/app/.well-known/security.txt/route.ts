import { getAppUrlString } from "@/data/runtime";

export const dynamic = "force-dynamic";

export function GET() {
  const baseUrl = getAppUrlString();
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  return new Response(
    [
      `Contact: ${baseUrl}/request-access`,
      `Policy: ${baseUrl}/security`,
      `Canonical: ${baseUrl}/.well-known/security.txt`,
      `Expires: ${expires.toISOString()}`,
      "Preferred-Languages: en",
      "",
    ].join("\n"),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
