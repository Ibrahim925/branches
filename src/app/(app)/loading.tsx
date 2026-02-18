export default function AppLoading() {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-stone/35" />
          <div className="h-4 w-80 animate-pulse rounded-lg bg-stone/30" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-stone/35 bg-white/70 p-2">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-stone/35" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-stone/30" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-2xl border border-stone/35 bg-white/72"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
