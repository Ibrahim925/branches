export { nativeBridge } from '@/lib/native/bridge';
export type { NativeBridge, NativeSharePayload } from '@/lib/native/types';
export { parseIncomingAppUrl, toInAppPath } from '@/lib/native/deeplink';
export {
  triggerLightImpactHaptic,
  triggerPrimaryActionHaptic,
  triggerSelectionHaptic,
  triggerSuccessHaptic,
} from '@/lib/native/haptics';
