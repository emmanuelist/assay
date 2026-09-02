import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

/**
 * Next's dev server re-evaluates this module on every hot reload. Creating a
 * fresh pool each time leaks the previous one's sockets until the app hangs
 * with zero usable connections — which it did, silently, after ~20 edits.
 * Cache on globalThis so HMR reuses one pool.
 */
const globalForDb = globalThis as unknown as {
  __assaySql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__assaySql ??
  postgres(url, { max: 12, idle_timeout: 20, connect_timeout: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.__assaySql = client;

export const db = drizzle(client, { schema });
export { schema };
