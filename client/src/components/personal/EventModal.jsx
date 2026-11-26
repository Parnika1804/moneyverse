import { ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { formatINR, getEventMeta } from './formatters';

export default function EventModal({ stepResponse, onClose }) {
  if (!stepResponse || !stepResponse.event) return null;

  const { event, breakdown, state, score, grade, monthsCompleted, completed } = stepResponse;
  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const isIncome = event.impactType === 'income';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div className="glass-panel relative w-full max-w-lg rounded-3xl p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close event summary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Event Category Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.iconWrapClass}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Month {monthsCompleted} Event
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
            </div>
            <h2 id="event-modal-title" className="mt-1 font-display text-xl font-extrabold text-white">
              {event.title}
            </h2>
          </div>
        </div>

        {/* Event Description & Financial Impact */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#070c18]/90 p-4">
          <p className="text-sm leading-relaxed text-slate-200">{event.description}</p>

          <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
            <span className="text-xs font-medium text-slate-400">Financial Impact</span>
            <span
              className={`font-mono text-lg font-bold ${
                isIncome ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatINR(event.amount)}
            </span>
          </div>
        </div>

        {/* Emergency Buffer / Debt Alerts from Backend Breakdown */}
        {breakdown &&
          (breakdown.savingsUsedForEmergency > 0 || breakdown.emergencyDebtAdded > 0) && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-100">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="space-y-1">
                {breakdown.savingsUsedForEmergency > 0 && (
                  <p>
                    Emergency fund covered{' '}
                    <span className="font-mono font-semibold">
                      {formatINR(breakdown.savingsUsedForEmergency)}
                    </span>{' '}
                    from your savings to prevent a negative wallet balance.
                  </p>
                )}
                {breakdown.emergencyDebtAdded > 0 && (
                  <p>
                    Remaining shortfall of{' '}
                    <span className="font-mono font-semibold">
                      {formatINR(breakdown.emergencyDebtAdded)}
                    </span>{' '}
                    was added to emergency debt.
                  </p>
                )}
              </div>
            </div>
          )}

        {/* Backend Month-End Snapshot */}
        {breakdown && state && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Wallet</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">
                {formatINR(state.wallet)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Savings</p>
              <p className="mt-1 font-mono text-sm font-semibold text-emerald-300">
                {formatINR(state.savings)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Debt</p>
              <p className="mt-1 font-mono text-sm font-semibold text-rose-300">
                {formatINR(state.debt)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-400">Health Score</p>
              <p className="mt-1 font-mono text-sm font-semibold text-sky-300">
                {score} ({grade})
              </p>
            </div>
          </div>
        )}

        {/* Additional Backend Line Items */}
        {breakdown && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-400">
            <span>
              Saved: <strong className="font-mono text-slate-200">{formatINR(breakdown.savingsDeposit)}</strong>
            </span>
            <span>
              Spent: <strong className="font-mono text-slate-200">{formatINR(breakdown.spendingBudget)}</strong>
            </span>
            {breakdown.interestAccrued > 0 && (
              <span>
                2% Loan Interest:{' '}
                <strong className="font-mono text-amber-300">{formatINR(breakdown.interestAccrued)}</strong>
              </span>
            )}
            {breakdown.priorRentAdjustmentPaid > 0 && (
              <span>
                Prior Rent Increase:{' '}
                <strong className="font-mono text-orange-300">
                  {formatINR(breakdown.priorRentAdjustmentPaid)}
                </strong>
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
              View Final 12-Month Results
            </>
          ) : (
            <>
              Continue to Month {state?.month}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
