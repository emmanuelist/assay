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
  wrap.innerHTML =
    '<div class="__cap-in"><span class="__cap-t"></span><span class="__cap-r"></span></div>';
  const fl = document.createElement('link');
  fl.rel='stylesheet';
  fl.href='https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap';
  document.head.appendChild(fl);
  const css = document.createElement('style');
  css.textContent = \`
    /* Cinematic lower third.
       The first version was a bordered, blurred box — which reads as a browser
       tooltip sitting on top of a screenshot, not as a film. A caption belongs
       IN the frame: a deep scrim that lifts type off whatever is behind it, no
       hard container, and one accent rule that carries the beat. */
    #__cap{position:fixed;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;
      display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
      padding:0 0 62px;font-family:"Geist",ui-sans-serif,system-ui,sans-serif;}

    /* The scrim is the container. Tall and soft, so there is no visible edge. */
    #__cap::before{content:"";position:absolute;left:0;right:0;bottom:0;height:340px;
      pointer-events:none;opacity:0;transition:opacity .5s cubic-bezier(.16,1,.3,1);
      background:linear-gradient(to top,
        rgba(3,3,8,.95) 0%, rgba(3,3,8,.86) 26%, rgba(3,3,8,.55) 56%, transparent 100%);}
    #__cap.on::before{opacity:1;}

    #__cap .__cap-in{
      position:relative;max-width:44ch;padding:0 32px;text-align:center;
      opacity:0;transform:translateY(14px) scale(.994);
      transition:opacity .46s cubic-bezier(.16,1,.3,1),transform .52s cubic-bezier(.16,1,.3,1);}
    #__cap.on .__cap-in{opacity:1;transform:none;}

    /* Type does the work: large, tight, and shadowed enough to survive any
       background without a box around it. */
    #__cap .__cap-t{
      display:block;font-size:25px;line-height:1.42;letter-spacing:-.021em;
      font-weight:500;color:#f7f9fc;
      text-shadow:0 1px 2px rgba(0,0,0,.9), 0 3px 14px rgba(0,0,0,.75),
                  0 0 42px rgba(0,0,0,.55);
      text-wrap:balance;}

    /* One rule under the line, drawn in the proof ramp. It widens on the beat
       cue that closes each segment, so emphasis is motion rather than colour. */
    #__cap .__cap-r{
      display:block;height:2px;width:0;margin:20px auto 0;border-radius:2px;opacity:.85;
      background:linear-gradient(90deg,#ff5c7c,#ff9557,#ffd166,#8ee06a,#2dd4a7);
      transition:width .85s cubic-bezier(.16,1,.3,1);}
    #__cap.on .__cap-r{width:74px;}
    #__cap.on.beat .__cap-r{width:210px;}
    #__cap.beat .__cap-t{color:#ffffff;}
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
