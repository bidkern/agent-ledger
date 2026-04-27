import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { mutateCollection } from "@/data/store";
import type { RateLimitRecord, RateLimitScope } from "@/data/types";

const RETENTION_MS = 1000 * 60 * 60 * 24 * 7;

function nowIso() {
  return new Date().toISOString();
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseForwardedFor(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

async function getRequesterFingerprint() {
  const headerList = await headers();
  const forwardedFor = parseForwardedFor(headerList.get("x-forwarded-for"));
  const realIp = headerList.get("x-real-ip")?.trim() || "";
  const host =
    headerList.get("x-forwarded-host")?.trim() ||
    headerList.get("host")?.trim() ||
    "unknown-host";
  const userAgent = headerList.get("user-agent")?.trim() || "unknown-user-agent";

  return `${realIp || forwardedFor || "unknown-ip"}|${host}|${userAgent.slice(0, 160)}`;
}

function pruneRecords(records: RateLimitRecord[], now: number) {
  return records.filter((record) => {
    const updatedAt = Date.parse(record.updatedAt);
    return Number.isFinite(updatedAt) && now - updatedAt < RETENTION_MS;
  });
}

function buildBucketKey(scope: RateLimitScope, fingerprint: string, actorKey?: string) {
  return hashKey(`${scope}:${actorKey || "anonymous"}:${fingerprint}`);
}

export async function consumeRateLimit(input: {
  scope: RateLimitScope;
  actorKey?: string;
  limit: number;
  windowMs: number;
}) {
  const fingerprint = await getRequesterFingerprint();
  const key = buildBucketKey(input.scope, fingerprint, input.actorKey);
  const now = Date.now();
  const timestamp = nowIso();
  return mutateCollection<
    RateLimitRecord,
    {
      allowed: boolean;
      count: number;
      remaining: number;
      retryAfterSeconds: number;
    }
  >("rate-limits", (records) => {
    const existing = pruneRecords(records, now);
    const index = existing.findIndex(
      (record) => record.key === key && record.scope === input.scope,
    );

    if (index === -1) {
      const record: RateLimitRecord = {
        key,
        scope: input.scope,
        count: 1,
        windowStartedAt: timestamp,
        updatedAt: timestamp,
      };

      return {
        next: [record, ...existing],
        result: {
          allowed: true,
          count: 1,
          remaining: Math.max(0, input.limit - 1),
          retryAfterSeconds: 0,
        },
      };
    }

    const current = existing[index];
    const elapsedMs = now - Date.parse(current.windowStartedAt);

    const nextRecord: RateLimitRecord =
      elapsedMs >= input.windowMs
        ? {
            key,
            scope: input.scope,
            count: 1,
            windowStartedAt: timestamp,
            updatedAt: timestamp,
          }
        : {
            ...current,
            count: current.count + 1,
            updatedAt: timestamp,
          };

    const nextRecords = [...existing];
    nextRecords[index] = nextRecord;

    const retryAfterSeconds =
      elapsedMs >= input.windowMs
        ? 0
        : Math.max(1, Math.ceil((input.windowMs - elapsedMs) / 1000));

    return {
      next: nextRecords,
      result: {
        allowed: nextRecord.count <= input.limit,
        count: nextRecord.count,
        remaining: Math.max(0, input.limit - nextRecord.count),
        retryAfterSeconds,
      },
    };
  });
}

export async function resetRateLimit(input: {
  scope: RateLimitScope;
  actorKey?: string;
}) {
  const fingerprint = await getRequesterFingerprint();
  const key = buildBucketKey(input.scope, fingerprint, input.actorKey);
  await mutateCollection<RateLimitRecord, void>("rate-limits", (records) => ({
    next: records.filter(
      (record) => !(record.key === key && record.scope === input.scope),
    ),
    result: undefined,
  }));
}

export function formatRetryAfter(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
