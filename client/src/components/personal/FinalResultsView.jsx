import {
  ArrowLeft,
  Award,
  CreditCard,
  PiggyBank,
  Play,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import FinancialCharts from './FinancialCharts';
import MonthTimeline from './MonthTimeline';
import { formatINR } from './formatters';

function getGradeSummary(grade) {
  switch (grade) {
    case 'A+':
      return {
        headline: 'Outstanding Financial Mastery',
        summary:
          'You balanced disciplined monthly saving, smart expense control, and strong debt management across all 12 months.',
        pillClass: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
      };
    case 'A':
      return {
        headline: 'Strong Financial Resilience',
        summary:
          'You built healthy reserves and absorbed unexpected shocks effectively while steadily growing your net worth.',
        pillClass: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200',
      };
    case 'B':
      return {
        headline: 'Solid Financial Foundation',
        summary:
          'You stayed on track through the year. Increasing your emergency savings buffer or paying down debt sooner can push you into the A tier.',
        pillClass: 'border-sky-400/35 bg-sky-400/12 text-sky-200',
      };
    case 'C':
      return {
        headline: 'Developing Financial Habits',
        summary:
          'Unexpected costs or debt interest slowed down your net worth growth. Try reserving a steady savings percentage early in the year.',
        pillClass: 'border-amber-400/35 bg-amber-400/12 text-amber-200',
      };
    default:
      return {
        headline: 'Room to Strengthen Cash Flow',
        summary:
          'High expenses or compounding 2% monthly debt interest created pressure. Replay with a larger emergency fund and tighter spending cap.',
        pillClass: 'border-rose-400/35 bg-rose-400/12 text-rose-200',
      };
  }
}

export default function FinalResultsView({ run, onStartNew, onBackToLobby, starting }) {
  if (!run) return null;

  const { state, score, grade, history = [], durationMonths = 12, monthsCompleted = 12 } = run;
  const feedback = getGradeSummary(grade);

  return (
    <div className="space-y-6">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToLobby}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" />
          All Simulation Runs
        </button>

        <button
          type="button"
          onClick={onStartNew}
          disabled={starting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {starting ? 'Starting New Run...' : 'Start New Simulation'}
        </button>
      </div>

      {/* Hero Score & Grade Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-[90px]" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Trophy className="h-3.5 w-3.5" />
              12-Month Simulation Complete
            </div>

            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {feedback.headline}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{feedback.summary}</p>

            {/* Score Progress Bar */}
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-400">Financial Health Score</span>
                <span className="font-mono font-semibold text-white">{score} / 100</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Grade Badge */}
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
                Verified by Server
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Financial Snapshot Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Final Wallet</span>
            <Wallet className="h-4.5 w-4.5 text-sky-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-white">{formatINR(state?.wallet)}</p>
          <p className="mt-1 text-xs text-slate-400">Liquid cash remaining</p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Final Savings</span>
            <PiggyBank className="h-4.5 w-4.5 text-emerald-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-300">
            {formatINR(state?.savings)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Accumulated reserve</p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Final Debt</span>
            <CreditCard className="h-4.5 w-4.5 text-rose-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-rose-300">{formatINR(state?.debt)}</p>
          <p className="mt-1 text-xs text-slate-400">Outstanding loan balance</p>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Final Net Worth</span>
            <TrendingUp className="h-4.5 w-4.5 text-indigo-300" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-white">
            {formatINR(state?.netWorth)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Server-calculated net worth</p>
        </div>
      </div>

      {/* Charts & Full 12-Month Timeline */}
      <FinancialCharts history={history} />

      <MonthTimeline
        durationMonths={durationMonths}
        monthsCompleted={monthsCompleted}
        currentMonth={durationMonths}
        completed={true}
        history={history}
      />
    </div>
  );
}
