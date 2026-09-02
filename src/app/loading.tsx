import { SkeletonBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen pt-24 pb-24">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-6">
        <div className="pt-8 sm:pt-16 pb-14 space-y-4" role="status" aria-label="Loading">
          <SkeletonBar w="72%" h={56} />
          <SkeletonBar w="54%" h={56} />
          <div className="pt-5 space-y-2">
            <SkeletonBar w="46%" />
            <SkeletonBar w="38%" />
          </div>
          <span className="sr-only">Loading…</span>
        </div>
        <div className="bento">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="cell space-y-3">
              <SkeletonBar w="60%" h={34} />
              <SkeletonBar w="40%" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
