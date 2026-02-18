'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full min-h-0 flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-2xl border border-stone/40 bg-white/90 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-earth">Unable to load this screen</h2>
        <p className="mt-2 text-sm text-bark/60">
          {error.message || 'Please retry loading this view.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-moss to-leaf px-4 py-2.5 text-sm font-medium text-white"
        >
          Reload View
        </button>
      </div>
    </div>
  );
}
