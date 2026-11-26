import { AlertTriangle, ArrowRight, Sparkles, X } from 'lucide-react';
import { formatINR } from '../personal/formatters';
import { getBusinessEventMeta } from './businessMeta';

export default function BusinessEventModal({ stepResponse, onClose }) {
  if (!stepResponse || !stepResponse.event) return null;

  const { event, breakdown, state, score, grade, weeksCompleted, completed } = stepResponse;
  const meta = getBusinessEventMeta(event.type);
  const Icon = meta.icon;
  const isProfit = (breakdown?.profit ?? 0) >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-event-modal-title"
    >
      <div className="glass-panel relative w-full max-w-lg rounded-3xl p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close weekly summary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Event Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.iconWrapClass}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Week {weeksCompleted} Result
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
            </div>
            <h2
              id="business-event-modal-title"
              className="mt-1 font-display text-xl font-extrabold text-white"
            >
              {event.title}
            </h2>
          </div>
        </div>

        {/* Event Description */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#070c18]/90 p-4">
          <p className="text-sm leading-relaxed text-slate-200">{event.description}</p>

          {breakdown && (
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
              <span className="text-xs font-medium text-slate-400">Weekly Profit / Loss</span>
              <span
                className={`font-mono text-lg font-bold ${
                  isProfit ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {isProfit ? '+' : ''}
                {formatINR(breakdown.profit)}
              </span>
            </div>
          )}
        </div>

        {/* Cash Shortfall Warning if returned by backend */}
        {breakdown?.unpaidShortfall > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>
              Operating shortfall of{' '}
              <span className="font-mono font-semibold">{formatINR(breakdown.unpaidShortfall)}</span>{' '}
              carried forward so remaining cash never goes negative.
            </p>
          </div>
        )}

        {/* Server-Returned Weekly Metrics */}
        {breakdown && state && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Units Sold</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">
                {breakdown.unitsSold}
                <span className="ml-1 text-[10px] text-slate-400">/ {breakdown.customerDemand}</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Revenue</p>
              <p className="mt-1 font-mono text-sm font-semibold text-emerald-300">
                {formatINR(breakdown.revenue)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Expenses</p>
              <p className="mt-1 font-mono text-sm font-semibold text-rose-300">
                {formatINR(breakdown.expenses)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Score</p>
              <p className="mt-1 font-mono text-sm font-semibold text-sky-300">
                {score} ({grade})
              </p>
            </div>
          </div>
        )}

        {breakdown && state && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-400">
            <span>
              Remaining Cash:{' '}
              <strong className="font-mono text-white">{formatINR(state.remainingCash)}</strong>
            </span>
            <span>
              Ending Inventory:{' '}
              <strong className="font-mono text-slate-200">{state.inventory} units</strong>
            </span>
            {breakdown.unmetDemand > 0 && (
              <span>
                Missed Sales:{' '}
                <strong className="font-mono text-amber-300">{breakdown.unmetDemand} units</strong>
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
        >
          {completed ? (
            <>
              <Sparkles className="h-4 w-4" />
              View Final 12-Week Business Report
            </>
          ) : (
            <>
              Continue to Week {state?.week}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
