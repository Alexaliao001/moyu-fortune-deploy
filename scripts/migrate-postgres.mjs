import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl:
    databaseUrl.includes("render.com") ||
    databaseUrl.includes("sslmode=require")
      ? "require"
      : undefined,
});

try {
  const migrationDir = new URL("../drizzle/postgres/", import.meta.url);
  const files = (await readdir(migrationDir))
    .filter(file => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const migration = await readFile(new URL(file, migrationDir), "utf8");
    await sql.unsafe(migration);
    console.log(`Applied Postgres migration: ${file}`);
  }
} finally {
  await sql.end();
}
