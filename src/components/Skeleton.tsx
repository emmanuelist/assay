/** Shapes match the real layout so nothing jumps when data lands. */
export function SkeletonBar({ w = "100%", h = 12 }: { w?: string; h?: number }) {
  return (
    <span
      className="block rounded animate-pulse bg-surface-2"
      style={{ width: w, height: h }}
      aria-hidden
    />
  );
}

export function LedgerSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="space-y-px" role="status" aria-label="Loading agents">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-line">
          <SkeletonBar w="52px" h={16} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <SkeletonBar w={`${38 + ((i * 13) % 34)}%`} />
            <SkeletonBar w={`${22 + ((i * 7) % 26)}%`} h={9} />
          </div>
          <SkeletonBar w="48px" h={10} />
          <SkeletonBar w="56px" h={10} />
        </div>
      ))}
      <span className="sr-only">Loading agents…</span>
    </div>
  );
}
