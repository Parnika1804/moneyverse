import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Crown,
  Loader2,
  Medal,
  RefreshCw,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { fetchLeaderboard } from '../../lib/api';

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300">
        <Crown className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300/35 bg-slate-300/15 text-slate-200">
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-400/15 text-orange-300">
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-mono text-xs font-semibold text-slate-300">
      #{rank}
    </span>
  );
}

export default function LeaderboardCard({ refreshKey = 0, title = 'Top 10 Leaderboard', subtitle }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await fetchLeaderboard();
      setEntries(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Unable to load the MoneyVerse leaderboard.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(false);
  }, [loadLeaderboard, refreshKey]);

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400">
              {subtitle || 'Top 10 learners ranked by server-verified XP.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadLeaderboard(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-10 text-sm text-slate-400">
          <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-emerald-400" />
          Loading leaderboard rankings...
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
          <Users className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-200">No leaderboard rankings yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Complete a Learning Hub quiz to earn XP and appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-3">Rank</th>
                <th className="pb-3 pr-3">Learner</th>
                <th className="pb-3 pr-3 text-right">Level</th>
                <th className="pb-3 pr-3 text-right">Badges</th>
                <th className="pb-3 text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {entries.map((entry) => (
                <tr
                  key={`${entry.rank}-${entry.displayName}-${entry.xp}`}
                  className={
                    entry.isCurrentUser
                      ? 'bg-emerald-400/[0.09] text-white'
                      : 'text-slate-200 transition hover:bg-white/[0.02]'
                  }
                >
                  <td className="py-3 pr-3">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{entry.displayName}</span>
                      {entry.isCurrentUser && (
                        <span className="rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-emerald-200">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-xs text-indigo-300">
                    Lv {entry.level}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-300">
                      <Award className="h-3.5 w-3.5" />
                      {entry.badgesCount}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-emerald-300">
                      <Zap className="h-3.5 w-3.5" />
                      {entry.xp.toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
