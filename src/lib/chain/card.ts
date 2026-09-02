import { createHash } from "node:crypto";

/** Shape actually observed on-chain. Everything is optional because most cards are junk. */
export interface AgentCard {
  name?: unknown;
  description?: unknown;
  type?: unknown;
  services?: unknown;
  endpoints?: unknown;
  registrations?: unknown;
  [k: string]: unknown;
}

export type CardStatus = "inline" | "http" | "absent" | "malformed" | "unreachable";

export interface ResolvedCard {
  status: CardStatus;
  card: AgentCard | null;
  host: string | null;
  name: string | null;
  description: string | null;
  endpoints: { type: string | null; url: string }[];
  dedupKey: string | null;
}

const EMPTY: ResolvedCard = {
  status: "absent", card: null, host: null,
  name: null, description: null, endpoints: [], dedupKey: null,
};

const asText = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t.slice(0, 2000) : null;
};

/**
 * Duplicate-cluster key. 77% of inline cards sit in a cluster and 108/154 of a
 * random sample were one template, so this is the field the whole ranking hangs
 * off. Normalisation is deliberately aggressive: case, whitespace and trailing
 * punctuation must not split a cluster.
 */
export function dedupKeyFor(name: string | null, description: string | null): string | null {
  const norm = (s: string | null) =>
    (s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[.…]+$/, "").trim();
  const basis = `${norm(name)}|${norm(description)}`;
  if (basis === "|") return null;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function extractEndpoints(card: AgentCard): { type: string | null; url: string }[] {
  const raw = card.services ?? card.endpoints;
  if (!Array.isArray(raw)) return [];
  const out: { type: string | null; url: string }[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    const url = asText(rec.url ?? rec.endpoint ?? rec.uri);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    out.push({ type: asText(rec.type) ?? null, url });
  }
  return out;
}

function fromCard(card: AgentCard, status: CardStatus, host: string | null): ResolvedCard {
  const name = asText(card.name);
  const description = asText(card.description);
  return {
    status, card, host, name, description,
    endpoints: extractEndpoints(card),
    dedupKey: dedupKeyFor(name, description),
  };
}

const DATA_PREFIX = "data:application/json;base64,";

/** Parse without touching the network. Returns `null` when a fetch is required. */
export function parseTokenUri(tokenUri: string | null | undefined): ResolvedCard | null {
  const uri = tokenUri?.trim();
  if (!uri) return EMPTY;

  if (uri.startsWith(DATA_PREFIX)) {
    try {
      const json = Buffer.from(uri.slice(DATA_PREFIX.length), "base64").toString("utf8");
      const parsed = JSON.parse(json) as unknown;
      if (!parsed || typeof parsed !== "object") return { ...EMPTY, status: "malformed" };
      return fromCard(parsed as AgentCard, "inline", null);
    } catch {
      return { ...EMPTY, status: "malformed" };
    }
  }

  // ipfs:// is a legitimate scheme; it needs a gateway, not a rejection.
  if (/^(https?|ipfs):\/\//i.test(uri)) return null; // caller must fetch
  return { ...EMPTY, status: "malformed" };
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** ipfs://<cid>/<path> -> a gateway URL. Returns the input for other schemes. */
export function toFetchableUrl(uri: string): string {
  const m = /^ipfs:\/\/(?:ipfs\/)?(.+)$/i.exec(uri.trim());
  return m ? IPFS_GATEWAY + m[1] : uri;
}

export function hostOf(uri: string): string | null {
  try { return new URL(toFetchableUrl(uri)).host; } catch { return null; }
}

/** Fetch an off-chain agent card. Unreachable is a real, recordable outcome. */
export async function fetchCard(uri: string, timeoutMs = 10_000): Promise<ResolvedCard> {
  const target = toFetchableUrl(uri);
  const host = hostOf(uri);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      signal: ac.signal,
      headers: { accept: "application/json", "user-agent": "assay-indexer/0.1" },
    });
    if (!res.ok) return { ...EMPTY, status: "unreachable", host };
    const parsed = (await res.json()) as unknown;
    if (!parsed || typeof parsed !== "object") return { ...EMPTY, status: "malformed", host };
    return fromCard(parsed as AgentCard, "http", host);
  } catch {
    return { ...EMPTY, status: "unreachable", host };
  } finally {
    clearTimeout(timer);
  }
}
