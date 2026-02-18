'use client';

import { useEffect } from 'react';

import { nativeBridge } from '@/lib/native';
import { toInAppPath } from '@/lib/native/deeplink';
import type { NativeListenerHandle } from '@/lib/native/types';
import { OfflineBanner } from '@/components/system/OfflineBanner';

type CapacitorKeyboardPlugin = {
  setAccessoryBarVisible: (options: { isVisible: boolean }) => void | Promise<void>;
  addListener: (
    eventName:
      | 'keyboardWillShow'
      | 'keyboardDidShow'
      | 'keyboardWillHide'
      | 'keyboardDidHide',
    listener: (event: { keyboardHeight?: number }) => void
  ) => NativeListenerHandle | Promise<NativeListenerHandle>;
};

type CapacitorStatusBarPlugin = {
  setOverlaysWebView?: (options: { overlay: boolean }) => void | Promise<void>;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    platform?: string;
    isNativePlatform?: () => boolean;
    Plugins?: {
      Keyboard?: CapacitorKeyboardPlugin;
      StatusBar?: CapacitorStatusBarPlugin;
    };
  };
};

const APP_VH_VAR = '--app-vh';
const KEYBOARD_INSET_VAR = '--keyboard-inset';
const KEYBOARD_OPEN_ATTR = 'data-keyboard-open';
const KEYBOARD_OPEN_VAR = '--keyboard-open';

function setAppViewportHeight() {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(APP_VH_VAR, `${window.innerHeight}px`);
}

function setKeyboardInset(value: number) {
  document.documentElement.style.setProperty(KEYBOARD_INSET_VAR, `${Math.max(0, value)}px`);
}

function setKeyboardOpen(isOpen: boolean) {
  document.documentElement.setAttribute(KEYBOARD_OPEN_ATTR, isOpen ? 'true' : 'false');
  document.documentElement.style.setProperty(KEYBOARD_OPEN_VAR, isOpen ? '1' : '0');
}

async function resolveHandle(
  handle: NativeListenerHandle | Promise<NativeListenerHandle> | undefined
) {
  if (!handle) return null;
  if (typeof (handle as Promise<NativeListenerHandle>).then === 'function') {
    return (handle as Promise<NativeListenerHandle>).catch(() => null);
  }
  return handle as NativeListenerHandle;
}

function findScrollableParent(target: EventTarget | null): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  if (!(target instanceof Element)) return null;

  let node: HTMLElement | null = target as HTMLElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const scrollableY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1;

    if (scrollableY) {
      return node;
    }

    node = node.parentElement;
  }

  const rootScroller = document.scrollingElement;
  if (rootScroller instanceof HTMLElement && rootScroller.scrollHeight > rootScroller.clientHeight + 1) {
    return rootScroller;
  }

  return null;
}

export function ClientRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const capacitor = (window as CapacitorWindow).Capacitor;
    const isNative =
      typeof capacitor?.isNativePlatform === 'function'
        ? capacitor.isNativePlatform()
        : capacitor?.platform === 'ios' || capacitor?.platform === 'android';
    const isIOS = capacitor?.platform === 'ios';

    if (!isNative) {
      setAppViewportHeight();
      setKeyboardInset(0);
      setKeyboardOpen(false);
      return;
    }

    const listenerHandles: NativeListenerHandle[] = [];
    let lastNavigatedPath = '';

    const navigateFromIncomingUrl = (incomingUrl: string) => {
      const nextPath = toInAppPath(incomingUrl);
      if (!nextPath || nextPath === lastNavigatedPath) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentPath === nextPath) return;

      lastNavigatedPath = nextPath;
      window.location.assign(nextPath);
    };

    document.documentElement.classList.add('native-app');
    const keyboardPlugin = capacitor?.Plugins?.Keyboard;

    const hideIOSAccessoryBar = () => {
      if (!isIOS || !keyboardPlugin?.setAccessoryBarVisible) return;
      void keyboardPlugin.setAccessoryBarVisible({ isVisible: false });
    };

    if (isIOS) {
      document.documentElement.classList.add('native-ios');
      hideIOSAccessoryBar();
      void capacitor?.Plugins?.StatusBar?.setOverlaysWebView?.({ overlay: true });
      window.setTimeout(hideIOSAccessoryBar, 0);
      window.setTimeout(hideIOSAccessoryBar, 350);
    }

    setAppViewportHeight();
    setKeyboardInset(0);
    setKeyboardOpen(false);

    let touchStartY = 0;
    const onResize = () => {
      setAppViewportHeight();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchStartY = event.touches[0]?.clientY || 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!isIOS || event.defaultPrevented || event.touches.length !== 1) return;

      const currentY = event.touches[0]?.clientY || touchStartY;
      const deltaY = currentY - touchStartY;
      const scrollContainer = findScrollableParent(event.target);

      if (!scrollContainer) {
        event.preventDefault();
        return;
      }

      const atTop = scrollContainer.scrollTop <= 0;
      const atBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (isIOS) {
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    if (keyboardPlugin?.addListener) {
      void resolveHandle(
        keyboardPlugin.addListener('keyboardWillShow', ({ keyboardHeight }) => {
          setKeyboardInset(keyboardHeight || 0);
          setKeyboardOpen(true);
          hideIOSAccessoryBar();
        })
      ).then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
      void resolveHandle(
        keyboardPlugin.addListener('keyboardDidShow', ({ keyboardHeight }) => {
          setKeyboardInset(keyboardHeight || 0);
          setKeyboardOpen(true);
          hideIOSAccessoryBar();
        })
      ).then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
      void resolveHandle(
        keyboardPlugin.addListener('keyboardWillHide', () => {
          setKeyboardInset(0);
          setKeyboardOpen(false);
        })
      ).then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
      void resolveHandle(
        keyboardPlugin.addListener('keyboardDidHide', () => {
          setKeyboardInset(0);
          setKeyboardOpen(false);
        })
      ).then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
    }

    void nativeBridge.getLaunchUrl?.().then((launchUrl) => {
      if (!launchUrl) return;
      navigateFromIncomingUrl(launchUrl);
    });

    const appUrlOpenHandle = nativeBridge.addAppUrlOpenListener?.((event) => {
      navigateFromIncomingUrl(event.url);
    });
    if (appUrlOpenHandle) {
      void appUrlOpenHandle.then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
    }

    const appStateHandle = nativeBridge.addAppStateListener?.((event) => {
      if (!event.isActive) return;
      setAppViewportHeight();
      hideIOSAccessoryBar();
    });
    if (appStateHandle) {
      void appStateHandle.then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
    }

    const networkHandle = nativeBridge.addNetworkListener?.((event) => {
      window.dispatchEvent(new Event(event.connected ? 'online' : 'offline'));
    });
    if (networkHandle) {
      void networkHandle.then((handle) => {
        if (handle) listenerHandles.push(handle);
      });
    }

    return () => {
      listenerHandles.forEach((handle) => handle.remove?.());
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      setKeyboardInset(0);
      setKeyboardOpen(false);
      document.documentElement.classList.remove('native-app');
      document.documentElement.classList.remove('native-ios');
      document.documentElement.removeAttribute(KEYBOARD_OPEN_ATTR);
      document.documentElement.style.removeProperty(KEYBOARD_OPEN_VAR);
    };
  }, []);

  return <OfflineBanner />;
}
