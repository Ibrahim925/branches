'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TreePine,
  LayoutGrid,
  MessageCircle,
  Image as ImageIcon,
  Users,
  Settings,
  User,
  ChevronLeft,
  LogOut,
  Menu,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const navItems = [
  { icon: TreePine, label: 'Tree View', path: '' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: ImageIcon, label: 'Memories', path: '/memories' },
  { icon: Users, label: 'Invites', path: '/invites' },
];

const bottomNavItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeGraphName, setActiveGraphName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';
  const isGraphRoute = /^[0-9a-f-]{36}$/i.test(firstSegment);
  const graphId = isGraphRoute ? firstSegment : null;
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isProfileRoute = pathname === '/profile' || pathname.startsWith('/profile/');
  const myProfileHref = currentUserId ? `/profile/${currentUserId}` : '/profile';

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setCurrentUserId(user?.id || null);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function isActive(itemPath: string) {
    if (isDashboard || !graphId) return false;
    const fullPath = `/${graphId}${itemPath}`;
    if (itemPath === '') {
      return pathname === `/${graphId}`;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-stone/20 via-white to-leaf/5">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed md:relative z-50 h-full
          bg-white/80 backdrop-blur-xl border-r border-stone/40
          flex flex-col
          transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-stone/30">
          <div className="w-9 h-9 bg-gradient-to-br from-moss to-leaf rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-semibold text-earth tracking-tight"
            >
              Branches
            </motion.span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden md:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-stone/50 transition-colors text-bark/40"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {!isDashboard && graphId ? (
            <div
              className={`mb-3 rounded-xl border border-stone/40 bg-white/70 ${
                collapsed ? 'p-2' : 'p-3'
              }`}
              title={activeGraphName || 'Current Tree'}
            >
              {collapsed ? (
                <div className="w-9 h-9 rounded-lg bg-moss/12 text-moss text-sm font-semibold flex items-center justify-center mx-auto">
                  {(activeGraphName || 'T').charAt(0).toUpperCase()}
                </div>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-bark/45">
                    Current Tree
                  </p>
                  <p className="text-sm font-semibold text-earth truncate mt-1">
                    {activeGraphName || 'Current Tree'}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {/* Dashboard link */}
          <Link href="/dashboard">
            <div
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${isDashboard
                  ? 'bg-moss/10 text-moss font-medium'
                  : 'text-bark/60 hover:bg-stone/40 hover:text-earth'
                }
              `}
            >
              <LayoutGrid className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">My Trees</span>}
            </div>
          </Link>

          {/* Divider */}
          {!isDashboard && graphId && (
            <>
              <div className="h-px bg-stone/30 my-2" />

              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link key={item.path} href={`/${graphId}${item.path}`}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                        ${active
                          ? 'bg-moss/10 text-moss font-medium shadow-sm'
                          : 'text-bark/60 hover:bg-stone/40 hover:text-earth'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute left-0 w-1 h-6 bg-moss rounded-r-full"
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 space-y-1 border-t border-stone/30">
          {!isDashboard && graphId && bottomNavItems.map((item) => (
            <Link key={item.path} href={`/${graphId}${item.path}`}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-bark/60 hover:bg-stone/40 hover:text-earth transition-all">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </div>
            </Link>
          ))}

          <Link href={myProfileHref}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isProfileRoute
                  ? 'bg-moss/10 text-moss font-medium'
                  : 'text-bark/60 hover:bg-stone/40 hover:text-earth'
              }`}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">My Profile</span>}
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-bark/60 hover:bg-error/10 hover:text-error transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-stone/30 bg-white/60 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone/40 transition-colors"
          >
            <Menu className="w-5 h-5 text-earth" />
          </button>
          <div className="w-7 h-7 bg-gradient-to-br from-moss to-leaf rounded-lg flex items-center justify-center">
            <TreePine className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-earth block leading-tight">Branches</span>
            {!isDashboard && graphId ? (
              <span className="text-[11px] text-bark/55 block truncate leading-tight mt-0.5">
                {activeGraphName || 'Current Tree'}
              </span>
            ) : null}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
