export function Stat({
  n, label, note, tone = "neutral", size = "md",
}: {
  n: number;
  label: string;
  note?: string;
  tone?: "neutral" | "proven" | "refuted";
  size?: "md" | "lg";
}) {
  const toneCls =
    tone === "proven" ? "text-proven" : tone === "refuted" ? "text-refuted" : "text-fg";
  const sizeCls =
    size === "lg"
      ? "text-[clamp(2.6rem,6.5vw,4.25rem)]"
      : "text-[clamp(1.75rem,3.6vw,2.5rem)]";
  return (
    /* Top-aligned with a fixed rhythm. An earlier justify-between let the gap
       between figure and label stretch to cell height — 53px in one cell, 12px
       in another, which read as a mistake rather than a hierarchy. */
    <div>
      <p className={`${sizeCls} ${toneCls} font-semibold tracking-[-0.03em] leading-[0.95] tnum`}>
        {n.toLocaleString()}
      </p>
      <p className="mt-3 text-[13px] font-medium">{label}</p>
      {note && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted max-w-[42ch]">{note}</p>
      )}
    </div>
  );
}
