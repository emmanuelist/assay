/**
 * Captions, derived FROM the narration rather than written alongside it.
 *
 * One script, two renderings: the same sentences are spoken and shown. Written
 * separately they drift, and a caption contradicting the voice is worse than no
 * caption at all.
 *
 * Rendered inside the page during filming rather than burned on afterwards:
 * this ffmpeg ships without libass/libfreetype, and doing it in the page is
 * better anyway, because captions inherit the product's own typography.
 * Judges watch muted, so these carry the argument on their own.
 */
import { NARRATION } from "./narration.js";
import { readFileSync } from "node:fs";

export type Cue = { at: number; secs: number; text: string; kind?: "beat" | "note" };

const WPS = 2.6;            // calm delivery
const LEAD = 0.35;          // captions land a beat before the voice

/** Sentences, kept whole. A caption split mid-clause is unreadable at speed. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    // Merge very short fragments into the previous line so nothing flashes.
    .reduce<string[]>((acc, s) => {
      const words = s.split(/\s+/).length;
      if (words <= 4 && acc.length) acc[acc.length - 1] += " " + s;
      else acc.push(s);
      return acc;
    }, []);
}

/** Time is allocated by word count, which is how long it takes to say it. */
function cuesFor(text: string, window: number): Cue[] {
  const parts = sentences(text);
  const total = parts.reduce((a, s) => a + s.split(/\s+/).length, 0);
  let t = LEAD;
  return parts.map((s, i) => {
    const share = s.split(/\s+/).length / total;
    const secs = Math.max(2.2, share * (window - LEAD));
    const cue: Cue = { at: +t.toFixed(2), secs: +secs.toFixed(2), text: s };
    // The closing sentence of each segment is the beat worth emphasising.
    if (i === parts.length - 1) cue.kind = "beat";
    t += secs;
    return cue;
  });
}

/** Prefer measured sentence timings from the generated audio. Estimating from
 *  words per second drifts within a segment, and a caption that no longer
 *  matches the voice is worse than no caption. */
function load(): Record<string, Cue[]> {
  try {
    const raw = readFileSync(new URL("../film/timing.json", import.meta.url).pathname, "utf8");
    const t = JSON.parse(raw) as Record<string, { text: string; at: number; secs: number }[]>;
    const out: Record<string, Cue[]> = {};
    for (const [seg, lines] of Object.entries(t)) {
      out[seg] = lines.map((l, i) => ({
        at: Math.max(0, l.at - LEAD),
        secs: l.secs + LEAD,
        text: l.text,
        ...(i === lines.length - 1 ? { kind: "beat" as const } : {}),
      }));
    }
    return out;
  } catch {
    return Object.fromEntries(NARRATION.map((b) => [b.segment, cuesFor(b.text, b.secs)]));
  }
}

export const CUES: Record<string, Cue[]> = load();

export const CAPTION_RUNTIME = `
(cues => {
  const wrap = document.createElement('div');
  wrap.id = '__cap';
  wrap.innerHTML = '<div class="__cap-in"><span class="__cap-t"></span></div>';
  const fl = document.createElement('link');
  fl.rel='stylesheet';
  fl.href='https://fonts.googleapis.com/css2?family=Geist:wght@400;450;500&display=swap';
  document.head.appendChild(fl);
  const css = document.createElement('style');
  css.textContent = \`
    /* Assay is a full-width document, so captions sit centred at the foot of
       the frame over a scrim, rather than tucked beside a column. The scrim is
       what stops a caption competing with the ledger rows behind it. */
    #__cap{position:fixed;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;
      display:flex;justify-content:center;padding:0 0 40px;
      font-family:"Geist",ui-sans-serif,system-ui,sans-serif;}
    #__cap::before{content:"";position:absolute;left:0;right:0;bottom:0;height:210px;
      background:linear-gradient(to top,rgba(4,4,9,.94),rgba(4,4,9,.72) 42%,transparent);
      opacity:0;transition:opacity .4s ease;}
    #__cap.on::before{opacity:1;}
    #__cap .__cap-in{
      position:relative;max-width:60ch;margin:0;padding:15px 26px;text-align:center;
      background:rgba(10,10,20,.86);border:1px solid rgba(76,201,255,.26);
      border-radius:10px;backdrop-filter:blur(14px) saturate(160%);
      box-shadow:0 18px 60px rgba(0,0,0,.7);
      opacity:0;transform:translateY(10px);
      transition:opacity .40s cubic-bezier(.16,1,.3,1),transform .40s cubic-bezier(.16,1,.3,1);}
    #__cap.on .__cap-in{opacity:1;transform:none;}
    #__cap .__cap-t{font-size:18px;line-height:1.5;letter-spacing:-.015em;color:#f2f5f8;
      font-weight:450;}
    #__cap.beat .__cap-in{border-color:rgba(45,212,167,.55);
      box-shadow:0 0 0 1px rgba(45,212,167,.14),0 18px 70px rgba(0,0,0,.72);}
    #__cap.beat .__cap-t{color:#2dd4a7;}
  \`;
  document.head.appendChild(css);
  // Outside body: body carries the zoom transform, and a transformed ancestor
  // becomes the containing block for position:fixed descendants.
  document.documentElement.appendChild(wrap);
  const el = wrap.querySelector('.__cap-t');
  // Sentences run back to back, so the caption SWAPS text and stays up. An
  // independent hide timer per cue meant the previous cue's hide fired after
  // the next cue had already shown, and every caption flashed off immediately.
  cues.forEach((c, i) => {
    setTimeout(() => {
      const swap = () => {
        el.textContent = c.text;
        wrap.classList.toggle('beat', c.kind === 'beat');
        wrap.classList.add('on');
      };
      if (i === 0) return swap();
      // Brief dip between lines so the change reads as a change.
      wrap.classList.remove('on');
      setTimeout(swap, 170);
    }, c.at * 1000);
  });
  const last = cues[cues.length - 1];
  setTimeout(() => wrap.classList.remove('on'), (last.at + last.secs + 0.4) * 1000);
})(__CUES__);
`;
