import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { formatINR, getEventMeta } from './formatters';

export default function MonthTimeline({
  durationMonths = 12,
  monthsCompleted = 0,
  currentMonth = 1,
  completed = false,
  history = [],
}) {
  const monthSlots = Array.from({ length: durationMonths }, (_, idx) => idx + 1);

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-5 w-5 text-emerald-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Month-by-Month Progress Timeline
            </h2>
            <p className="text-xs text-slate-400">
              {completed
                ? `Completed all ${durationMonths} months`
                : `${monthsCompleted} of ${durationMonths} months completed · Active: Month ${currentMonth}`}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
          {monthsCompleted}/{durationMonths} Months
        </span>
      </div>

      {/* 12-Month Stepper Bar */}
      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {monthSlots.map((slot) => {
          const isDone = slot <= monthsCompleted;
          const isCurrent = !completed && slot === currentMonth;

          return (
            <div
              key={slot}
              className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${
                isDone
                  ? 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200'
                  : isCurrent
                    ? 'border-sky-400/50 bg-sky-400/15 text-white shadow-[0_0_16px_rgba(56,189,248,0.18)]'
                    : 'border-white/8 bg-white/[0.02] text-slate-500'
              }`}
            >
              <span className="font-mono text-[11px] font-semibold">M{slot}</span>
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

      {/* Detailed Month-by-Month Ledger */}
      <div className="mt-6">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
            <Clock className="mx-auto h-6 w-6 text-slate-500" />
            <p className="mt-2.5 text-sm font-semibold text-slate-200">
              No monthly decisions submitted yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Submit your Month 1 financial plan to see your verified backend ledger and unexpected
              events appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {[...history].reverse().map((entry) => {
              const evMeta = getEventMeta(entry.event?.type);
              const EvIcon = evMeta.icon;
              const isIncome = entry.event?.impactType === 'income';
              const b = entry.breakdown || {};
              const d = entry.decision || {};

              return (
                <div
                  key={entry.month}
                  className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-4 transition hover:border-white/15"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 font-mono text-xs font-bold text-emerald-300">
                        M{entry.month}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {entry.event?.title || `Month ${entry.month}`}
                        </p>
                        <p className="text-xs text-slate-400">{entry.event?.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.event && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${evMeta.badgeClass}`}
                        >
                          <EvIcon className="h-3 w-3" />
                          {isIncome ? '+' : '-'}
                          {formatINR(entry.event.amount)}
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-sky-300">
                        Score {entry.scoreAfterMonth}
                      </span>
                    </div>
                  </div>

                  {/* Decisions & Ending Balances from Backend */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <span className="block text-slate-500">Savings ({d.savingsPercentage}%)</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {formatINR(b.savingsDeposit)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Spending</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {formatINR(b.spendingBudget)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Loan / Repay</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {b.loanAmount > 0
                          ? `+${formatINR(b.loanAmount)}`
                          : b.repayAmount > 0
                            ? `-${formatINR(b.repayAmount)}`
                            : '₹0'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">End Wallet</span>
                      <span className="font-mono font-semibold text-white">
                        {formatINR(b.endingWallet)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">End Savings</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {formatINR(b.endingSavings)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">End Debt</span>
                      <span className="font-mono font-semibold text-rose-300">
                        {formatINR(b.endingDebt)}
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
