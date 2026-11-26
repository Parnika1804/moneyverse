import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { formatINR } from '../personal/formatters';
import { getBusinessEventMeta } from './businessMeta';

export default function BusinessTimeline({
  durationWeeks = 12,
  weeksCompleted = 0,
  currentWeek = 1,
  completed = false,
  history = [],
}) {
  const weekSlots = Array.from({ length: durationWeeks }, (_, idx) => idx + 1);

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-5 w-5 text-emerald-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              12-Week Progress Timeline
            </h2>
            <p className="text-xs text-slate-400">
              {completed
                ? `Completed all ${durationWeeks} weeks`
                : `${weeksCompleted} of ${durationWeeks} weeks completed · Active: Week ${currentWeek}`}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
          {weeksCompleted}/{durationWeeks} Weeks
        </span>
      </div>

      {/* 12-Week Stepper */}
      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {weekSlots.map((slot) => {
          const isDone = slot <= weeksCompleted;
          const isCurrent = !completed && slot === currentWeek;

          return (
            <div
              key={slot}
              className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${
                isDone
                  ? 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200'
                  : isCurrent
                    ? 'border-indigo-400/50 bg-indigo-400/15 text-white shadow-[0_0_16px_rgba(129,140,248,0.2)]'
                    : 'border-white/8 bg-white/[0.02] text-slate-500'
              }`}
            >
              <span className="font-mono text-[11px] font-semibold">W{slot}</span>
              <span className="mt-0.5 text-[10px]">
                {isDone ? (
                  <CheckCircle2 className="mx-auto h-3 w-3 text-emerald-400" />
                ) : isCurrent ? (
                  'Now'
                ) : (
                  '—'
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly Ledger */}
      <div className="mt-6">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
            <Clock className="mx-auto h-6 w-6 text-slate-500" />
            <p className="mt-2.5 text-sm font-semibold text-slate-200">
              No weekly decisions submitted yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Submit your Week 1 restock, pricing, and marketing plan to see backend-calculated
              sales, profit/loss, and market events here.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {[...history].reverse().map((entry) => {
              const evMeta = getBusinessEventMeta(entry.event?.type);
              const EvIcon = evMeta.icon;
              const b = entry.breakdown || {};
              const d = entry.decision || {};
              const isProfit = (b.profit ?? 0) >= 0;

              return (
                <div
                  key={entry.week}
                  className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-4 transition hover:border-white/15"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/15 font-mono text-xs font-bold text-indigo-200">
                        W{entry.week}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {entry.event?.title || `Week ${entry.week}`}
                        </p>
                        <p className="text-xs text-slate-400">{entry.event?.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {entry.event && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${evMeta.badgeClass}`}
                        >
                          <EvIcon className="h-3 w-3" />
                          {evMeta.label}
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-sky-300">
                        Score {entry.scoreAfterWeek}
                      </span>
                    </div>
                  </div>

                  {/* Backend Weekly Results */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <span className="block text-slate-500">Sold / Price</span>
                      <span className="font-mono font-semibold text-white">
                        {b.unitsSold} @ {formatINR(d.sellingPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Revenue</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {formatINR(b.revenue)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Expenses</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {formatINR(b.expenses)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Profit / Loss</span>
                      <span
                        className={`font-mono font-semibold ${
                          isProfit ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatINR(b.profit)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">End Inventory</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {b.endingInventory} units
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">End Cash</span>
                      <span className="font-mono font-semibold text-sky-300">
                        {formatINR(b.remainingCash)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
