/**
 * Title cards, in Assay's own type and palette.
 *
 * Filmed as ordinary segments so they inherit trimming, the manifest and the
 * mix. Built in HTML rather than as an ffmpeg overlay so they carry the
 * product's typography — and, here, its actual mark: the four proof bars that
 * every agent in the ledger renders.
 */
export type Card = {
  name: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  secs: number;
  /** Draw the four-bar mark above the title. */
  mark?: boolean;
};

export const THEME = {
  ground: "#07070f",
  ink: "#f2f5f8",
  dim: "#98a2b3",
  ramp: ["#ff5c7c", "#ff9557", "#ffd166", "#8ee06a", "#2dd4a7"],
  proven: "#2dd4a7",
  accent: "#4cc9ff",
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, Menlo, monospace',
  fonts:
    "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap",
};

export function cardHTML(c: Card): string {
  const t = THEME;
  const mark = c.mark
    ? `<svg class="m" width="88" height="80" viewBox="0 0 22 20" fill="none" aria-hidden>
         <rect x="0"  y="0" width="3" height="20" rx="1.5" fill="${t.ramp[4]}"/>
         <rect x="6"  y="0" width="3" height="20" rx="1.5" fill="${t.ramp[3]}"/>
         <rect x="12" y="0" width="3" height="20" rx="1.5" fill="${t.ramp[2]}"/>
         <rect x="18" y="0" width="3" height="20" rx="1.5" fill="none" stroke="#333a5c" stroke-width="1"/>
       </svg>`
    : "";
  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fonts}" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;background:${t.ground};overflow:hidden}
  body{display:grid;place-items:center;font-family:${t.sans};color:${t.ink}}
  .w{max-width:30ch;padding:0 60px;text-align:center}
  .m{opacity:0;animation:up .8s cubic-bezier(.16,1,.3,1) .1s forwards;margin-bottom:34px}
  .k{font-family:${t.mono};font-size:11px;letter-spacing:.2em;text-transform:uppercase;
     color:${t.accent};opacity:0;animation:up .7s cubic-bezier(.16,1,.3,1) .3s forwards}
  h1{font-weight:600;letter-spacing:-.045em;line-height:1.03;
     font-size:clamp(34px,5.4vw,66px);margin:14px 0 0;opacity:0;
     animation:up .9s cubic-bezier(.16,1,.3,1) .45s forwards}
  p{font-size:17px;line-height:1.55;color:${t.dim};margin:22px 0 0;opacity:0;max-width:34ch;
    margin-left:auto;margin-right:auto;
    animation:up .85s cubic-bezier(.16,1,.3,1) .72s forwards}
  .r{height:2px;margin:36px auto 0;width:0;border-radius:2px;
     background:linear-gradient(90deg,${t.ramp.join(",")});
     animation:grow 1.3s cubic-bezier(.16,1,.3,1) .9s forwards}
  @keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes grow{to{width:200px}}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;
    background:
      radial-gradient(48% 52% at 18% 26%,rgba(45,212,167,.16),transparent 70%),
      radial-gradient(42% 48% at 82% 14%,rgba(76,201,255,.16),transparent 70%),
      radial-gradient(46% 46% at 52% 76%,rgba(167,139,250,.12),transparent 72%);
    filter:blur(18px)}
</style>
<div class="w">
  ${mark}
  ${c.kicker ? `<div class="k">${c.kicker}</div>` : ""}
  <h1>${c.title}</h1>
  ${c.subtitle ? `<p>${c.subtitle}</p>` : ""}
  <div class="r"></div>
</div>`;
}

export const CARDS: Card[] = [
  {
    name: "00-open",
    mark: true,
    kicker: "BNB Chain · ERC-8004",
    title: "Assay",
    subtitle: "An agent earns its place by what it can prove.",
    secs: 5.5,
  },
  {
    name: "09-close",
    mark: true,
    title: "Assay",
    subtitle:
      "Proof of agent, on BNB Smart Chain. Every figure read live from the registry.",
    secs: 6,
  },
];
