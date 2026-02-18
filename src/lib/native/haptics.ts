type HapticsImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';

type CapacitorHapticsPlugin = {
  impact?: (options: { style: HapticsImpactStyle }) => Promise<void> | void;
  notification?: (options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void> | void;
  selectionStart?: () => Promise<void> | void;
  selectionChanged?: () => Promise<void> | void;
  selectionEnd?: () => Promise<void> | void;
  vibrate?: (options?: { duration?: number }) => Promise<void> | void;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    Plugins?: {
      Haptics?: CapacitorHapticsPlugin;
    };
  };
};

function getHapticsPlugin() {
  if (typeof window === 'undefined') return null;
  return (window as CapacitorWindow).Capacitor?.Plugins?.Haptics || null;
}

function vibrateFallback(duration: number) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(Math.max(5, duration));
}

async function runWithFallback(
  runPluginCall: (() => Promise<void> | void) | null,
  fallbackDuration: number
) {
  if (!runPluginCall) {
    vibrateFallback(fallbackDuration);
    return;
  }

  try {
    await runPluginCall();
  } catch {
    vibrateFallback(fallbackDuration);
  }
}

export async function triggerPrimaryActionHaptic() {
  const plugin = getHapticsPlugin();
  await runWithFallback(() => plugin?.impact?.({ style: 'MEDIUM' }), 12);
}

export async function triggerSelectionHaptic() {
  const plugin = getHapticsPlugin();

  if (plugin?.selectionChanged) {
    await runWithFallback(async () => {
      await plugin.selectionStart?.();
      await plugin.selectionChanged?.();
      await plugin.selectionEnd?.();
    }, 8);
    return;
  }

  await runWithFallback(() => plugin?.impact?.({ style: 'LIGHT' }), 8);
}

export async function triggerLightImpactHaptic() {
  const plugin = getHapticsPlugin();
  await runWithFallback(() => plugin?.impact?.({ style: 'LIGHT' }), 10);
}

export async function triggerSuccessHaptic() {
  const plugin = getHapticsPlugin();
  await runWithFallback(() => plugin?.notification?.({ type: 'SUCCESS' }), 16);
}
