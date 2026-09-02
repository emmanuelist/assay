import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The connection is created on first query, not at module load.
 *
 * Next collects page data at build time, which imports this module. Throwing
 * here for a missing DATABASE_URL failed the whole build on any host without a
 * database attached. Deferring it means the app builds anywhere and a missing
 * database surfaces at request time, in the error boundary, which already says
 * so in plain words.
 *
 * The pool is cached on globalThis because Next's dev server re-evaluates this
 * module on every hot reload; a fresh pool each time leaked its sockets until
 * the app hung with zero usable connections.
 */
const globalForDb = globalThis as unknown as {
  __assaySql?: ReturnType<typeof postgres>;
  __assayDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Assay reads every figure from a Postgres index " +
        "of the ERC-8004 registry; without it there is nothing truthful to show.",
    );
  }
  const client =
    globalForDb.__assaySql ??
    postgres(url, { max: 12, idle_timeout: 20, connect_timeout: 10 });
  if (process.env.NODE_ENV !== "production") globalForDb.__assaySql = client;
  return drizzle(client, { schema });
}

function instance() {
  if (!globalForDb.__assayDb) globalForDb.__assayDb = connect();
  return globalForDb.__assayDb;
}

/** Proxies to a connection opened on first use. */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_t, prop, receiver) {
    return Reflect.get(instance(), prop, receiver);
  },
});

export { schema };
