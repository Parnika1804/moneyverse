import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Megaphone,
  Package,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  fetchBusinessHistory,
  startBusinessSimulation,
  stepBusinessSimulation,
} from '../lib/api';
import { formatDateTime, formatINR } from '../components/personal/formatters';
import { BUSINESS_CHOICES, getBusinessChoice } from '../components/business/businessMeta';
import BusinessEventModal from '../components/business/BusinessEventModal';
import BusinessCharts from '../components/business/BusinessCharts';
import BusinessTimeline from '../components/business/BusinessTimeline';
import BusinessFinalResults from '../components/business/BusinessFinalResults';

function extractApiError(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

export default function BusinessSimulationPage() {
  const [runs, setRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [selectedType, setSelectedType] = useState('cafe');
  const [activeRun, setActiveRun] = useState(null);
  const [viewMode, setViewMode] = useState('lobby'); // 'lobby' | 'play' | 'results'

  const [starting, setStarting] = useState(false);
  const [resumingRunId, setResumingRunId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Weekly decision form inputs (sent directly to POST /api/business/step; zero client math)
  const [restockUnits, setRestockUnits] = useState('80');
  const [sellingPrice, setSellingPrice] = useState('180');
  const [marketingSpend, setMarketingSpend] = useState('1500');

  const [latestStepModal, setLatestStepModal] = useState(null);

  const startLockRef = useRef(false);
  const submitLockRef = useRef(false);

  const loadRuns = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await fetchBusinessHistory();
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
    } catch (err) {
      setHistoryError(extractApiError(err, 'Unable to load your business simulation history.'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  function seedFormDefaultsForRun(run) {
    const choice = getBusinessChoice(run?.businessType || run?.state?.businessType);
    const lastDecision =
      Array.isArray(run?.history) && run.history.length > 0
        ? run.history[run.history.length - 1]?.decision
        : null;

    setRestockUnits(String(lastDecision?.restockUnits ?? choice.defaultRestock));
    setSellingPrice(
      String(
        lastDecision?.sellingPrice ??
          run?.state?.recommendedPrice ??
          choice.recommendedPrice,
      ),
    );
    setMarketingSpend(String(lastDecision?.marketingSpend ?? '1500'));
    setActionError('');
    setValidationError('');
  }

  async function handleStartBusiness(businessTypeKey = selectedType) {
    if (startLockRef.current || starting) return;
    startLockRef.current = true;
    setStarting(true);
    setActionError('');
    setValidationError('');

    try {
      const started = await startBusinessSimulation(businessTypeKey);
      const freshRun = {
        runId: started.runId,
        type: 'business_simulation',
        businessType: started.businessType,
        businessName: started.businessName,
        status: started.completed ? 'completed' : 'active',
        completed: Boolean(started.completed),
        durationWeeks: started.state?.durationWeeks || 12,
        weeksCompleted: started.weeksCompleted ?? 0,
        state: started.state,
        score: started.score,
        grade: started.grade,
        history: [],
        createdAt: started.createdAt,
      };

      setActiveRun(freshRun);
      setLatestStepModal(null);
      seedFormDefaultsForRun(freshRun);
      setViewMode('play');
      setRuns((prev) => [freshRun, ...prev.filter((r) => r.runId !== freshRun.runId)]);
    } catch (err) {
      setActionError(extractApiError(err, 'Unable to start a new business simulation.'));
    } finally {
      setStarting(false);
      startLockRef.current = false;
    }
  }

  async function handleOpenRun(runId) {
    if (resumingRunId) return;
    setResumingRunId(runId);
    setActionError('');
    setValidationError('');

    try {
      const data = await fetchBusinessHistory(runId);
      const loadedRun = data?.run;
      if (!loadedRun) {
        throw new Error('Business run details were not returned by the server.');
      }

      setActiveRun(loadedRun);
      setLatestStepModal(null);
      seedFormDefaultsForRun(loadedRun);
      setViewMode(loadedRun.completed ? 'results' : 'play');
    } catch (err) {
      setActionError(extractApiError(err, 'Unable to load the selected business run.'));
    } finally {
      setResumingRunId('');
    }
  }

  async function handleSubmitWeeklyDecisions(event) {
    event.preventDefault();
    if (!activeRun || submitLockRef.current || submitting) return;

    setValidationError('');
    setActionError('');

    const parsedRestock = Number(restockUnits === '' ? 0 : restockUnits);
    const parsedPrice = Number(sellingPrice);
    const parsedMarketing = Number(marketingSpend === '' ? 0 : marketingSpend);

    if (!Number.isInteger(parsedRestock) || parsedRestock < 0) {
      setValidationError('Restock units must be a whole number (0 or greater).');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setValidationError('Please enter a valid selling price.');
      return;
    }

    if (
      activeRun.state?.minPrice &&
      activeRun.state?.maxPrice &&
      (parsedPrice < activeRun.state.minPrice || parsedPrice > activeRun.state.maxPrice)
    ) {
      setValidationError(
        `Selling price for ${activeRun.businessName} must be between ${formatINR(activeRun.state.minPrice)} and ${formatINR(activeRun.state.maxPrice)}.`,
      );
      return;
    }

    if (!Number.isFinite(parsedMarketing) || parsedMarketing < 0) {
      setValidationError('Marketing spend must be ₹0 or greater.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      const response = await stepBusinessSimulation({
        runId: activeRun.runId,
        restockUnits: parsedRestock,
        sellingPrice: parsedPrice,
        marketingSpend: parsedMarketing,
      });

      const serverEntry = {
        week: response.weeksCompleted,
        decision: response.decision,
        breakdown: response.breakdown,
        event: response.event,
        scoreAfterWeek: response.score,
      };

      const updatedRun = {
        ...activeRun,
        state: response.state,
        score: response.score,
        grade: response.grade,
        weeksCompleted: response.weeksCompleted,
        completed: Boolean(response.completed),
        status: response.completed ? 'completed' : 'active',
        history: [...(activeRun.history || []), serverEntry],
      };

      setActiveRun(updatedRun);
      setRuns((prev) => [updatedRun, ...prev.filter((item) => item.runId !== updatedRun.runId)]);
      setLatestStepModal(response);
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to submit weekly decisions.'));
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  function handleCloseEventModal() {
    const isCompleted = Boolean(latestStepModal?.completed || activeRun?.completed);
    setLatestStepModal(null);
    if (isCompleted) {
      setViewMode('results');
    }
  }

  function handleBackToLobby() {
    setLatestStepModal(null);
    setActionError('');
    setValidationError('');
    setViewMode('lobby');
    loadRuns();
  }

  const activeRuns = runs.filter((r) => !r.completed);
  const completedRuns = runs.filter((r) => r.completed);
  const selectedChoice = getBusinessChoice(selectedType);

  // ==========================================
  // VIEW 3: FINAL RESULTS SCREEN
  // ==========================================
  if (viewMode === 'results' && activeRun) {
    return (
      <div className="mx-auto max-w-6xl">
        <BusinessFinalResults
          run={activeRun}
          onStartNew={handleBackToLobby}
          onBackToLobby={handleBackToLobby}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE WEEKLY BUSINESS SIMULATION
  // ==========================================
  if (viewMode === 'play' && activeRun) {
    const state = activeRun.state || {};
    const durationWeeks = activeRun.durationWeeks || state.durationWeeks || 12;
    const weeksCompleted = activeRun.weeksCompleted ?? activeRun.history?.length ?? 0;
    const bizChoice = getBusinessChoice(activeRun.businessType || state.businessType);
    const BizIcon = bizChoice.icon;
    const totalProfitPositive = (state.totalProfit ?? 0) >= 0;
    const latestEntry =
      Array.isArray(activeRun.history) && activeRun.history.length > 0
        ? activeRun.history[activeRun.history.length - 1]
        : null;

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Bar */}
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-200">
                  <Calendar className="h-3 w-3" />
                  Week {state.week} of {durationWeeks}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <BizIcon className="h-3 w-3 text-emerald-300" />
                  {activeRun.businessName || bizChoice.name}
                </span>
              </div>
              <h1 className="mt-1 font-display text-xl font-extrabold text-white sm:text-2xl">
                Business Operations Dashboard
              </h1>
            </div>
          </div>

          {activeRun.completed && (
            <button
              type="button"
              onClick={() => setViewMode('results')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <Trophy className="h-4 w-4" />
              View Final Report
            </button>
          )}
        </div>

        {/* 5 Core Business State Cards (Backend Values Only) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="glass-panel rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Remaining Cash</span>
              <Wallet className="h-4 w-4 text-sky-300" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-white">
              {formatINR(state.remainingCash)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Fixed cost: {formatINR(state.weeklyFixedCost)}/wk
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Inventory</span>
              <Package className="h-4 w-4 text-indigo-300" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-white">
              {state.inventory ?? 0}{' '}
              <span className="text-xs font-medium text-slate-400">units</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Unit cost: {formatINR(state.unitCost)}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Revenue</span>
              <Banknote className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-emerald-300">
              {formatINR(state.totalRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {latestEntry
                ? `Last wk: ${formatINR(latestEntry.breakdown?.revenue)}`
                : 'Cumulative revenue'}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Profit / Loss</span>
              <TrendingUp
                className={`h-4 w-4 ${totalProfitPositive ? 'text-emerald-300' : 'text-rose-300'}`}
              />
            </div>
            <p
              className={`mt-3 font-mono text-2xl font-bold ${
                totalProfitPositive ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {totalProfitPositive ? '+' : ''}
              {formatINR(state.totalProfit)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {latestEntry
                ? `Last wk: ${latestEntry.breakdown?.profit >= 0 ? '+' : ''}${formatINR(latestEntry.breakdown?.profit)}`
                : 'Cumulative P&L'}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Business Score</span>
              <Award className="h-4 w-4 text-amber-300" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold text-white">
              {activeRun.score}
              <span className="ml-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-sm text-emerald-300">
                {activeRun.grade}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Out of 100 points</p>
          </div>
        </div>

        {/* Weekly Decisions Form */}
        <section className="glass-panel rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Week {state.week} Decisions
                </h2>
                <p className="text-xs text-slate-400">
                  Choose restock quantity, selling price, and marketing spend for this week.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Server-Calculated P&amp;L
            </span>
          </div>

          {(validationError || actionError) && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{validationError || actionError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitWeeklyDecisions} className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Restock Units */}
              <div className="rounded-2xl border border-white/10 bg-[#070c18]/80 p-4">
                <label
                  htmlFor="restockUnits"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white"
                >
                  <Package className="h-3.5 w-3.5 text-indigo-300" />
                  Restock Units
                </label>
                <p className="mt-1 text-[11px] text-slate-400">
                  Wholesale cost: {formatINR(state.unitCost)} / unit
                </p>
                <input
                  id="restockUnits"
                  type="number"
                  min={0}
                  step={1}
                  required
                  disabled={submitting || activeRun.completed}
                  value={restockUnits}
                  onChange={(e) => setRestockUnits(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/12 bg-[#0b1222] px-3.5 py-2.5 font-mono text-sm text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 disabled:opacity-50"
                />
              </div>

              {/* Selling Price */}
              <div className="rounded-2xl border border-white/10 bg-[#070c18]/80 p-4">
                <label
                  htmlFor="sellingPrice"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white"
                >
                  <Tag className="h-3.5 w-3.5 text-emerald-300" />
                  Selling Price (₹)
                </label>
                <p className="mt-1 text-[11px] text-slate-400">
                  Allowed: {formatINR(state.minPrice)} – {formatINR(state.maxPrice)} (Rec:{' '}
                  {formatINR(state.recommendedPrice)})
                </p>
                <input
                  id="sellingPrice"
                  type="number"
                  min={state.minPrice || 1}
                  max={state.maxPrice || 10000}
                  step={5}
                  required
                  disabled={submitting || activeRun.completed}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/12 bg-[#0b1222] px-3.5 py-2.5 font-mono text-sm text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 disabled:opacity-50"
                />
              </div>

              {/* Marketing Spend */}
              <div className="rounded-2xl border border-white/10 bg-[#070c18]/80 p-4">
                <label
                  htmlFor="marketingSpend"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white"
                >
                  <Megaphone className="h-3.5 w-3.5 text-sky-300" />
                  Marketing Spend (₹)
                </label>
                <p className="mt-1 text-[11px] text-slate-400">
                  Boosts customer demand (₹0 – ₹25,000)
                </p>
                <input
                  id="marketingSpend"
                  type="number"
                  min={0}
                  max={25000}
                  step={250}
                  required
                  disabled={submitting || activeRun.completed}
                  value={marketingSpend}
                  onChange={(e) => setMarketingSpend(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/12 bg-[#0b1222] px-3.5 py-2.5 font-mono text-sm text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-400">
                Customer demand, market events, profit/loss, and cash flow are computed on the
                backend.
              </p>
              <button
                type="submit"
                disabled={submitting || activeRun.completed}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Week {state.week}...
                  </>
                ) : (
                  <>
                    Submit Week {state.week} Decisions
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Financial Charts & 12-Week Progress Timeline */}
        <BusinessCharts history={activeRun.history || []} />

        <BusinessTimeline
          durationWeeks={durationWeeks}
          weeksCompleted={weeksCompleted}
          currentWeek={state.week}
          completed={activeRun.completed}
          history={activeRun.history || []}
        />

        {/* Weekly Event & Result Modal */}
        <BusinessEventModal stepResponse={latestStepModal} onClose={handleCloseEventModal} />
      </div>
    );
  }

  // ==========================================
  // VIEW 1: BUSINESS CHOICE & RESUME LOBBY
  // ==========================================
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-[110px]" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/12 px-3.5 py-1 text-xs font-semibold text-indigo-200">
              <Briefcase className="h-3.5 w-3.5" />
              12-Week Business Simulation
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Launch &amp; Scale Your Own Business.
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
              Choose a venture, deploy ₹50,000 starting capital, and navigate 12 weeks of inventory
              planning, pricing, marketing, and unpredictable market events.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-72">
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] text-slate-400">Starting Capital</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-300">₹50,000</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
              <p className="text-[11px] text-slate-400">Duration</p>
              <p className="mt-1 font-mono text-xl font-bold text-sky-300">12 Weeks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Errors */}
      {(actionError || historyError) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionError || historyError}</span>
        </div>
      )}

      {/* Three Business Choices */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Choose Your Business</h2>
            <p className="text-xs text-slate-400">
              Select a business model below and start a fresh 12-week simulation run.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            3 Business Models
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {BUSINESS_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const isSelected = selectedType === choice.key;
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => setSelectedType(choice.key)}
                className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? `${choice.accentBorder} shadow-lg`
                    : 'border-white/10 bg-[#070c18]/80 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${choice.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 font-display text-lg font-bold text-white">{choice.name}</h3>
                  <p className="text-xs font-medium text-emerald-300">{choice.tagline}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {choice.description}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/8 pt-3.5 text-[11px]">
                  <div>
                    <span className="block text-slate-500">Unit Cost</span>
                    <span className="font-mono font-semibold text-white">
                      {choice.unitCostLabel}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Fixed Cost</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {choice.fixedCostLabel}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500">Allowed Selling Price</span>
                    <span className="font-mono font-semibold text-sky-300">
                      {choice.priceRangeLabel}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
          <p className="text-xs text-slate-400">
            Selected venture:{' '}
            <strong className="text-white">{selectedChoice.name}</strong> · ₹50,000 capital · 12
            weeks
          </p>
          <button
            type="button"
            onClick={() => handleStartBusiness(selectedType)}
            disabled={starting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching {selectedChoice.name}...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start {selectedChoice.name} Simulation
              </>
            )}
          </button>
        </div>
      </section>

      {/* Existing & Completed Business Runs */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Your Business Runs</h2>
              <p className="text-xs text-slate-400">
                Resume an active business or inspect completed 12-week P&amp;L reports.
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
            Loading your business simulation runs...
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
            <Clock className="mx-auto h-7 w-7 text-slate-500" />
            <p className="mt-3 text-sm font-semibold text-slate-200">No business runs yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Pick Café, Bakery, or Clothing Store above and click Start to launch your first
              venture.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {activeRuns.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  In Progress ({activeRuns.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeRuns.map((run) => {
                    const meta = getBusinessChoice(run.businessType);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={run.runId}
                        className="flex flex-col justify-between rounded-2xl border border-indigo-400/20 bg-[#070c18]/85 p-4 sm:p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                              <Icon className="h-4 w-4 text-emerald-300" />
                              {run.businessName || meta.name}
                            </span>
                            <span className="rounded-full border border-indigo-400/30 bg-indigo-400/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-200">
                              Week {run.state?.week} / {run.durationWeeks || 12}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="block text-[11px] text-slate-500">Cash</span>
                              <span className="font-mono font-semibold text-white">
                                {formatINR(run.state?.remainingCash)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-slate-500">Profit/Loss</span>
                              <span
                                className={`font-mono font-semibold ${
                                  (run.state?.totalProfit ?? 0) >= 0
                                    ? 'text-emerald-300'
                                    : 'text-rose-300'
                                }`}
                              >
                                {formatINR(run.state?.totalProfit)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-slate-500">Score</span>
                              <span className="font-mono font-semibold text-sky-300">
                                {run.score} ({run.grade})
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
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-400/15 px-3.5 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-400/25 disabled:opacity-50"
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
                    );
                  })}
                </div>
              </div>
            )}

            {completedRuns.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Completed ({completedRuns.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedRuns.map((run) => {
                    const meta = getBusinessChoice(run.businessType);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={run.runId}
                        className="flex flex-col justify-between rounded-2xl border border-emerald-400/20 bg-[#070c18]/85 p-4 sm:p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                              <Icon className="h-4 w-4 text-emerald-300" />
                              {run.businessName || meta.name}
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-300">
                              Grade {run.grade} · {run.score}/100
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="block text-[11px] text-slate-500">Final Cash</span>
                              <span className="font-mono font-semibold text-white">
                                {formatINR(run.state?.remainingCash)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-slate-500">Revenue</span>
                              <span className="font-mono font-semibold text-emerald-300">
                                {formatINR(run.state?.totalRevenue)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-slate-500">Profit/Loss</span>
                              <span
                                className={`font-mono font-semibold ${
                                  (run.state?.totalProfit ?? 0) >= 0
                                    ? 'text-emerald-300'
                                    : 'text-rose-300'
                                }`}
                              >
                                {formatINR(run.state?.totalProfit)}
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
