import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Landmark,
  Lightbulb,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { fetchLessons, fetchProfile, submitLessonQuiz } from '../lib/api';
import LeaderboardCard from '../components/learning/LeaderboardCard';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const LESSON_ICON_MAP = {
  banking: Landmark,
  budgeting: Wallet,
  'loans-and-interest': CreditCard,
  taxation: Receipt,
  entrepreneurship: Briefcase,
  inflation: TrendingUp,
};

function extractApiError(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

export default function LearningHubPage() {
  const [activeTab, setActiveTab] = useState('lessons'); // 'lessons' | 'leaderboard'
  const [lessons, setLessons] = useState([]);
  const [contentSource, setContentSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live backend profile XP & Level (never calculated on frontend)
  const [userXp, setUserXp] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

  // Active lesson + quiz interaction state
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [quizResponse, setQuizResponse] = useState(null);

  const submitLockRef = useRef(false);

  const loadLearningHub = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonsData, profileData] = await Promise.all([
        fetchLessons(),
        fetchProfile().catch(() => null),
      ]);

      setLessons(Array.isArray(lessonsData?.lessons) ? lessonsData.lessons : []);
      setContentSource(lessonsData?.source || '');

      if (profileData?.profile) {
        setUserXp(profileData.profile.xp);
        setUserLevel(profileData.profile.level);
      }
    } catch (err) {
      setError(extractApiError(err, 'Unable to load Learning Hub lessons.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLearningHub();
  }, [loadLearningHub]);

  const activeLesson = selectedLessonId
    ? lessons.find((item) => item.id === selectedLessonId) || null
    : null;

  function openLesson(lesson) {
    setSelectedLessonId(lesson.id);
    setSelectedAnswers(new Array(lesson.questions.length).fill(null));
    setSubmitError('');
    setQuizResponse(null);
    setActiveTab('lessons');
  }

  function closeLesson() {
    setSelectedLessonId(null);
    setSelectedAnswers([]);
    setSubmitError('');
    setQuizResponse(null);
  }

  function handleSelectOption(questionIndex, optionIndex) {
    if (submitting || quizResponse) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
    setSubmitError('');
  }

  function handleRetakeQuiz() {
    if (!activeLesson) return;
    setSelectedAnswers(new Array(activeLesson.questions.length).fill(null));
    setSubmitError('');
    setQuizResponse(null);
  }

  async function handleSubmitQuiz(event) {
    event.preventDefault();
    if (!activeLesson || submitLockRef.current || submitting) return;

    if (selectedAnswers.some((ans) => ans === null || ans === undefined)) {
      setSubmitError('Please select an answer for all 3 questions before submitting.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const data = await submitLessonQuiz({
        lessonId: activeLesson.id,
        answers: selectedAnswers,
      });

      setQuizResponse(data);

      // Update displayed XP & Level strictly from backend response
      if (typeof data.totalUserXp === 'number') {
        setUserXp(data.totalUserXp);
      }
      if (typeof data.level === 'number') {
        setUserLevel(data.level);
      }

      // Refresh lessons progress & leaderboard directly from backend
      setLeaderboardRefreshKey((prev) => prev + 1);
      const refreshed = await fetchLessons().catch(() => null);
      if (Array.isArray(refreshed?.lessons)) {
        setLessons(refreshed.lessons);
      }
    } catch (err) {
      setSubmitError(extractApiError(err, 'Failed to submit quiz answers.'));
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  const completedLessonsCount = lessons.filter((l) => l.progress?.completed).length;

  // ==========================================
  // INTERACTIVE LESSON & QUIZ VIEW
  // ==========================================
  if (activeLesson) {
    const LessonIcon = LESSON_ICON_MAP[activeLesson.id] || BookOpen;
    const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
    const nextLesson =
      currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
    const allAnswered =
      selectedAnswers.length === activeLesson.questions.length &&
      selectedAnswers.every((ans) => ans !== null && ans !== undefined);

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Navigation Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeLesson}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            All Lessons
          </button>

          <div className="flex items-center gap-2.5">
            {userXp !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono text-xs font-semibold text-amber-200">
                <Zap className="h-3.5 w-3.5" />
                {userXp.toLocaleString('en-IN')} XP · Lv {userLevel ?? 1}
              </span>
            )}
            {activeLesson.progress?.completed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Lesson Header & Beginner Explanation */}
        <article className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <LessonIcon className="h-3.5 w-3.5" />
              {activeLesson.category}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
              {activeLesson.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {activeLesson.estimatedMinutes} min read
            </span>
          </div>

          <h1 className="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
            {activeLesson.title}
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">{activeLesson.description}</p>

          <div className="mt-6 border-t border-white/8 pt-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-emerald-300">
              Concept Breakdown
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-200">{activeLesson.explanation}</p>
          </div>

          {/* Practical Indian Rupee Example */}
          {activeLesson.example && (
            <div className="mt-6 rounded-2xl border border-sky-400/25 bg-sky-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-sky-200">
                <Lightbulb className="h-4.5 w-4.5 shrink-0 text-sky-300" />
                <h3 className="font-display text-sm font-bold">
                  Real-World Example (₹): {activeLesson.example.title}
                </h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                {activeLesson.example.scenario}
              </p>
              {activeLesson.example.takeaway && (
                <p className="mt-2.5 border-t border-sky-400/15 pt-2.5 text-xs font-medium text-sky-200">
                  Key Takeaway: {activeLesson.example.takeaway}
                </p>
              )}
            </div>
          )}
        </article>

        {/* Backend Graded Quiz Result Banner */}
        {quizResponse && (
          <section className="glass-panel rounded-3xl border border-emerald-400/30 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Server-Graded Quiz Result
                </div>
                <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
                  Score: {quizResponse.score} / {quizResponse.totalQuestions} (
                  {quizResponse.percentage}%)
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  {quizResponse.xpAwarded > 0
                    ? `You earned +${quizResponse.xpAwarded} XP! Total XP is now ${quizResponse.totalUserXp.toLocaleString('en-IN')} XP (Level ${quizResponse.level}).`
                    : quizResponse.duplicateAttempt
                      ? `You already earned XP for these questions earlier. No duplicate XP was added (Total: ${quizResponse.totalUserXp.toLocaleString('en-IN')} XP).`
                      : `Review the explanations below and retake the quiz to earn XP for correct answers.`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center">
                  <p className="font-mono text-[10px] uppercase text-amber-200">XP Earned</p>
                  <p className="mt-0.5 font-mono text-xl font-bold text-amber-300">
                    +{quizResponse.xpAwarded}
                  </p>
                </div>
              </div>
            </div>

            {Array.isArray(quizResponse.newlyEarnedBadges) &&
              quizResponse.newlyEarnedBadges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  {quizResponse.newlyEarnedBadges.map((badge) => (
                    <span
                      key={badge.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200"
                    >
                      <Award className="h-3.5 w-3.5" />
                      New Badge: {badge.name}
                    </span>
                  ))}
                </div>
              )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetakeQuiz}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retake Quiz
              </button>
              {nextLesson && (
                <button
                  type="button"
                  onClick={() => openLesson(nextLesson)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Next Lesson: {nextLesson.title}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeLesson();
                  setActiveTab('leaderboard');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
              >
                <Trophy className="h-3.5 w-3.5" />
                View Leaderboard
              </button>
            </div>
          </section>
        )}

        {/* 3-Question Interactive Quiz */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Knowledge Check Quiz</h2>
              <p className="text-xs text-slate-400">
                Answer all 3 multiple-choice questions · Earn up to {activeLesson.maxXp} XP (
                {activeLesson.xpPerQuestion} XP per correct answer).
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              Earned: {activeLesson.progress?.xpAwarded ?? 0}/{activeLesson.maxXp} XP
            </span>
          </div>

          {submitError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitQuiz} className="mt-6 space-y-6">
            {activeLesson.questions.map((question, qIndex) => {
              const graded = quizResponse?.results?.[qIndex] || null;
              const chosenIndex = selectedAnswers[qIndex];

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-white/10 bg-[#070c18]/80 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      <span className="mr-2 font-mono text-emerald-300">Q{qIndex + 1}.</span>
                      {question.question}
                    </p>
                    {graded && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          graded.isCorrect
                            ? 'bg-emerald-400/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {graded.isCorrect ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Incorrect
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {question.options.map((optionText, optIndex) => {
                      const isSelected = chosenIndex === optIndex;
                      const isCorrectOption = graded && graded.correctIndex === optIndex;
                      const isWrongSelection = graded && isSelected && !graded.isCorrect;

                      let optionStyle =
                        'border-white/10 bg-white/[0.02] text-slate-200 hover:border-white/25 hover:bg-white/[0.05]';
                      if (isCorrectOption) {
                        optionStyle =
                          'border-emerald-400/60 bg-emerald-400/15 text-emerald-100';
                      } else if (isWrongSelection) {
                        optionStyle = 'border-rose-400/60 bg-rose-500/15 text-rose-100';
                      } else if (isSelected) {
                        optionStyle = 'border-sky-400/60 bg-sky-400/15 text-white';
                      }

                      return (
                        <button
                          key={`${question.id}-${optIndex}`}
                          type="button"
                          disabled={submitting || Boolean(quizResponse)}
                          onClick={() => handleSelectOption(qIndex, optIndex)}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition disabled:cursor-default ${optionStyle}`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-current/30 font-mono text-[11px] font-bold">
                            {OPTION_LETTERS[optIndex]}
                          </span>
                          <span className="leading-relaxed">{optionText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {graded && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs text-slate-300">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                      <span>
                        <strong className="text-white">Explanation:</strong> {graded.explanation}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {!quizResponse && (
              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-400">
                  Answers are graded securely on the backend. XP is awarded only for newly mastered
                  questions.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !allAnswered}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Grading Quiz...
                    </>
                  ) : (
                    <>
                      Submit Quiz Answers
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    );
  }

  // ==========================================
  // LEARNING HUB OVERVIEW + LEADERBOARD TABS
  // ==========================================
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/14 blur-[110px]" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
              <BookOpen className="h-3.5 w-3.5" />
              MoneyVerse Learning Hub
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Learn Practical Finance. Earn XP. Climb the Leaderboard.
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
              Explore six bite-sized financial literacy lessons tailored to Indian Rupees (₹), test
              your mastery with backend-graded MCQs, and unlock XP and badges.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-96">
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-3.5">
              <p className="text-[11px] text-slate-400">Progress</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-300">
                {completedLessonsCount}/{lessons.length || 6}
              </p>
              <p className="text-[10px] text-slate-500">Lessons done</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-3.5">
              <p className="text-[11px] text-slate-400">Total XP</p>
              <p className="mt-1 font-mono text-xl font-bold text-amber-300">
                {userXp !== null ? userXp.toLocaleString('en-IN') : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Server synced</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070c18]/85 p-3.5">
              <p className="text-[11px] text-slate-400">Level</p>
              <p className="mt-1 font-mono text-xl font-bold text-indigo-300">
                {userLevel !== null ? `Lv ${userLevel}` : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Current tier</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Switcher + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-white/10 bg-[#080d1a] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'lessons'
                ? 'bg-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Lessons ({lessons.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard (Top 10)
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {contentSource && (
            <span className="hidden rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-slate-400 sm:inline-flex">
              Source: {contentSource === 'gcs' ? 'Cloud Storage' : 'Local Fallback'}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              loadLearningHub();
              setLeaderboardRefreshKey((prev) => prev + 1);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Lessons Tab */}
      {activeTab === 'lessons' ? (
        <>
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="glass-panel flex items-center justify-center rounded-3xl py-16 text-sm text-slate-400">
              <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-emerald-400" />
              Loading financial literacy lessons...
            </div>
          ) : lessons.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-200">No lessons available</p>
              <p className="mt-1 text-xs text-slate-400">
                Try refreshing or verify the backend content endpoint.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {lessons.map((lesson) => {
                const Icon = LESSON_ICON_MAP[lesson.id] || BookOpen;
                const progress = lesson.progress || {};
                const isCompleted = Boolean(progress.completed);

                return (
                  <div
                    key={lesson.id}
                    className={`glass-panel flex flex-col justify-between rounded-3xl p-6 transition hover:-translate-y-0.5 ${
                      isCompleted ? 'border-emerald-400/25' : 'hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/12 text-emerald-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-200">
                            <Sparkles className="h-3 w-3" />
                            +{lesson.maxXp} XP
                          </span>
                        )}
                      </div>

                      <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                        {lesson.category} · {lesson.difficulty}
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold text-white">
                        {lesson.title}
                      </h2>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {lesson.description}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-white/8 pt-4">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Best Score:{' '}
                          <strong className="font-mono text-white">
                            {progress.bestScore ?? 0}/{progress.totalQuestions ?? 3}
                          </strong>
                        </span>
                        <span>
                          XP:{' '}
                          <strong className="font-mono text-emerald-300">
                            {progress.xpAwarded ?? 0}/{lesson.maxXp}
                          </strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openLesson(lesson)}
                        className={`mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                          isCompleted
                            ? 'border border-emerald-400/30 bg-emerald-400/12 text-emerald-200 hover:bg-emerald-400/20'
                            : 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15 hover:bg-emerald-300'
                        }`}
                      >
                        {isCompleted ? 'Review Lesson & Quiz' : 'Start Lesson & Quiz'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <LeaderboardCard
          refreshKey={leaderboardRefreshKey}
          title="MoneyVerse Global Leaderboard"
          subtitle="Top 10 learners ranked by server-verified XP across all lessons."
        />
      )}
    </div>
  );
}
