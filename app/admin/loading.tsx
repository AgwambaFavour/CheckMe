/** Shown instantly while an admin page loads, so taps feel responsive. */
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-lg bg-line" />
      <div className="h-4 w-32 rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-line" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-line" />
    </div>
  );
}
