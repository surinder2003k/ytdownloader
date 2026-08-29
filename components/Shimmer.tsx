export function ShimmerCard() {
  return (
    <div className="skeleton h-32 w-full" />
  );
}

export function LoadingState() {
  return (
    <div className="mt-10 w-full">
      {/* Video header skeleton */}
      <div className="glass flex gap-4 rounded-2xl p-4">
        <div className="skeleton h-24 w-40 shrink-0" />
        <div className="flex flex-1 flex-col justify-center gap-3 py-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-3 w-1/4" />
        </div>
      </div>
      {/* Quality cards skeleton */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerCard key={i} />
        ))}
      </div>
    </div>
  );
}
