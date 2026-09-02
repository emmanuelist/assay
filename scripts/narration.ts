/**
 * The narration script for Assay.
 *
 * Two renderings of one script:
 *   `text` — shown as captions. Digits, because a caption is read.
 *   `say`  — spoken. Numbers written out, because TTS mangles grouped digits.
 * Both must split into the SAME number of sentences: timing maps by index.
 *
 * Every figure is interpolated from film/facts.json, which is read straight out
 * of the index. The script therefore cannot claim a number the page does not
 * show. Regenerate facts after any indexing pass.
 */
import { readFileSync } from "node:fs";

export type Block = { segment: string; secs: number; text: string; say?: string };

type Fact = { n: number; display: string; spoken: string };
type Facts = {
  registered: Fact; distinct: Fact; live: Fact; withEndpoint: Fact; rated: Fact;
  biggestCluster: Fact & { name: string };
  endpointsCalled: Fact; endpointsAnswered: Fact; deadCards: Fact;
  categories: Record<string, { label: string; total: Fact; live: Fact }>;
};

const F: Facts = JSON.parse(readFileSync("film/facts.json", "utf8"));
const d = (f: Fact) => f.display;
const s = (f: Fact) => f.spoken;

export const NARRATION: Block[] = [
  {
    segment: "01-claim",
    secs: 26,
    text:
      `Say you want to hire an AI agent on BNB Chain. ` +
      `There is a registry for exactly that, and it holds ${d(F.registered)} of them. ` +
      `That number is the problem, not the feature. ` +
      `Because when you call them, only ${d(F.live)} answer.`,
    say:
      `Say you want to hire an AI agent on BNB Chain. ` +
      `There is a registry for exactly that, and it holds ${s(F.registered)} of them. ` +
      `That number is the problem, not the feature. ` +
      `Because when you call them, only ${s(F.live)} answer.`,
  },
  {
    segment: "02-landfill",
    secs: 26,
    text:
      `Collapse every registration sharing an identical name and description. ` +
      `That collapses ${d(F.registered)} registrations down to just ${d(F.distinct)}. ` +
      `A single agent is registered ${d(F.biggestCluster)} times. ` +
      `Rank this registry by recency, the way a directory does, and that is your first thousand results.`,
    say:
      `Collapse every registration sharing an identical name and description. ` +
      `That collapses ${s(F.registered)} registrations down to just ${s(F.distinct)}. ` +
      `A single agent is registered ${s(F.biggestCluster)} times. ` +
      `Rank this registry by recency, the way a directory does, and that is your first thousand results.`,
  },
  {
    segment: "03-categories",
    secs: 24,
    text:
      `The four categories a marketplace needs are in there, but buried. ` +
      `Rebalancing has ${d(F.categories.rebalancing.total)} agents in it. Health factor has ${d(F.categories.health.total)}. ` +
      `Grid trading looks healthy until you count how few can actually be reached. ` +
      `A category is what an agent says about itself. Only the proof was checked.`,
    say:
      `The four categories a marketplace needs are in there, but buried. ` +
      `Rebalancing has ${s(F.categories.rebalancing.total)} agents in it. Health factor has ${s(F.categories.health.total)}. ` +
      `Grid trading looks healthy until you count how few can actually be reached. ` +
      `A category is what an agent says about itself. Only the proof was checked.`,
  },
  {
    segment: "04-assay",
    secs: 30,
    text:
      `So Assay asks every agent the same four questions. ` +
      `Who does it say it is. Does it answer when called. ` +
      `What may it spend, and can you stop it. Has anyone actually used it. ` +
      `Each one is answered with evidence, or left blank. ` +
      `Most agents leave most of it blank. That blank is not a loading state. It is the finding.`,
  },
  {
    segment: "05-ledger",
    secs: 26,
    text:
      `Rank by what they can prove and the registry inverts. ` +
      `The agents on top answered in milliseconds, and their latency is coloured by how fast. ` +
      `Authority is blank on every single row. ` +
      `Not one agent here runs under a session you could cap, expire, or revoke.`,
  },
  {
    segment: "06-proof",
    secs: 28,
    text:
      `None of this is sampled, estimated, or mocked. ` +
      `Assay walked every token id through multicall, resolved every agent card, ` +
      `and called every endpoint they publish. ` +
      `That is ${d(F.endpointsCalled)} real calls, of which ${d(F.endpointsAnswered)} answered. ` +
      `The figures on the page are row counts from that work, and you can re-run it against a public node with no key.`,
    say:
      `None of this is sampled, estimated, or mocked. ` +
      `Assay walked every token id through multicall, resolved every agent card, ` +
      `and called every endpoint they publish. ` +
      `That is ${s(F.endpointsCalled)} real calls, of which ${s(F.endpointsAnswered)} answered. ` +
      `The figures on the page are row counts from that work, and you can re-run it against a public node with no key.`,
  },
  {
    segment: "07-limits",
    secs: 20,
    text:
      `What this does not prove. ` +
      `Answering a call means an endpoint is up, not that the agent behind it is any good. ` +
      `This is mainnet data, read only, and nothing here is audited. ` +
      `An agent earns its place by what it can prove, not by the fact that it registered.`,
  },
];
