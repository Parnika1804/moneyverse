import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Loader2,
  PiggyBank,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  fetchPersonalHistory,
  startPersonalSimulation,
  stepPersonalSimulation,
} from '../lib/api';
import EventModal from '../components/personal/EventModal';
import FinancialCharts from '../components/personal/FinancialCharts';
import FinalResultsView from '../components/personal/FinalResultsView';
import MonthTimeline from '../components/personal/MonthTimeline';
import { formatDateTime, formatINR } from '../components/personal/formatters';

function extractApiError(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

function parseNonNegativeInput(rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    return 0;
  }
  const num = Number(rawValue);
  return Number.isFinite(num) ? num : NaN;
}

export default function PersonalFinancePage() {
  const [runs, setRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [activeRun, setActiveRun] = useState(null);
  const [viewMode, setViewMode] = useState('intro'); // 'intro' | 'play' | 'results'

  const [starting, setStarting] = useState(false);
  const [resumingRunId, setResumingRunId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Monthly decision inputs (sent directly to POST /api/personal/step; zero client calculation)
  const [savingsPercentage, setSavingsPercentage] = useState(20);
  const [spendingBudget, setSpendingBudget] = useState('15000');
  const [loanAmount, setLoanAmount] = useState('0');
  const [repayAmount, setRepayAmount] = useState('0');

  // Unexpected event popup state populated from actual POST /api/personal/step response
  const [latestStepModal, setLatestStepModal] = useState(null);

  const submitLockRef = useRef(false);
  const startLockRef = useRef(false);

  const loadRuns = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await fetchPersonalHistory();
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
    } catch (err) {
      setHistoryError(extractApiError(err, 'Unable to load your simulation history.'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  function resetDecisionInputs() {
    setSavingsPercentage(20);
    setSpendingBudget('15000');
    setLoanAmount('0');
    setRepayAmount('0');
    setActionError('');
  }

  async function handleStartSimulation() {
    if (startLockRef.current || starting) return;
    startLockRef.current = true;
    setStarting(true);
    setActionError('');

    try {
      const started = await startPersonalSimulation();
      const freshRun = {
        runId: started.runId,
        type: 'personal_finance',
        status: started.completed ? 'completed' : 'active',
        completed: Boolean(started.completed),
        durationMonths: started.state?.durationMonths || 12,
        monthsCompleted: started.monthsCompleted ?? 0,
        state: started.state,
        score: started.score,
        grade: started.grade,
        history: [],
        createdAt: started.createdAt,
      };

      setActiveRun(freshRun);
      setLatestStepModal(null);
      resetDecisionInputs();
      setViewMode('play');
      setRuns((prev) => [freshRun, ...prev.filter((r) => r.runId !== freshRun.runId)]);
    } catch (err) {
      setActionError(extractApiError(err, 'Unable to start a new simulation.'));
    } finally {
      setStarting(false);
      startLockRef.current = false;
    }
  }

  async function handleOpenRun(runId) {
    if (resumingRunId) return;
    setResumingRunId(runId);
    setActionError('');

    try {
      const data = await fetchPersonalHistory(runId);
      const loadedRun = data?.run;
      if (!loadedRun) {
        throw new Error('Simulation run data was not returned by the server.');
      }
      setActiveRun(loadedRun);
      setLatestStepModal(null);
      resetDecisionInputs();
      setViewMode(loadedRun.completed ? 'results' : 'play');
    } catch (err) {
      setActionError(extractApiError(err, 'Unable to load the selected simulation run.'));
    } finally {
      setResumingRunId('');
    }
  }

  async function handleSubmitMonthlyDecisions(event) {
    event.preventDefault();
    if (!activeRun || submitLockRef.current || submitting) return;

    const parsedSpending = parseNonNegativeInput(spendingBudget);
    const parsedLoan = parseNonNegativeInput(loanAmount);
    const parsedRepay = parseNonNegativeInput(repayAmount);

    if (
      !Number.isFinite(savingsPercentage) ||
      !Number.isFinite(parsedSpending) ||
      !Number.isFinite(parsedLoan) ||
      !Number.isFinite(parsedRepay)
    ) {
      setActionError('Please enter valid numbers for all monthly decision fields.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setActionError('');

    try {
      const response = await stepPersonalSimulation({
        runId: activeRun.runId,
        savingsPercentage: Number(savingsPercentage),
        spendingBudget: parsedSpending,
        loanAmount: parsedLoan,
        repayAmount: parsedRepay,
      });

      // Build the new timeline entry strictly from the backend response fields
      const serverEntry = {
        month: response.monthsCompleted,
        decision: response.decision,
        breakdown: response.breakdown,
        event: response.event,
        scoreAfterMonth: response.score,
      };

      const updatedRun = {
        ...activeRun,
        state: response.state,
        score: response.score,
        grade: response.grade,
        monthsCompleted: response.monthsCompleted,
        completed: Boolean(response.completed),
        status: response.completed ? 'completed' : 'active',
        history: [...(activeRun.history || []), serverEntry],
      };

      setActiveRun(updatedRun);
      setRuns((prev) => [
        updatedRun,
        ...prev.filter((item) => item.runId !== updatedRun.runId),
      ]);
      setLoanAmount('0');
      setRepayAmount('0');
      setLatestStepModal(response);
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to submit monthly decisions.'));
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  function handleCloseEventModal() {
    const wasCompleted = Boolean(latestStepModal?.completed || activeRun?.completed);
    setLatestStepModal(null);
    if (wasCompleted) {
      setViewMode('results');
    }
  }

  function handleBackToLobby() {
    setLatestStepModal(null);
    setActionError('');
    setViewMode('intro');
    loadRuns();
  }

  const activeRuns = runs.filter((r) => !r.completed);
  const completedRuns = runs.filter((r) => r.completed);

  // ==========================================
  // VIEW 3: FINAL RESULTS SCREEN
  // ==========================================
  if (viewMode === 'results' && activeRun) {
    return (
      <div className="mx-auto max-w-6xl">
        {actionError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}
        <FinalResultsView
          run={activeRun}
          onStartNew={handleStartSimulation}
          onBackToLobby={handleBackToLobby}
          starting={starting}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE MONTHLY DECISION SIMULATION
  // ==========================================
  if (viewMode === 'play' && activeRun) {
    const state = activeRun.state || {};
    const durationMonths = activeRun.durationMonths || state.durationMonths || 12;
    const monthsCompleted = activeRun.monthsCompleted ?? activeRun.history?.length ?? 0;

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Simulation Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToLobby}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Runs
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sky-200">
                  <Calendar className="h-3 w-3" />
                  Month {state.month} of {durationMonths}
                </span>
                {state.rentAdjustment > 0 && (
                  <span className="rounded-full border border-orange-400/25 bg-orange-400/12 px-2.5 py-0.5 font-mono text-[11px] text-orange-200">
                    Rent Increase: +{formatINR(state.rentAdjustment)}/mo
                  </span>
                )}
              </div>
              <h1 className="mt-1 font-display text-xl font-extrabold text-white sm:text-2xl">
                Personal Finance Simulation
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Health Score
              </p>
              <p className="font-mono text-sm font-bold text-emerald-300">
                {activeRun.score} / 100{' '}
                <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">
                  {activeRun.grade}
                </span>
              </p>
            </div>
            {activeRun.completed && (
              <button
                type="button"
                onClick={() => setViewMode('results')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                <Trophy className="h-4 w-4" />
                View Results
              </button>
            )}
          </div>
        </div>

        {/* 4 Core Financial State Cards (Directly from Backend State) */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Monthly Income</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/12 text-indigo-300">
                <Banknote className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-white sm:text-3xl">
              {formatINR(state.monthlyIncome)}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">Credited each simulation month</p>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Available Wallet</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/12 text-sky-300">
                <Wallet className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-white sm:text-3xl">
              {formatINR(state.wallet)}
            </p>
            <p className="mt-1.5 text-xs text-sky-300">Current cash balance</p>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Savings</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-300">
                <PiggyBank className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-emerald-300 sm:text-3xl">
              {formatINR(state.savings)}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">Emergency &amp; wealth reserve</p>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Debt</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/12 text-rose-300">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-rose-300 sm:text-3xl">
              {formatINR(state.debt)}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">2% monthly interest on balance</p>
          </div>
        </div>

        {/* Monthly Decisions Form */}
        <section className="glass-panel rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Month {state.month} Financial Decisions
                </h2>
                <p className="text-xs text-slate-400">
                  Set your savings rate, spending budget, and optional loan or repayment amount.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Server-Verified Engine
            </span>
          </div>

          {actionError && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitMonthlyDecisions} className="mt-6 space-y-6">
            {/* Savings Percentage Slider (0–100%) */}
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="savingsPercentage"
                  className="text-sm font-semibold text-white"
                >
                  Savings Percentage
                </label>
                <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 font-mono text-sm font-bold text-emerald-200">
                  {savingsPercentage}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Choose the percentage (0–100%) of your monthly income to allocate into savings.
              </p>
              <input
                id="savingsPercentage"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={submitting || activeRun.completed}
                value={savingsPercentage}
                onChange={(e) => setSavingsPercentage(Number(e.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Spending Budget, Loan Amount & Loan Repayment Inputs */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="spendingBudget" className="block text-xs font-semibold text-slate-200">
                  Spending Budget (₹)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Monthly living &amp; discretionary expenses
                </p>
                <input
                  id="spendingBudget"
                  type="number"
                  min={0}
                  step={100}
                  required
                  disabled={submitting || activeRun.completed}
                  value={spendingBudget}
                  onChange={(e) => setSpendingBudget(e.target.value)}
                  placeholder="15000"
                  className="mt-2 w-full rounded-xl border border-white/12 bg-[#070c18] px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="loanAmount" className="block text-xs font-semibold text-slate-200">
                  Take a Loan (₹)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Optional · 2% monthly interest applies
                </p>
                <input
                  id="loanAmount"
                  type="number"
                  min={0}
                  step={500}
                  disabled={submitting || activeRun.completed}
                  value={loanAmount}
                  onChange={(e) => {
                    setLoanAmount(e.target.value);
                    if (Number(e.target.value) > 0) setRepayAmount('0');
                  }}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-white/12 bg-[#070c18] px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="repayAmount" className="block text-xs font-semibold text-slate-200">
                  Repay Loan (₹)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Current debt: {formatINR(state.debt)}
                </p>
                <input
                  id="repayAmount"
                  type="number"
                  min={0}
                  step={100}
                  disabled={submitting || activeRun.completed}
                  value={repayAmount}
                  onChange={(e) => {
                    setRepayAmount(e.target.value);
                    if (Number(e.target.value) > 0) setLoanAmount('0');
                  }}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-white/12 bg-[#070c18] px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-400">
                Unexpected life events and final balances are calculated securely on the backend.
              </p>
              <button
                type="submit"
                disabled={submitting || activeRun.completed}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Month {state.month}...
                  </>
                ) : (
                  <>
                    Submit Monthly Decisions
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Financial Dashboard Charts (Wallet, Savings, Debt & Expenses) */}
        <FinancialCharts history={activeRun.history || []} />

        {/* Month-by-Month Progress Timeline */}
        <MonthTimeline
          durationMonths={durationMonths}
          monthsCompleted={monthsCompleted}
          currentMonth={state.month}
          completed={activeRun.completed}
          history={activeRun.history || []}
        />

        {/* Unexpected Event Popup Modal */}
        <EventModal stepResponse={latestStepModal} onClose={handleCloseEventModal} />
      </div>
    );
  }

  // ==========================================
  // VIEW 1: PERSONAL FINANCE INTRODUCTION & RESUME LOBBY
  // ==========================================
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero Introduction Card */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/14 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-500/12 blur-[110px]" />

        <div className="relative grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              12-Month Personal Finance Simulation
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Master Real-World Budgeting, Savings &amp; Debt.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Manage 12 simulated months of personal finances. Allocate your monthly salary across
              savings and living expenses, decide when to borrow or repay loans at 2% monthly
              interest, and stay resilient through unexpected medical bills, rent increases,
              inflation spikes, bonuses, and side-income opportunities.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartSimulation}
                disabled={starting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting Simulation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Simulation
                  </>
                )}
              </button>

              {activeRuns.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenRun(activeRuns[0].runId)}
                  disabled={Boolean(resumingRunId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/12 px-5 py-3.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Resume Latest Run (Month {activeRuns[0].state?.month})
                </button>
              )}
            </div>
          </div>

          {/* Starting Conditions Summary */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] font-medium text-slate-400">Starting Wallet</p>
              <p className="mt-1.5 font-mono text-xl font-bold text-white">₹30,000</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] font-medium text-slate-400">Monthly Income</p>
              <p className="mt-1.5 font-mono text-xl font-bold text-emerald-300">₹30,000</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] font-medium text-slate-400">Simulation Length</p>
              <p className="mt-1.5 font-mono text-xl font-bold text-sky-300">12 Months</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] font-medium text-slate-400">Loan Interest</p>
              <p className="mt-1.5 font-mono text-xl font-bold text-amber-300">2% / mo</p>
            </div>
          </div>
        </div>
      </section>

      {/* API Errors */}
      {(actionError || historyError) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionError || historyError}</span>
        </div>
      )}

      {/* Existing & Completed Runs History */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Your Simulation Runs
              </h2>
              <p className="text-xs text-slate-400">
                Resume an in-progress run or review completed 12-month financial reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRuns}
            disabled={historyLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="mt-6 flex items-center justify-center py-10 text-sm text-slate-400">
            <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-emerald-400" />
            Loading your Firestore simulation history...
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
            <Clock className="mx-auto h-7 w-7 text-slate-500" />
            <p className="mt-3 text-sm font-semibold text-slate-200">No simulation runs yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Click <strong className="text-white">Start Simulation</strong> above to launch your
              first 12-month personal finance challenge.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Active Runs */}
            {activeRuns.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-sky-300">
                  In Progress ({activeRuns.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeRuns.map((run) => (
                    <div
                      key={run.runId}
                      className="flex flex-col justify-between rounded-2xl border border-sky-400/20 bg-[#070c18]/85 p-4 sm:p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sky-200">
                            Month {run.state?.month} / {run.durationMonths || 12}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            Score {run.score} ({run.grade})
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="block text-[11px] text-slate-500">Wallet</span>
                            <span className="font-mono font-semibold text-white">
                              {formatINR(run.state?.wallet)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-slate-500">Savings</span>
                            <span className="font-mono font-semibold text-emerald-300">
                              {formatINR(run.state?.savings)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-slate-500">Debt</span>
                            <span className="font-mono font-semibold text-rose-300">
                              {formatINR(run.state?.debt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
                        <span className="text-[11px] text-slate-500">
                          Updated {formatDateTime(run.updatedAt || run.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRun(run.runId)}
                          disabled={resumingRunId === run.runId}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400/15 px-3.5 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/25 disabled:opacity-50"
                        >
                          {resumingRunId === run.runId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Runs */}
            {completedRuns.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Completed ({completedRuns.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedRuns.map((run) => (
                    <div
                      key={run.runId}
                      className="flex flex-col justify-between rounded-2xl border border-emerald-400/20 bg-[#070c18]/85 p-4 sm:p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            Grade {run.grade} · {run.score}/100
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="block text-[11px] text-slate-500">Final Wallet</span>
                            <span className="font-mono font-semibold text-white">
                              {formatINR(run.state?.wallet)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-slate-500">Savings</span>
                            <span className="font-mono font-semibold text-emerald-300">
                              {formatINR(run.state?.savings)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-slate-500">Net Worth</span>
                            <span className="font-mono font-semibold text-sky-300">
                              {formatINR(run.state?.netWorth)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
                        <span className="text-[11px] text-slate-500">
                          Finished {formatDateTime(run.updatedAt || run.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRun(run.runId)}
                          disabled={resumingRunId === run.runId}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-50"
                        >
                          {resumingRunId === run.runId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trophy className="h-3.5 w-3.5" />
                          )}
                          View Results
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
