type MetricPayload = {
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export function trackPerformanceMetric(
  name: string,
  value: number,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return;

  const payload: MetricPayload = {
    name,
    value,
    timestamp: new Date().toISOString(),
    metadata,
  };

  window.dispatchEvent(new CustomEvent<MetricPayload>('branches:performance', { detail: payload }));

  if (process.env.NODE_ENV !== 'production') {
    // Keep this in dev only to avoid noisy production logs.
    console.info(`[perf] ${name}: ${Math.round(value)}ms`, metadata || {});
  }
}

export function trackRouteTransitionMetric(route: string, durationMs: number) {
  trackPerformanceMetric('route.transition.ms', durationMs, { route });
}

export function trackLowFpsMode(enabled: boolean, metadata?: Record<string, unknown>) {
  trackPerformanceMetric('ui.low_fps_mode.enabled', enabled ? 1 : 0, metadata);
}
