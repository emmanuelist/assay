import { LedgerSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function LedgerLoading() {
  return (
    <main className="min-h-screen pt-20">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-6">
        <div className="pt-8 pb-7 space-y-4">
          <SkeletonBar w="30%" h={38} />
          <SkeletonBar w="58%" />
        </div>
        <LedgerSkeleton />
      </div>
    </main>
  );
}
