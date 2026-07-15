import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as schema from "../drizzle/schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  const url = process.env.DATABASE_URL || ENV.databaseUrl;
  if (!_db && url) {
    try {
      _client = postgres(url, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 15,
        ssl: url.includes("render.com") || url.includes("sslmode=require")
          ? "require"
          : undefined,
      });
      _db = drizzle(_client, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      lastSignedIn: user.lastSignedIn ?? new Date(),
      updatedAt: new Date(),
    };

    if (user.name !== undefined) values.name = user.name ?? null;
    if (user.email !== undefined) values.email = user.email ?? null;
    if (user.loginMethod !== undefined) values.loginMethod = user.loginMethod ?? null;
    if (user.passwordHash !== undefined) values.passwordHash = user.passwordHash ?? null;
    if (user.role !== undefined) {
      values.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: {
          ...(values.name !== undefined ? { name: values.name } : {}),
          ...(values.email !== undefined ? { email: values.email } : {}),
          ...(values.loginMethod !== undefined
            ? { loginMethod: values.loginMethod }
            : {}),
          ...(values.passwordHash !== undefined
            ? { passwordHash: values.passwordHash }
            : {}),
          ...(values.role !== undefined ? { role: values.role } : {}),
          lastSignedIn: values.lastSignedIn,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
