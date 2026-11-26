import {
  ArrowLeft,
  Award,
  Banknote,
  Package,
  Play,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import BusinessCharts from './BusinessCharts';
import BusinessTimeline from './BusinessTimeline';
import { formatINR } from '../personal/formatters';
import { getBusinessChoice } from './businessMeta';

function getBusinessGradeSummary(grade) {
  switch (grade) {
    case 'A+':
      return {
        headline: 'Exceptional Business Execution',
        summary:
          'You scaled profitability, managed inventory efficiently, and preserved strong cash reserves across all 12 weeks.',
        pillClass: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
      };
    case 'A':
      return {
        headline: 'Strong Commercial Performance',
        summary:
          'Consistent margins and responsive pricing kept your business resilient through market swings.',
        pillClass: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200',
      };
    case 'B':
      return {
        headline: 'Solid Business Operations',
        summary:
          'You maintained steady momentum over 12 weeks. Fine-tuning inventory levels and marketing ROI can elevate profitability further.',
        pillClass: 'border-sky-400/35 bg-sky-400/12 text-sky-200',
      };
    case 'C':
      return {
        headline: 'Developing Entrepreneurial Strategy',
        summary:
          'Cost spikes or stock imbalances weighed on your net profit. Try balancing restock volume with realistic pricing.',
        pillClass: 'border-amber-400/35 bg-amber-400/12 text-amber-200',
      };
    default:
      return {
        headline: 'Cash Flow & Margin Pressure',
        summary:
          'High overhead, stockouts, or unexpected repairs squeezed cash reserves. Start a new run to test leaner inventory and pricing.',
        pillClass: 'border-rose-400/35 bg-rose-400/12 text-rose-200',
      };
  }
}

export default function BusinessFinalResults({ run, onStartNew, onBackToLobby }) {
  if (!run) return null;

  const { state, score, grade, history = [], durationWeeks = 12, weeksCompleted = 12 } = run;
  const feedback = getBusinessGradeSummary(grade);
  const bizMeta = getBusinessChoice(run.businessType || state?.businessType);
  const BizIcon = bizMeta.icon;
  const totalProfitPositive = (state?.totalProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToLobby}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" />
          All Business Runs
        </button>

        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
        >
          <Play className="h-3.5 w-3.5" />
          Start Another Business
        </button>
      </div>

      {/* Hero Score & Grade */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-[95px]" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Trophy className="h-3.5 w-3.5" />
                12-Week Business Simulation Complete
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white">
                <BizIcon className="h-3.5 w-3.5 text-indigo-300" />
                {run.businessName || bizMeta.name}
              </span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {feedback.headline}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{feedback.summary}</p>

            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-400">Final Business Score</span>
                <span className="font-mono font-semibold text-white">{score} / 100</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 self-start rounded-3xl border border-white/10 bg-[#070c18]/90 px-7 py-6 lg:self-center">
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Grade</p>
              <div
                className={`mt-2 inline-flex h-18 w-18 items-center justify-center rounded-2xl border font-display text-3xl font-extrabold ${feedback.pillClass}`}
              >
                {grade}
              </div>
            </div>
            <div className="border-l border-white/10 pl-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Score</p>
              <p className="mt-1 font-mono text-4xl font-bold text-white">{score}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300">
                <Award className="h-3.5 w-3.5" />
                Server Verified
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Financial Summary Cards (Backend Values Only) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Remaining Cash</span>
            <Wallet className="h-4.5 w-4.5 text-sky-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-white">
            {formatINR(state?.remainingCash)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Started with ₹50,000 capital</p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Revenue</span>
            <Banknote className="h-4.5 w-4.5 text-emerald-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-300">
            {formatINR(state?.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{state?.totalUnitsSold ?? 0} total units sold</p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cumulative Profit / Loss</span>
            <TrendingUp
              className={`h-4.5 w-4.5 ${totalProfitPositive ? 'text-emerald-300' : 'text-rose-300'}`}
            />
          </div>
          <p
            className={`mt-3 font-mono text-2xl font-bold ${
              totalProfitPositive ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {totalProfitPositive ? '+' : ''}
            {formatINR(state?.totalProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Total expenses: {formatINR(state?.totalExpenses)}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Ending Inventory</span>
            <Package className="h-4.5 w-4.5 text-indigo-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-white">
            {state?.inventory ?? 0} <span className="text-sm font-medium text-slate-400">units</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Marketing total: {formatINR(state?.totalMarketingSpend)}
          </p>
        </div>
      </div>

      {/* Charts & Full 12-Week Timeline */}
      <BusinessCharts history={history} />

      <BusinessTimeline
        durationWeeks={durationWeeks}
        weeksCompleted={weeksCompleted}
        currentWeek={durationWeeks}
        completed={true}
        history={history}
      />
    </div>
  );
}
