import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Briefcase,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/personal-finance', label: 'Personal Finance', icon: Wallet },
  { to: '/dashboard/business-simulation', label: 'Business Simulation', icon: Briefcase },
  { to: '/dashboard/learning-hub', label: 'Learning Hub', icon: BookOpen },
  { to: '/dashboard/ai-mentor', label: 'AI Mentor', icon: Bot },
];

export default function DashboardLayout() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const renderNavLinks = (onNavigate) => (
    <nav className="mt-6 flex-1 space-y-1.5 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'border border-emerald-400/25 bg-emerald-400/12 text-emerald-200 shadow-sm'
                  : 'border border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/8 bg-[#080d1a]/95 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/8 px-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/20">
              <Coins className="h-4.5 w-4.5 text-slate-950" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <span className="block font-display text-base font-extrabold tracking-tight text-white">
                MoneyVerse
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Student Workspace
              </span>
            </div>
          </Link>
        </div>

        {renderNavLinks()}

        <div className="border-t border-white/8 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 font-mono text-xs font-semibold text-emerald-300">
              {initials || 'MV'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{displayName}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>

          <Link
            to="/logout"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-[#080d1a]">
            <div className="flex h-16 items-center justify-between border-b border-white/8 px-5">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600">
                  <Coins className="h-4 w-4 text-slate-950" strokeWidth={2.4} />
                </div>
                <span className="font-display text-base font-extrabold text-white">MoneyVerse</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renderNavLinks(() => setDrawerOpen(false))}

            <div className="border-t border-white/8 p-4">
              <div className="mb-3 truncate px-1 text-xs text-slate-400">{user?.email}</div>
              <Link
                to="/logout"
                onClick={() => setDrawerOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-rose-500/15 hover:text-rose-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log Out
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/8 bg-[#060913]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-400">MoneyVerse Platform</p>
              <p className="font-display text-sm font-bold text-white">
                Learn Money by Managing Life &amp; Business
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs text-emerald-300 sm:inline-flex">
              {displayName}
            </span>
            <Link
              to="/logout"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
