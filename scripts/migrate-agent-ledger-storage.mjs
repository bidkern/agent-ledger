import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const cwd = process.cwd();
const collections = {
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
  "rate-limits": "rate-limits.json",
};

function loadEnvFile(filename) {
  const target = path.join(cwd, filename);

  if (!existsSync(target)) {
    return;
  }

  const raw = readFileSync(target, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getDataDirectory() {
  const configured = process.env.DATA_DIR?.trim();
  return configured && configured.length > 0
    ? path.resolve(cwd, configured.replace(/[\\/]+$/, ""))
    : path.resolve(cwd, ".agentledger-data");
}

function getDatabaseSsl() {
  const configured = process.env.DATABASE_SSL?.trim().toLowerCase();

  if (!configured || configured === "disable" || configured === "false") {
    return undefined;
  }

  if (configured === "verify-full") {
    return { rejectUnauthorized: true };
  }

  return { rejectUnauthorized: false };
}

async function readCollection(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running storage:migrate.");
  }

  const dataDir = getDataDirectory();
  const files = await readdir(dataDir).catch(() => []);

  if (files.length === 0) {
    console.log(`No collection files found in ${dataDir}. Nothing to migrate.`);
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: getDatabaseSsl(),
  });

  try {
    await pool.query(`
      create table if not exists agentledger_collections (
        name text primary key,
        payload jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now()
      )
    `);

    for (const [name, filename] of Object.entries(collections)) {
      const sourcePath = path.join(dataDir, filename);
      const payload = await readCollection(sourcePath);

      await pool.query(
        `
          insert into agentledger_collections (name, payload, updated_at)
          values ($1, $2::jsonb, now())
          on conflict (name)
          do update set payload = excluded.payload, updated_at = now()
        `,
        [name, JSON.stringify(payload)],
      );

      console.log(`Migrated ${name} from ${filename}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
