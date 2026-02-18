'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-stone/20 via-white to-leaf/10 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-stone/40 bg-white/90 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-earth">Something went wrong</h1>
          <p className="mt-2 text-sm text-bark/60">
            {error.message || 'An unexpected error occurred while loading Branches.'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-moss to-leaf px-4 py-2.5 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
