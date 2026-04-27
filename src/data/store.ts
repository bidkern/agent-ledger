import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { Pool, type PoolClient } from "pg";

type CollectionName =
  | "agents"
  | "agent-runs"
  | "runtime-connections"
  | "agent-permissions"
  | "vault-items"
  | "policies"
  | "action-logs"
  | "approvals"
  | "access-requests"
  | "billing-config"
  | "audit-events"
  | "model-usage"
  | "rate-limits";

type StorageBackend = "filesystem" | "postgres";

const collectionFiles: Record<CollectionName, string> = {
  agents: "agents.json",
  "agent-runs": "agent-runs.json",
  "runtime-connections": "runtime-connections.json",
  "agent-permissions": "agent-permissions.json",
  "vault-items": "vault-items.json",
  policies: "policies.json",
  "action-logs": "action-logs.json",
  approvals: "approvals.json",
  "access-requests": "access-requests.json",
  "billing-config": "billing-config.json",
  "audit-events": "audit-events.json",
  "model-usage": "model-usage.json",
  "rate-limits": "rate-limits.json",
};

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function getStorageBackend(): StorageBackend {
  const configured = process.env.STORAGE_BACKEND?.trim().toLowerCase();

  if (configured === "postgres") {
    return "postgres";
  }

  if (configured === "filesystem") {
    return "filesystem";
  }

  return process.env.DATABASE_URL?.trim() ? "postgres" : "filesystem";
}

function getDataDirectory() {
  const configured = process.env.DATA_DIR?.trim();
  return configured && configured.length > 0
    ? configured.replace(/[\\/]+$/, "")
    : ".agentledger-data";
}

function getDatabaseSsl() {
  const configured = process.env.DATABASE_SSL?.trim().toLowerCase();

  if (!configured || configured === "disable" || configured === "false") {
    return undefined;
  }

  if (configured === "verify-full") {
    return {
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured for Postgres storage.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: getDatabaseSsl(),
    });
  }

  return pool;
}

async function ensurePostgresSchema() {
  if (schemaPromise) {
    return schemaPromise;
  }

  schemaPromise = (async () => {
    await getPool().query(`
      create table if not exists agentledger_collections (
        name text primary key,
        payload jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now()
      )
    `);
  })();

  return schemaPromise;
}

async function ensureDataDirectory() {
  await mkdir(getDataDirectory(), { recursive: true });
}

async function getCollectionPath(name: CollectionName) {
  await ensureDataDirectory();
  return `${getDataDirectory()}/${collectionFiles[name]}`;
}

async function readCollectionFromFilesystem<T>(name: CollectionName): Promise<T[]> {
  const target = await getCollectionPath(name);

  try {
    const raw = await readFile(target, "utf8");

    if (!raw.trim()) {
      return [];
    }

    return JSON.parse(raw) as T[];
  } catch (error) {
    const known = error as NodeJS.ErrnoException;

    if (known.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeCollectionToFilesystem<T>(name: CollectionName, data: T[]) {
  const target = await getCollectionPath(name);
  const temp = `${target}.tmp`;

  await writeFile(temp, JSON.stringify(data, null, 2), "utf8");
  await rename(temp, target);
}

async function readCollectionFromPostgres<T>(
  name: CollectionName,
  client?: PoolClient,
): Promise<T[]> {
  await ensurePostgresSchema();
  const executor = client ?? getPool();
  const result = await executor.query(
    "select payload from agentledger_collections where name = $1",
    [name],
  );
  const payload = result.rows[0]?.payload;

  return Array.isArray(payload) ? (payload as T[]) : [];
}

async function writeCollectionToPostgres<T>(
  name: CollectionName,
  data: T[],
  client?: PoolClient,
) {
  await ensurePostgresSchema();
  const executor = client ?? getPool();

  await executor.query(
    `
      insert into agentledger_collections (name, payload, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (name)
      do update set payload = excluded.payload, updated_at = now()
    `,
    [name, JSON.stringify(data)],
  );
}

export async function readCollection<T>(name: CollectionName): Promise<T[]> {
  return getStorageBackend() === "postgres"
    ? readCollectionFromPostgres<T>(name)
    : readCollectionFromFilesystem<T>(name);
}

export async function writeCollection<T>(name: CollectionName, data: T[]) {
  if (getStorageBackend() === "postgres") {
    await writeCollectionToPostgres(name, data);
    return;
  }

  await writeCollectionToFilesystem(name, data);
}

export async function mutateCollection<T, R>(
  name: CollectionName,
  mutate: (current: T[]) => Promise<{ next: T[]; result: R }> | { next: T[]; result: R },
) {
  if (getStorageBackend() === "postgres") {
    await ensurePostgresSchema();
    const client = await getPool().connect();

    try {
      await client.query("begin");
      await client.query(
        "select pg_advisory_xact_lock(hashtext($1)::bigint)",
        [name],
      );

      const current = await readCollectionFromPostgres<T>(name, client);
      const outcome = await mutate(current);
      await writeCollectionToPostgres(name, outcome.next, client);
      await client.query("commit");

      return outcome.result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const current = await readCollectionFromFilesystem<T>(name);
  const outcome = await mutate(current);
  await writeCollectionToFilesystem(name, outcome.next);
  return outcome.result;
}

export async function appendToCollection<T>(name: CollectionName, item: T) {
  return mutateCollection<T, T>(name, (current) => ({
    next: [item, ...current],
    result: item,
  }));
}

export function sortNewestFirst<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
