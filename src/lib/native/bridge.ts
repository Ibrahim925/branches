import type {
  AppStateEvent,
  AppUrlOpenEvent,
  NativeBridge,
  NativeListenerHandle,
  NativeSharePayload,
  NetworkStatusEvent,
} from '@/lib/native/types';

type CapacitorWindow = Window & {
  Capacitor?: {
    platform?: string;
    isNativePlatform?: () => boolean;
    Plugins?: {
      App?: {
        getLaunchUrl?: () => Promise<{ url?: string | null } | null>;
        addListener: (
          eventName: 'appUrlOpen' | 'appStateChange',
          listener: (event: AppUrlOpenEvent | AppStateEvent) => void
        ) => NativeListenerHandle | Promise<NativeListenerHandle>;
      };
      Network?: {
        addListener: (
          eventName: 'networkStatusChange',
          listener: (status: NetworkStatusEvent) => void
        ) => NativeListenerHandle | Promise<NativeListenerHandle>;
      };
      Share?: {
        share: (payload: NativeSharePayload) => Promise<void>;
      };
      Clipboard?: {
        write: (payload: { string: string }) => Promise<void>;
      };
      Camera?: {
        getPhoto: (options: {
          quality?: number;
          resultType?: 'dataUrl' | 'uri' | 'base64String';
          source?: 'PROMPT' | 'PHOTOS' | 'CAMERA';
        }) => Promise<{ dataUrl?: string; webPath?: string; format?: string }>;
      };
      Browser?: {
        open: (payload: { url: string }) => Promise<void>;
      };
    };
  };
};

function getCapacitor() {
  if (typeof window === 'undefined') return null;
  return (window as CapacitorWindow).Capacitor || null;
}

async function resolveListenerHandle(
  handle: NativeListenerHandle | Promise<NativeListenerHandle> | undefined
) {
  if (!handle) return null;
  if (typeof (handle as Promise<NativeListenerHandle>).then === 'function') {
    return (handle as Promise<NativeListenerHandle>).catch(() => null);
  }
  return handle as NativeListenerHandle;
}

function isNativePlatform() {
  const capacitor = getCapacitor();
  if (!capacitor) return false;

  if (typeof capacitor.isNativePlatform === 'function') {
    return capacitor.isNativePlatform();
  }

  return capacitor.platform === 'ios' || capacitor.platform === 'android';
}

async function blobToFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return blobToFile(blob, filename);
}

async function webPathToFile(path: string, filename = `image-${Date.now()}.jpg`) {
  const response = await fetch(path);
  const blob = await response.blob();
  return blobToFile(blob, filename);
}

function createFileInputPicker(): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.width = '1px';
    input.style.height = '1px';

    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
      input.remove();
    };

    input.oncancel = () => {
      resolve(null);
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  });
}

async function fallbackCopyText(text: string) {
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

class BrowserNativeBridge implements NativeBridge {
  isNativeApp() {
    return (
      isNativePlatform() ||
      process.env.NEXT_PUBLIC_IOS_APP === '1'
    );
  }

  async share(payload: NativeSharePayload) {
    const capacitorShare = getCapacitor()?.Plugins?.Share;
    if (capacitorShare) {
      await capacitorShare.share(payload);
      return true;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return true;
      } catch {
        return false;
      }
    }

    if (payload.url) {
      return this.copyText(payload.url);
    }

    return false;
  }

  async copyText(text: string) {
    const capacitorClipboard = getCapacitor()?.Plugins?.Clipboard;
    if (capacitorClipboard) {
      await capacitorClipboard.write({ string: text });
      return true;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return fallbackCopyText(text);
      }
    }

    return fallbackCopyText(text);
  }

  async pickImage() {
    const capacitorCamera = getCapacitor()?.Plugins?.Camera;
    if (capacitorCamera) {
      try {
        const photo = await capacitorCamera.getPhoto({
          quality: 85,
          resultType: 'uri',
          source: 'PROMPT',
        });

        if (photo.webPath) {
          const ext = photo.format ? `.${photo.format}` : '.jpg';
          return webPathToFile(photo.webPath, `photo-${Date.now()}${ext}`);
        }

        if (photo.dataUrl) {
          return dataUrlToFile(photo.dataUrl, `photo-${Date.now()}.jpg`);
        }
      } catch {
        return null;
      }
    }

    return createFileInputPicker();
  }

  async openExternalUrl(url: string) {
    const browserPlugin = getCapacitor()?.Plugins?.Browser;
    if (browserPlugin) {
      await browserPlugin.open({ url });
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async getLaunchUrl() {
    const appPlugin = getCapacitor()?.Plugins?.App;
    if (!appPlugin?.getLaunchUrl) return null;

    try {
      const launchUrl = await appPlugin.getLaunchUrl();
      return launchUrl?.url || null;
    } catch {
      return null;
    }
  }

  async addAppUrlOpenListener(listener: (event: AppUrlOpenEvent) => void) {
    const appPlugin = getCapacitor()?.Plugins?.App;
    if (!appPlugin?.addListener) return null;
    return resolveListenerHandle(
      appPlugin.addListener('appUrlOpen', listener as (event: AppUrlOpenEvent | AppStateEvent) => void)
    );
  }

  async addAppStateListener(listener: (event: AppStateEvent) => void) {
    const appPlugin = getCapacitor()?.Plugins?.App;
    if (!appPlugin?.addListener) return null;
    return resolveListenerHandle(
      appPlugin.addListener('appStateChange', listener as (event: AppUrlOpenEvent | AppStateEvent) => void)
    );
  }

  async addNetworkListener(listener: (event: NetworkStatusEvent) => void) {
    const networkPlugin = getCapacitor()?.Plugins?.Network;
    if (!networkPlugin?.addListener) return null;
    return resolveListenerHandle(networkPlugin.addListener('networkStatusChange', listener));
  }
}

export const nativeBridge: NativeBridge = new BrowserNativeBridge();
