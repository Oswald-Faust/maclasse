"use client";

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`skeleton rounded-[12px] ${className}`} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <div className="mb-8">
        <Skeleton className="mb-3 h-3 w-40" />
        <Skeleton className="h-14 w-[min(460px,80%)]" />
        <Skeleton className="mt-4 h-4 w-[min(640px,92%)]" />
        <Skeleton className="mt-2 h-4 w-[min(560px,82%)]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.32fr_1fr]">
        <div className="card-paper rounded-[18px] p-5 shadow-hard">
          <Skeleton className="mb-4 h-16 w-full" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
        <div className="space-y-4">
          <div className="card-paper rounded-[18px] p-5 shadow-hard">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
          <div className="card-paper rounded-[18px] p-5 shadow-hard">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
