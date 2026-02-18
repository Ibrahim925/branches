'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const SPLASH_MIN_VISIBLE_MS = 900;

export function AppLaunchSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_MIN_VISIBLE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gradient-to-br from-[#F6F2E9] via-[#F1ECE2] to-[#E8E0D2]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-stone/45 bg-white/92 shadow-xl shadow-moss/15">
          <Image
            src="/icon.svg"
            alt="Branches logo"
            width={44}
            height={44}
            priority
          />
        </div>
        <p className="text-2xl font-semibold tracking-tight text-earth">Branches</p>
      </div>
    </div>
  );
}
