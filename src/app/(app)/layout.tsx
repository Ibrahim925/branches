'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TreePine,
  LayoutGrid,
  Activity,
  MessageCircle,
  Image as ImageIcon,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';
import { trackRouteTransitionMetric } from '@/lib/telemetry/performance';
import { triggerSelectionHaptic } from '@/lib/native/haptics';
import { buildImageCropStyle } from '@/utils/imageCrop';

type SidebarProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
};

type SidebarProfileSummary = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  avatarZoom: number | null;
  avatarFocusX: number | null;
  avatarFocusY: number | null;
};

const GLOBAL_NAV = [
  { icon: LayoutGrid, label: 'Home', href: '/dashboard' },
  { icon: Activity, label: 'Family Pulse', href: '/pulse' },
] as const;

const GRAPH_NAV = [
  { icon: TreePine, label: 'Tree', path: '' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: ImageIcon, label: 'Memories', path: '/memories' },
  { icon: Settings, label: 'Settings', path: '/settings' },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sidebarProfile, setSidebarProfile] = useState<SidebarProfileSummary | null>(null);
  const [activeGraphName, setActiveGraphName] = useState<string | null>(null);
  const [sessionIssue, setSessionIssue] = useState<string | null>(null);
  const pathname = usePathname();
  const routeStartRef = useRef<number | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';
  const isGraphRoute = /^[0-9a-f-]{36}$/i.test(firstSegment);
  const graphId = isGraphRoute ? firstSegment : null;
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isPulseRoute = pathname === '/pulse' || pathname.startsWith('/pulse/');
  const isProfileRoute = pathname === '/profile' || pathname.startsWith('/profile/');
  const isTreeCanvasRoute = Boolean(graphId) && pathname === `/${graphId}`;
  const isChatThreadRoute = Boolean(graphId) && pathname.startsWith(`/${graphId}/chat/`);
  const isImmersiveRoute = isTreeCanvasRoute || isChatThreadRoute;
  const showHeader = !isImmersiveRoute;
  const myProfileHref = currentUserId ? `/profile/${currentUserId}` : '/profile';
  const profileName = sidebarProfile?.name || 'My Profile';

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    const now = performance.now();

    if (routeStartRef.current !== null) {
      trackRouteTransitionMetric(pathname, now - routeStartRef.current);
    }

    routeStartRef.current = now;
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (error) {
          setCurrentUserId(null);
          setSidebarProfile(null);
          setSessionIssue('Your session could not be refreshed. Please sign in again.');
          return;
        }

        setCurrentUserId(user?.id || null);
        if (!user) {
          setSidebarProfile(null);
          setSessionIssue('Your session expired. Please sign in again.');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'first_name,last_name,display_name,email,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y'
          )
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        const typedProfile = (profile as SidebarProfileRow | null) ?? null;
        const fullName = [typedProfile?.first_name?.trim(), typedProfile?.last_name?.trim()]
          .filter(Boolean)
          .join(' ')
          .trim();
        const name =
          fullName ||
          typedProfile?.display_name?.trim() ||
          typedProfile?.email?.trim() ||
          user.email?.trim() ||
          'My Profile';
        const words = name.split(/\s+/).filter(Boolean);
        const initials =
          (words.length > 0
            ? `${words[0]?.[0] || ''}${words[1]?.[0] || ''}`
            : 'ME')?.toUpperCase() || 'ME';

        setSidebarProfile({
          name,
          initials,
          avatarUrl: typedProfile?.avatar_url || null,
          avatarZoom: typedProfile?.avatar_zoom ?? null,
          avatarFocusX: typedProfile?.avatar_focus_x ?? null,
          avatarFocusY: typedProfile?.avatar_focus_y ?? null,
        });
        setSessionIssue(null);
      } catch {
        if (!active) return;
        setCurrentUserId(null);
        setSidebarProfile(null);
        setSessionIssue('Unable to verify your session. Please sign in again.');
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function loadActiveGraphName() {
      if (!graphId) {
        setActiveGraphName(null);
        return;
      }

      const { data } = await supabase
        .from('graphs')
        .select('name')
        .eq('id', graphId)
        .maybeSingle();

      if (!active) return;
      setActiveGraphName(data?.name?.trim() || 'Current Tree');
    }

    void loadActiveGraphName();

    return () => {
      active = false;
    };
  }, [graphId, supabase]);

  function isGraphPathActive(path: string) {
    if (!graphId) return false;

    const fullPath = `/${graphId}${path}`;

    if (path === '') {
      return pathname === `/${graphId}`;
    }

    if (path === '/settings') {
      return (
        pathname.startsWith(`/${graphId}/settings`) ||
        pathname.startsWith(`/${graphId}/invites`)
      );
    }

    return pathname.startsWith(fullPath);
  }

  return (
    <div
      className="ios-gradient-fix flex h-[var(--app-vh)] overflow-hidden safe-bottom [--mobile-tab-bar-offset:4.75rem] md:[--mobile-tab-bar-offset:0px] bg-gradient-to-br from-stone/20 via-[#F5F1E8] to-leaf/5"
    >
      {sessionIssue ? (
        <div className="fixed left-2 right-2 top-2 z-[90] safe-top">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-error/35 bg-white/95 px-3 py-2 shadow-lg">
            <p className="text-xs text-error">{sessionIssue}</p>
            <button
              type="button"
              onClick={() =>
                router.push(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`)
              }
              className="text-xs font-medium text-moss hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      ) : null}

      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-stone/35 md:bg-white/72 md:backdrop-blur-sm">
        <div className="px-4 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-moss to-leaf">
              <TreePine className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold leading-tight text-earth">Branches</span>
              <span className="mt-0.5 block text-xs leading-tight text-bark/55">Family Workspace</span>
            </div>
          </div>
        </div>

        {graphId ? (
          <div className="mx-3 mb-2 rounded-xl border border-stone/35 bg-white/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-bark/45">Current Tree</p>
            <p className="truncate text-sm font-medium text-earth">
              {activeGraphName || 'Current Tree'}
            </p>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 px-3 py-2">
          {GLOBAL_NAV.map((item) => {
            const active = item.href === '/dashboard' ? isDashboard : isPulseRoute;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  void triggerSelectionHaptic();
                }}
                className={`tap-target flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-moss/15 text-moss'
                    : 'text-bark/60 hover:bg-stone/35 hover:text-earth'
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {graphId
            ? GRAPH_NAV.map((item) => {
                const active = isGraphPathActive(item.path);

                return (
                  <Link
                    key={item.path}
                    href={`/${graphId}${item.path}`}
                    onClick={() => {
                      void triggerSelectionHaptic();
                    }}
                    className={`tap-target flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-moss/15 text-moss'
                        : 'text-bark/60 hover:bg-stone/35 hover:text-earth'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            : null}
        </nav>

        <div className="border-t border-stone/35 p-3">
          <Link
            href={myProfileHref}
            onClick={() => {
              void triggerSelectionHaptic();
            }}
            className={`tap-target flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
              isProfileRoute
                ? 'bg-moss/15 text-moss'
                : 'text-bark/60 hover:bg-stone/35 hover:text-earth'
            }`}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-stone/45 bg-gradient-to-br from-moss to-leaf">
              {sidebarProfile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sidebarProfile.avatarUrl}
                  alt={profileName}
                  className="h-full w-full object-cover"
                  style={buildImageCropStyle(
                    {
                      zoom: sidebarProfile.avatarZoom,
                      focusX: sidebarProfile.avatarFocusX,
                      focusY: sidebarProfile.avatarFocusY,
                    },
                    { minZoom: 1, maxZoom: 3 }
                  )}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                  {sidebarProfile?.initials || 'ME'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{profileName}</p>
              <p className="mt-0.5 truncate text-xs leading-tight text-bark/50">Profile</p>
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {showHeader ? (
          <div className="ios-gradient-fix flex items-center gap-3 border-b border-stone/30 bg-white/60 px-4 pb-3 pt-[calc(var(--safe-area-top)+0.4rem)] backdrop-blur-sm md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-moss to-leaf">
              <TreePine className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold leading-tight text-earth">Branches</span>
              {!isDashboard && graphId ? (
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-bark/55">
                  {activeGraphName || 'Current Tree'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={
            isImmersiveRoute
              ? 'h-full min-h-0 overflow-hidden'
              : 'h-full min-h-0 overflow-y-auto overscroll-y-contain pb-[var(--mobile-tab-bar-offset)] md:pb-0'
          }
        >
          {children}
        </motion.div>

        <nav className="ios-gradient-fix fixed inset-x-0 bottom-0 z-[65] border-t border-stone/35 bg-white/90 backdrop-blur-xl md:hidden">
          <div
            className={`grid gap-1 px-2 pb-[calc(var(--safe-area-bottom)+0.35rem)] pt-2 ${
              graphId ? 'grid-cols-5' : 'grid-cols-3'
            }`}
          >
            <Link
              href="/dashboard"
              onClick={() => {
                void triggerSelectionHaptic();
              }}
              className={`tap-target flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
                isDashboard
                  ? 'bg-moss/15 text-moss'
                  : 'text-bark/55 hover:bg-stone/35 hover:text-earth'
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
              <span className="leading-none">Home</span>
            </Link>

            {graphId
              ? GRAPH_NAV.map((item) => {
                  const active = isGraphPathActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      href={`/${graphId}${item.path}`}
                      onClick={() => {
                        void triggerSelectionHaptic();
                      }}
                      className={`tap-target flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-moss/15 text-moss'
                          : 'text-bark/55 hover:bg-stone/35 hover:text-earth'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="leading-none">{item.label}</span>
                    </Link>
                  );
                })
              : [
                  <Link
                    key="pulse"
                    href="/pulse"
                    onClick={() => {
                      void triggerSelectionHaptic();
                    }}
                    className={`tap-target flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
                      isPulseRoute
                        ? 'bg-moss/15 text-moss'
                        : 'text-bark/55 hover:bg-stone/35 hover:text-earth'
                    }`}
                  >
                    <Activity className="h-5 w-5" />
                    <span className="leading-none">Pulse</span>
                  </Link>,
                  <Link
                    key="profile"
                    href={myProfileHref}
                    onClick={() => {
                      void triggerSelectionHaptic();
                    }}
                    className={`tap-target flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
                      isProfileRoute
                        ? 'bg-moss/15 text-moss'
                        : 'text-bark/55 hover:bg-stone/35 hover:text-earth'
                    }`}
                  >
                    <div className="h-5 w-5 overflow-hidden rounded-full border border-stone/45 bg-gradient-to-br from-moss to-leaf">
                      {sidebarProfile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sidebarProfile.avatarUrl}
                          alt={profileName}
                          className="h-full w-full object-cover"
                          style={buildImageCropStyle(
                            {
                              zoom: sidebarProfile.avatarZoom,
                              focusX: sidebarProfile.avatarFocusX,
                              focusY: sidebarProfile.avatarFocusY,
                            },
                            { minZoom: 1, maxZoom: 3 }
                          )}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-white">
                          {sidebarProfile?.initials || 'ME'}
                        </div>
                      )}
                    </div>
                    <span className="leading-none">Profile</span>
                  </Link>,
                ]}
          </div>
        </nav>
      </main>
    </div>
  );
}
