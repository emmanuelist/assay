import {
  bigint, boolean, index, integer, jsonb, pgTable, serial,
  text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * One row per ERC-8004 token id on the canonical BSC IdentityRegistry.
 * A row exists as soon as the id is known to be minted; every other column is
 * nullable, because most of the 329k agents genuinely have nothing behind them.
 * Absence is data here — never backfill a column with a plausible default.
 */
export const agents = pgTable(
  "agents",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    owner: text("owner"),
    tokenUri: text("token_uri"),

    /** how the agent card resolved — the honest provenance of `card` */
    cardStatus: text("card_status").$type<
      "inline" | "http" | "absent" | "malformed" | "unreachable"
    >(),
    card: jsonb("card"),
    cardHost: text("card_host"),

    name: text("name"),
    description: text("description"),

    /** sha256 of normalised name|description — the duplicate-cluster key */
    dedupKey: text("dedup_key"),

    /** declared callable endpoints (~2% of agents have any) */
    endpointCount: integer("endpoint_count").notNull().default(0),
    /** ReputationRegistry.getClients length (~1% of agents are non-zero) */
    clientCount: integer("client_count"),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agents_dedup_idx").on(t.dedupKey),
    index("agents_owner_idx").on(t.owner),
    index("agents_host_idx").on(t.cardHost),
    index("agents_clients_idx").on(t.clientCount),
  ],
);

/** Service endpoints declared in an agent card (MCP / A2A / web / api …). */
export const endpoints = pgTable(
  "endpoints",
  {
    id: serial("id").primaryKey(),
    agentId: bigint("agent_id", { mode: "bigint" }).notNull(),
    type: text("type"),
    url: text("url").notNull(),
  },
  (t) => [
    uniqueIndex("endpoints_agent_url_idx").on(t.agentId, t.url),
    index("endpoints_agent_idx").on(t.agentId),
  ],
);

/** Result of actually calling an endpoint. This is the liveness proof. */
export const probes = pgTable(
  "probes",
  {
    id: serial("id").primaryKey(),
    endpointId: integer("endpoint_id").notNull(),
    agentId: bigint("agent_id", { mode: "bigint" }).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    ok: boolean("ok").notNull(),
    statusCode: integer("status_code"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
  },
  (t) => [
    index("probes_agent_idx").on(t.agentId),
    index("probes_checked_idx").on(t.checkedAt),
  ],
);

/** Backfill cursors and run metadata. */
export const indexState = pgTable("index_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type Endpoint = typeof endpoints.$inferSelect;
export type Probe = typeof probes.$inferSelect;
