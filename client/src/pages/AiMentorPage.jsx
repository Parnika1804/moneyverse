import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  HelpCircle,
  Info,
  Lightbulb,
  Loader2,
  Lock,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  fetchMentorRunContext,
  fetchMentorRuns,
  requestMentorAdvisory,
} from '../lib/api';
import { formatDateTime, formatINR, getEventMeta } from '../components/personal/formatters';

function extractApiError(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

function Phase10Notice({ message, onCheck, loading, responseMessage, buttonLabel }) {
  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.08] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-400/15 text-indigo-200">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              AI Analysis Available After Phase 10
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {responseMessage ||
                message ||
                'AI analysis will become available after Phase 10 (Gemini Enterprise integration).'}
            </p>
          </div>
        </div>

        {onCheck && (
          <button
            type="button"
            onClick={onCheck}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-indigo-400/30 bg-indigo-400/15 px-4 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/25 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking API...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {buttonLabel || 'Check AI Readiness'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AiMentorPage() {
  const [runs, setRuns] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState('');

  const [selectedRunId, setSelectedRunId] = useState('');
  const [runContext, setRunContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [sectionLoading, setSectionLoading] = useState({});
  const [sectionResponses, setSectionResponses] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});

  const loadRunContext = useCallback(async (runId) => {
    if (!runId) {
      setRunContext(null);
      setSelectedMonth(null);
      return;
    }

    setContextLoading(true);
    setContextError('');
    setSectionResponses({});
    setSectionErrors({});

    try {
      const data = await fetchMentorRunContext(runId);
      setRunContext(data);
      if (data?.aiStatus) setAiStatus(data.aiStatus);

      const months = data?.sections?.explainDecisions?.availableMonths || [];
      setSelectedMonth(months.length > 0 ? months[months.length - 1] : null);
    } catch (err) {
      setContextError(extractApiError(err, 'Unable to load simulation run context.'));
      setRunContext(null);
    } finally {
      setContextLoading(false);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError('');

    try {
      const data = await fetchMentorRuns();
      const loadedRuns = Array.isArray(data?.runs) ? data.runs : [];
      setRuns(loadedRuns);
      setAiStatus(data?.aiStatus || null);

      if (loadedRuns.length > 0) {
        const preferred =
          loadedRuns.find((r) => r.completed) || loadedRuns[0];
        setSelectedRunId(preferred.runId);
        await loadRunContext(preferred.runId);
      } else {
        setSelectedRunId('');
        setRunContext(null);
      }
    } catch (err) {
      setRunsError(extractApiError(err, 'Unable to load your simulation history for AI Mentor.'));
    } finally {
      setRunsLoading(false);
    }
  }, [loadRunContext]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  function handleSelectRun(nextRunId) {
    setSelectedRunId(nextRunId);
    loadRunContext(nextRunId);
  }

  async function handleRequestSection(section, month = null) {
    if (sectionLoading[section]) return;

    setSectionLoading((prev) => ({ ...prev, [section]: true }));
    setSectionErrors((prev) => ({ ...prev, [section]: '' }));

    try {
      const res = await requestMentorAdvisory({
        section,
        runId: selectedRunId || null,
        month,
      });
      setSectionResponses((prev) => ({ ...prev, [section]: res }));
      if (res?.aiStatus) setAiStatus(res.aiStatus);
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        [section]: extractApiError(err, 'Unable to query AI Mentor endpoint.'),
      }));
    } finally {
      setSectionLoading((prev) => ({ ...prev, [section]: false }));
    }
  }

  const activeRun = runContext?.run || null;
  const sections = runContext?.sections || null;
  const history = Array.isArray(activeRun?.history) ? activeRun.history : [];
  const selectedMonthEntry =
    selectedMonth !== null
      ? history.find((entry) => entry.month === selectedMonth) || null
      : null;

  const phase10Message =
    aiStatus?.message ||
    'AI analysis will become available after Phase 10 (Gemini Enterprise integration).';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-[100px]" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/12 px-3 py-1 text-xs font-semibold text-indigo-200">
                <Bot className="h-3.5 w-3.5" />
                AI Mentor Foundation
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Lock className="h-3 w-3" />
                Strictly Read-Only
              </span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              MoneyVerse AI Mentor
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Connected to your authenticated Firestore simulation history. Your financial engine
              calculations remain strictly server-controlled and read-only — AI Mentor only reads
              verified data to advise and educate.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 lg:max-w-xs">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="text-xs">
                <p className="font-semibold text-amber-100">Provider Status: Phase 10 Pending</p>
                <p className="mt-1 leading-relaxed text-amber-200/90">{phase10Message}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Run Selector Bar */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Select a Firestore Simulation Run
            </h2>
            <p className="text-xs text-slate-400">
              Loaded directly from your protected <code className="font-mono text-slate-300">/api/mentor/runs</code> endpoint.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRuns}
            disabled={runsLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${runsLoading ? 'animate-spin' : ''}`} />
            Refresh Runs
          </button>
        </div>

        {runsError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{runsError}</span>
          </div>
        )}

        {runsLoading ? (
          <div className="mt-5 flex items-center justify-center py-6 text-sm text-slate-400">
            <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-emerald-400" />
            Loading your simulation runs from Firestore...
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
            <Compass className="mx-auto h-7 w-7 text-slate-500" />
            <p className="mt-2.5 text-sm font-semibold text-slate-200">
              No Personal Finance simulations found yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Start a Personal Finance simulation first so AI Mentor has real Firestore data to inspect.
            </p>
            <Link
              to="/dashboard/personal-finance"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Go to Personal Finance Simulation
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {runs.map((run) => {
              const isSelected = run.runId === selectedRunId;
              return (
                <button
                  key={run.runId}
                  type="button"
                  onClick={() => handleSelectRun(run.runId)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-emerald-400/50 bg-emerald-400/10 shadow-sm'
                      : 'border-white/10 bg-[#070c18]/80 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                        run.completed
                          ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                          : 'border-sky-400/30 bg-sky-400/15 text-sky-200'
                      }`}
                    >
                      {run.completed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Calendar className="h-3 w-3" />
                          Month {run.state?.month}/{run.durationMonths}
                        </>
                      )}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {run.score ?? '—'}/100 ({run.grade || '—'})
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                    <span>Net Worth</span>
                    <span className="font-mono font-semibold text-white">
                      {formatINR(run.state?.netWorth)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Updated {formatDateTime(run.updatedAt || run.createdAt)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {contextError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{contextError}</span>
        </div>
      )}

      {contextLoading && (
        <div className="glass-panel flex items-center justify-center rounded-3xl py-12 text-sm text-slate-400">
          <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-emerald-400" />
          Loading verified run details from Firestore...
        </div>
      )}

      {/* Five AI Mentor Sections */}
      {!contextLoading && (
        <div className="space-y-6">
          {/* 1. Financial Performance Analysis */}
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    1. Financial Performance Analysis
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verified Firestore snapshot from your selected simulation run.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Read-Only Data
              </span>
            </div>

            {activeRun ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Wallet</span>
                    <Wallet className="h-3.5 w-3.5 text-sky-300" />
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-bold text-white">
                    {formatINR(activeRun.state?.wallet)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Savings</span>
                    <PiggyBank className="h-3.5 w-3.5 text-emerald-300" />
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-bold text-emerald-300">
                    {formatINR(activeRun.state?.savings)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Debt</span>
                    <CreditCard className="h-3.5 w-3.5 text-rose-300" />
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-bold text-rose-300">
                    {formatINR(activeRun.state?.debt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-3.5">
                  <span className="text-[11px] text-slate-400">Net Worth</span>
                  <p className="mt-1.5 font-mono text-lg font-bold text-white">
                    {formatINR(activeRun.state?.netWorth)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#070c18]/80 p-3.5">
                  <span className="text-[11px] text-slate-400">Health Score</span>
                  <p className="mt-1.5 font-mono text-lg font-bold text-sky-300">
                    {activeRun.score}/100 ({activeRun.grade})
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">
                Select or start a simulation run to load real financial metrics here.
              </p>
            )}

            {sectionErrors.performance_analysis && (
              <p className="mt-4 text-xs text-rose-300">{sectionErrors.performance_analysis}</p>
            )}

            <div className="mt-5">
              <Phase10Notice
                message={sections?.performanceAnalysis?.message || phase10Message}
                responseMessage={sectionResponses.performance_analysis?.message}
                loading={Boolean(sectionLoading.performance_analysis)}
                buttonLabel="Request Performance Analysis"
                onCheck={
                  activeRun ? () => handleRequestSection('performance_analysis') : undefined
                }
              />
            </div>
          </section>

          {/* 2. Financial Mistake Detection */}
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  2. Financial Mistake Detection
                </h2>
                <p className="text-xs text-slate-400">
                  Recorded Firestore risk events (interest charges, emergency savings drawdowns, and
                  emergency debt) prepared for Phase 10 AI critique.
                </p>
              </div>
            </div>

            {activeRun && (
              <div className="mt-5">
                {sections?.mistakeDetection?.recordedRiskFlags?.length > 0 ? (
                  <div className="space-y-2.5">
                    {sections.mistakeDetection.recordedRiskFlags.map((flag) => (
                      <div
                        key={flag.month}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg bg-amber-400/20 px-2 py-0.5 font-mono font-bold text-amber-200">
                            M{flag.month}
                          </span>
                          <span className="text-slate-200">{flag.eventTitle || 'Recorded Month'}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 font-mono text-[11px]">
                          {flag.interestAccrued > 0 && (
                            <span className="text-amber-300">
                              Interest: {formatINR(flag.interestAccrued)}
                            </span>
                          )}
                          {flag.savingsUsedForEmergency > 0 && (
                            <span className="text-orange-300">
                              Savings Used: {formatINR(flag.savingsUsedForEmergency)}
                            </span>
                          )}
                          {flag.emergencyDebtAdded > 0 && (
                            <span className="text-rose-300">
                              Emergency Debt: {formatINR(flag.emergencyDebtAdded)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-[#070c18]/70 px-4 py-3.5 text-xs text-slate-400">
                    No interest charges or emergency shortfalls have been recorded in this run yet.
                  </div>
                )}
              </div>
            )}

            {sectionErrors.mistake_detection && (
              <p className="mt-4 text-xs text-rose-300">{sectionErrors.mistake_detection}</p>
            )}

            <div className="mt-5">
              <Phase10Notice
                message={sections?.mistakeDetection?.message || phase10Message}
                responseMessage={sectionResponses.mistake_detection?.message}
                loading={Boolean(sectionLoading.mistake_detection)}
                buttonLabel="Run Mistake Detection"
                onCheck={activeRun ? () => handleRequestSection('mistake_detection') : undefined}
              />
            </div>
          </section>

          {/* 3. Personalised Financial Advice */}
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="h-5 w-5 text-sky-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  3. Personalised Financial Advice
                </h2>
                <p className="text-xs text-slate-400">
                  Tailored savings, budgeting, and debt-management recommendations grounded in your
                  Firestore run history.
                </p>
              </div>
            </div>

            {activeRun && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-[#070c18]/70 px-4 py-3.5 text-xs text-slate-300">
                Context ready for Gemini Enterprise:{' '}
                <span className="font-mono text-white">
                  {activeRun.monthsCompleted}/{activeRun.durationMonths} months recorded
                </span>{' '}
                · Run ID <span className="font-mono text-slate-400">{activeRun.runId}</span>
              </div>
            )}

            {sectionErrors.personalized_advice && (
              <p className="mt-4 text-xs text-rose-300">{sectionErrors.personalized_advice}</p>
            )}

            <div className="mt-5">
              <Phase10Notice
                message={sections?.personalizedAdvice?.message || phase10Message}
                responseMessage={sectionResponses.personalized_advice?.message}
                loading={Boolean(sectionLoading.personalized_advice)}
                buttonLabel="Get Personalised Advice"
                onCheck={activeRun ? () => handleRequestSection('personalized_advice') : undefined}
              />
            </div>
          </section>

          {/* 4. Explain My Decisions */}
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  4. Explain My Decisions
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect any completed month from Firestore and prepare plain-language explanations
                  for Phase 10.
                </p>
              </div>
            </div>

            {activeRun && history.length > 0 ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {history.map((entry) => (
                    <button
                      key={entry.month}
                      type="button"
                      onClick={() => setSelectedMonth(entry.month)}
                      className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                        selectedMonth === entry.month
                          ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
                      }`}
                    >
                      Month {entry.month}
                    </button>
                  ))}
                </div>

                {selectedMonthEntry && (
                  <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Month {selectedMonthEntry.month}:{' '}
                          {selectedMonthEntry.event?.title || 'Recorded Step'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {selectedMonthEntry.event?.description}
                        </p>
                      </div>
                      {selectedMonthEntry.event && (
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                            getEventMeta(selectedMonthEntry.event.type).badgeClass
                          }`}
                        >
                          {selectedMonthEntry.event.impactType === 'income' ? '+' : '-'}
                          {formatINR(selectedMonthEntry.event.amount)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-3 text-xs sm:grid-cols-4">
                      <div>
                        <span className="block text-[11px] text-slate-500">Savings Chosen</span>
                        <span className="font-mono font-semibold text-emerald-300">
                          {selectedMonthEntry.decision?.savingsPercentage}% (
                          {formatINR(selectedMonthEntry.breakdown?.savingsDeposit)})
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Spending Budget</span>
                        <span className="font-mono font-semibold text-white">
                          {formatINR(selectedMonthEntry.breakdown?.spendingBudget)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Loan / Repay</span>
                        <span className="font-mono font-semibold text-slate-200">
                          +{formatINR(selectedMonthEntry.breakdown?.loanAmount)} / -
                          {formatINR(selectedMonthEntry.breakdown?.repayAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Score After Month</span>
                        <span className="font-mono font-semibold text-sky-300">
                          {selectedMonthEntry.scoreAfterMonth}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">
                Complete at least one month in Personal Finance to inspect decision records here.
              </p>
            )}

            {sectionErrors.explain_decisions && (
              <p className="mt-4 text-xs text-rose-300">{sectionErrors.explain_decisions}</p>
            )}

            <div className="mt-5">
              <Phase10Notice
                message={sections?.explainDecisions?.message || phase10Message}
                responseMessage={sectionResponses.explain_decisions?.message}
                loading={Boolean(sectionLoading.explain_decisions)}
                buttonLabel={
                  selectedMonth ? `Explain Month ${selectedMonth}` : 'Explain Decision'
                }
                onCheck={
                  activeRun && selectedMonth
                    ? () => handleRequestSection('explain_decisions', selectedMonth)
                    : undefined
                }
              />
            </div>
          </section>

          {/* 5. Financial Challenges */}
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2.5">
              <Target className="h-5 w-5 text-indigo-300" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  5. Financial Challenges
                </h2>
                <p className="text-xs text-slate-400">
                  Adaptive scenario challenges generated from your simulation patterns — strictly
                  advisory and never modifying your balances.
                </p>
              </div>
            </div>

            {sectionErrors.financial_challenges && (
              <p className="mt-4 text-xs text-rose-300">{sectionErrors.financial_challenges}</p>
            )}

            <div className="mt-5">
              <Phase10Notice
                message={sections?.financialChallenges?.message || phase10Message}
                responseMessage={sectionResponses.financial_challenges?.message}
                loading={Boolean(sectionLoading.financial_challenges)}
                buttonLabel="Generate Financial Challenge"
                onCheck={() => handleRequestSection('financial_challenges')}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
