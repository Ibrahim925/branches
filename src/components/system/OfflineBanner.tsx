'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed left-3 right-3 top-3 z-[100] safe-top">
      <div className="rounded-xl bg-earth text-white shadow-xl px-3 py-2 text-xs flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        You are offline. Cached content is available and new changes will retry when connected.
      </div>
    </div>
  );
}
