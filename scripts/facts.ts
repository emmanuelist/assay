/**
 * Reads the figures the narration will speak straight out of the index, and
 * writes film/facts.json.
 *
 * The playbook warns: never narrate a number you have not measured. This goes
 * one further — the script cannot even *hold* a number that disagrees with the
 * page, because both read the same rows. Re-run after any indexing pass.
 *
 * Every fact carries two forms: `display` for captions (329,449) and `spoken`
 * for TTS, because engines mangle grouped digits.
 */
import "../src/lib/env";
import { writeFileSync, mkdirSync } from "node:fs";
import { categoryCounts, registryStats, methodCounts, biggestClusters } from "../src/lib/db/queries";

const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
  "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function under1000(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  const h = Math.floor(n / 100), r = n % 100;
  return `${ONES[h]} hundred${r ? ` and ${under1000(r)}` : ""}`;
}

/** Spoken English for a whole number. TTS reads "329,449" inconsistently. */
export function spoken(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const m = Math.floor(n / 1_000_000);
  const k = Math.floor((n % 1_000_000) / 1000);
  const r = n % 1000;
  if (m) parts.push(`${under1000(m)} million`);
  if (k) parts.push(`${under1000(k)} thousand`);
  if (r) parts.push(under1000(r));
  return parts.join(" ");
}

export interface Fact { n: number; display: string; spoken: string }
const fact = (n: number): Fact => ({ n, display: n.toLocaleString("en-US"), spoken: spoken(n) });

async function main() {
  const [stats, cats, method, clusters] = await Promise.all([
    registryStats(), categoryCounts(), methodCounts(), biggestClusters(1),
  ]);
  const biggest = clusters[0];

  const facts = {
    generatedAt: new Date().toISOString(),
    registered: fact(stats.registered),
    distinct: fact(stats.distinct),
    live: fact(stats.live),
    withEndpoint: fact(stats.withEndpoint),
    rated: fact(stats.rated),
    biggestCluster: { ...fact(biggest?.size ?? 0), name: biggest?.name ?? "one agent" },
    endpointsCalled: fact(method.endpointsCalled),
    endpointsAnswered: fact(method.endpointsAnswered),
    deadCards: fact(method.cardsDead + method.malformed),
    categories: Object.fromEntries(
      cats.map((c) => [c.id, { label: c.label, total: fact(c.total), live: fact(c.live) }]),
    ),
  };

  mkdirSync("film", { recursive: true });
  writeFileSync("film/facts.json", JSON.stringify(facts, null, 2));
  console.log("film/facts.json written\n");
  console.log(`  registered      ${facts.registered.display}`);
  console.log(`  distinct        ${facts.distinct.display}`);
  console.log(`  answered        ${facts.live.display}`);
  console.log(`  biggest cluster ${facts.biggestCluster.display}  (${facts.biggestCluster.name})`);
  console.log(`  endpoints       ${facts.endpointsCalled.display} called, ${facts.endpointsAnswered.display} answered`);
  for (const [id, c] of Object.entries(facts.categories))
    console.log(`  ${id.padEnd(12)} ${c.total.display.padStart(7)}  (${c.live.display} answered)`);
  process.exit(0);
}
main().catch((e) => { console.error("facts failed:", e); process.exit(1); });
