/**
 * Stage E — actually call every declared endpoint.
 *
 * This is the liveness proof the whole product rests on: a registration says
 * nothing, a 200 from the agent's own endpoint says something. A failure is a
 * first-class recorded result, never a gap to be hidden.
 *
 *   npm run index:probe -- [--limit N] [--per-host N] [--stale-hours N]
 */
import "../src/lib/env";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { probes } from "../src/lib/db/schema";
import { hostOf, toFetchableUrl } from "../src/lib/chain/card";

const arg = (f: string) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : undefined; };
const LIMIT = Number(arg("--limit") ?? 0);
const PER_HOST = Number(arg("--per-host") ?? 4);
const STALE_HOURS = Number(arg("--stale-hours") ?? 6);
const TIMEOUT_MS = 8_000;

interface Target { id: number; agentId: bigint; url: string }

async function probeOne(t: Target) {
  const url = toFetchableUrl(t.url);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    // HEAD is widely unimplemented on agent endpoints; GET is the honest probe.
    const res = await fetch(url, {
      method: "GET", signal: ac.signal, redirect: "follow",
      headers: { accept: "*/*", "user-agent": "assay-probe/0.1" },
    });
    return {
      endpointId: t.id, agentId: t.agentId, ok: res.ok,
      statusCode: res.status, latencyMs: Date.now() - started,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : e.message : "unknown";
    return {
      endpointId: t.id, agentId: t.agentId, ok: false,
      statusCode: null, latencyMs: Date.now() - started, error: msg.slice(0, 300),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const rows = await db.execute<{ id: number; agent_id: string; url: string }>(sql`
    select e.id, e.agent_id, e.url
    from endpoints e
    left join lateral (
      select checked_at from probes p where p.endpoint_id = e.id
      order by checked_at desc limit 1
    ) last on true
    where last.checked_at is null
       or last.checked_at < now() - ${`${STALE_HOURS} hours`}::interval
    order by e.id
    ${LIMIT > 0 ? sql`limit ${LIMIT}` : sql``}
  `);

  const targets: Target[] = rows.map((r) => ({ id: r.id, agentId: BigInt(r.agent_id), url: r.url }));
  console.log(`${targets.length.toLocaleString()} endpoints to probe (stale > ${STALE_HOURS}h)\n`);
  if (!targets.length) return;

  const byHost = new Map<string, Target[]>();
  for (const t of targets) {
    const h = hostOf(t.url) ?? "<invalid>";
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h)!.push(t);
  }
  console.log(`${byHost.size} distinct hosts\n`);

  const started = Date.now();
  let done = 0, live = 0;

  await Promise.all([...byHost.values()].map(async (list) => {
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const result = await probeOne(list[i++]);
        await db.insert(probes).values(result);
        done++; if (result.ok) live++;
        if (done % 25 === 0) {
          const rate = done / ((Date.now() - started) / 1000);
          process.stdout.write(
            `\r  ${done.toLocaleString()}/${targets.length.toLocaleString()} · ${live} live · ` +
            `${rate.toFixed(1)}/s · eta ${(((targets.length - done) / Math.max(rate, .01)) / 60).toFixed(1)}m   `,
          );
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PER_HOST, list.length) }, worker));
  }));

  console.log(`\n\ndone — ${live.toLocaleString()} of ${done.toLocaleString()} endpoints answered`);
  process.exit(0);
}

main().catch((e) => { console.error("\nprobe failed:", e); process.exit(1); });
