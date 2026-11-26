import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Award,
  BookOpen,
  Bot,
  Briefcase,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, initProfile } from '../lib/api';
import LeaderboardCard from '../components/learning/LeaderboardCard';

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const XP_PER_LEVEL = 500;

const QUICK_MODULES = [
  {
    to: '/dashboard/personal-finance',
    title: 'Personal Finance',
    description: 'Budgeting, savings buffers, credit health, and compounding investments.',
    icon: Wallet,
    accent: 'text-sky-300 bg-sky-400/12 border-sky-400/20',
  },
  {
    to: '/dashboard/business-simulation',
    title: 'Business Simulation',
    description: 'Unit economics, pricing, P&L statements, and managing startup runway.',
    icon: Briefcase,
    accent: 'text-indigo-300 bg-indigo-400/12 border-indigo-400/20',
  },
  {
    to: '/dashboard/learning-hub',
    title: 'Learning Hub',
    description: 'Interactive micro-lessons and financial literacy challenges.',
    icon: BookOpen,
    accent: 'text-emerald-300 bg-emerald-400/12 border-emerald-400/20',
  },
  {
    to: '/dashboard/ai-mentor',
    title: 'AI Mentor',
    description: 'Personalized financial coaching powered by Gemini AI (coming soon).',
    icon: Bot,
    accent: 'text-amber-300 bg-amber-400/12 border-amber-400/20',
  },
];

function formatActivityTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);
  const [error, setError] = useState('');

  const loadProfile = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const data = await fetchProfile();
        setProfile(data.profile);
      } catch (err) {
        if (err?.response?.status === 404) {
          try {
            const initialized = await initProfile({
              displayName: user?.displayName || '',
            });
            setProfile(initialized.profile);
          } catch (initErr) {
            setError(
              initErr?.response?.data?.error ||
                initErr?.message ||
                'Unable to initialize your Firestore profile.',
            );
          }
        } else {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              'Unable to load your profile from the backend.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.displayName],
  );

  useEffect(() => {
    loadProfile(false);
  }, [loadProfile]);

  const wallet = profile?.wallet ?? 30000;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const badges = Array.isArray(profile?.badges) ? profile.badges : [];
  const recentActivities = Array.isArray(profile?.recentActivities)
    ? profile.recentActivities
    : [];

  const levelProgressXp = xp % XP_PER_LEVEL;
  const levelProgressPct = Math.min(100, Math.round((levelProgressXp / XP_PER_LEVEL) * 100));
  const studentName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Student';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
          <p className="text-sm text-slate-400">Loading your Firestore profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Firestore Profile Synced
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Welcome, {studentName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track your virtual wallet, XP milestones, badges, and activity across MoneyVerse.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadProfile(true);
            setLeaderboardRefreshKey((prev) => prev + 1);
          }}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-50 sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold text-rose-100">Could not fetch live profile</p>
            <p className="mt-1 text-xs text-rose-200/90">{error}</p>
          </div>
        </div>
      )}

      {/* Primary KPI Cards: Virtual Wallet, XP Points, Level, Badges Count */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Virtual Wallet */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Virtual Wallet</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-300">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">
            {INR_FORMATTER.format(wallet)}
          </p>
          <p className="mt-2 text-xs text-emerald-300">Available virtual balance (INR)</p>
        </div>

        {/* XP Points */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">XP Points</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/12 text-amber-300">
              <Zap className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">
            {xp.toLocaleString('en-IN')} <span className="text-base font-medium text-slate-400">XP</span>
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
                style={{ width: `${Math.max(4, levelProgressPct)}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">
              {levelProgressXp} / {XP_PER_LEVEL} XP to Level {level + 1}
            </p>
          </div>
        </div>

        {/* Level */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Current Level</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/12 text-indigo-300">
              <Trophy className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">
            Level {level}
          </p>
          <p className="mt-2 text-xs text-indigo-300">
            {level === 1 ? 'Financial Explorer' : `Tier ${level} Strategist`}
          </p>
        </div>

        {/* Badges Earned */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Badges Earned</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/12 text-sky-300">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">
            {badges.length}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {badges.length === 0 ? 'Complete challenges to unlock' : 'Achievements unlocked'}
          </p>
        </div>
      </div>

      {/* Badges & Recent Activities */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Badges Panel */}
        <section className="glass-panel rounded-3xl p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="h-5 w-5 text-amber-300" />
              <h2 className="font-display text-lg font-bold text-white">Badges</h2>
            </div>
            <span className="font-mono text-xs text-slate-400">{badges.length} unlocked</span>
          </div>

          {badges.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-200">No badges earned yet</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Your earned financial literacy and entrepreneurship badges will appear here as you
                complete upcoming simulations and learning modules.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {badges.map((badge, index) => {
                const label = typeof badge === 'string' ? badge : badge?.name || `Badge ${index + 1}`;
                const desc = typeof badge === 'object' ? badge?.description : '';
                return (
                  <div
                    key={`${label}-${index}`}
                    className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5"
                  >
                    <p className="text-xs font-semibold text-amber-200">{label}</p>
                    {desc && <p className="mt-1 text-[11px] text-slate-400">{desc}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activities Panel */}
        <section className="glass-panel rounded-3xl p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-emerald-300" />
              <h2 className="font-display text-lg font-bold text-white">Recent Activities</h2>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {recentActivities.length} {recentActivities.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
              <Clock className="mx-auto h-7 w-7 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-200">No recent activities yet</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Your profile is initialized with ₹30,000 and Level 1. Every transaction, lesson, and
                business decision you make will be logged here.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {recentActivities.map((item, index) => {
                const title =
                  typeof item === 'string' ? item : item?.title || item?.description || 'Activity';
                const timestamp = typeof item === 'object' ? item?.timestamp || item?.createdAt : null;
                const amount = typeof item === 'object' && typeof item?.amount === 'number' ? item.amount : null;

                return (
                  <li
                    key={item?.id || `${title}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {formatActivityTime(timestamp)}
                      </p>
                    </div>
                    {amount !== null && (
                      <span
                        className={`shrink-0 font-mono text-xs font-semibold ${
                          amount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {amount >= 0 ? '+' : ''}
                        {INR_FORMATTER.format(amount)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Live Top-10 Leaderboard */}
      <LeaderboardCard
        refreshKey={leaderboardRefreshKey}
        title="Top 10 Leaderboard"
        subtitle="See how your XP and level rank across MoneyVerse learners."
      />

      {/* Workspace Navigation Shortcuts */}
      <section>
        <h2 className="font-display text-lg font-bold text-white">Explore MoneyVerse Modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.to}
                to={mod.to}
                className="glass-panel group flex flex-col justify-between rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-white/25"
              >
                <div>
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${mod.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-white">{mod.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{mod.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">
                  Open section
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
