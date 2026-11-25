/** Shown instantly (loading.tsx) while a dashboard page is rendered on the server */
export default function PageSkeleton() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 rounded-lg bg-line" />
      <div className="h-4 w-80 max-w-full rounded bg-line mt-3 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-line" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white border border-line" />
        ))}
      </div>
    </div>
  );
}
