import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Coins,
  Compass,
  CreditCard,
  Flame,
  Layers,
  Menu,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchHealth } from '../lib/api';

const SIMULATION_DATA = {
  combined: [
    { month: 'M1', value: 12400, cashflow: 1450 },
    { month: 'M2', value: 16800, cashflow: 2100 },
    { month: 'M3', value: 21900, cashflow: 2850 },
    { month: 'M4', value: 29400, cashflow: 3900 },
    { month: 'M5', value: 38200, cashflow: 4750 },
    { month: 'M6', value: 49650, cashflow: 6120 },
  ],
  life: [
    { month: 'M1', value: 7200, cashflow: 850 },
    { month: 'M2', value: 9400, cashflow: 1120 },
    { month: 'M3', value: 12100, cashflow: 1380 },
    { month: 'M4', value: 15800, cashflow: 1740 },
    { month: 'M5', value: 20100, cashflow: 2050 },
    { month: 'M6', value: 25400, cashflow: 2480 },
  ],
  business: [
    { month: 'M1', value: 5200, cashflow: 600 },
    { month: 'M2', value: 7400, cashflow: 980 },
    { month: 'M3', value: 9800, cashflow: 1470 },
    { month: 'M4', value: 13600, cashflow: 2160 },
    { month: 'M5', value: 18100, cashflow: 2700 },
    { month: 'M6', value: 24250, cashflow: 3640 },
  ],
};

const VIEW_META = {
  combined: {
    label: 'Combined',
    headline: '$49,650',
    delta: '+34.2%',
    metricLabel: 'Simulated Net Worth',
    accent: '#10b981',
    cashflow: '+$6,120/mo',
    score: '782',
    margin: '31.4%',
  },
  life: {
    label: 'Life',
    headline: '$25,400',
    delta: '+26.3%',
    metricLabel: 'Personal Wealth & Savings',
    accent: '#38bdf8',
    cashflow: '+$2,480/mo',
    score: '782',
    margin: '38.0%',
  },
  business: {
    label: 'Business',
    headline: '$24,250',
    delta: '+42.8%',
    metricLabel: 'Business Equity & Cash',
    accent: '#818cf8',
    cashflow: '+$3,640/mo',
    score: 'A-',
    margin: '27.6%',
  },
};

const LIFE_PILLARS = [
  {
    icon: Wallet,
    title: 'Cash Flow & Budgeting',
    description:
      'Allocate income across essentials, goals, and lifestyle while handling unexpected real-world expenses.',
  },
  {
    icon: CreditCard,
    title: 'Credit & Debt Strategy',
    description:
      'Compare APRs, manage utilization, and practice payoff strategies that protect your credit score.',
  },
  {
    icon: PiggyBank,
    title: 'Emergency Reserves & Investing',
    description:
      'Build resilient safety nets and experience compounding returns across index funds and savings tiers.',
  },
];

const BUSINESS_PILLARS = [
  {
    icon: Briefcase,
    title: 'Launch & Unit Economics',
    description:
      'Price products, track gross margins, and balance customer acquisition costs against lifetime value.',
  },
  {
    icon: BarChart3,
    title: 'Runway, P&L & Cash Flow',
    description:
      'Read live income statements and manage working capital so growth never triggers a liquidity crunch.',
  },
  {
    icon: TrendingUp,
    title: 'Reinvestment & Scaling',
    description:
      'Decide when to hire, upgrade operations, set aside taxes, or distribute founder profits.',
  },
];

const JOURNEY_STEPS = [
  {
    step: '01',
    icon: Compass,
    title: 'Step Into a Living Financial World',
    description:
      'Start with a realistic monthly paycheck, recurring obligations, and seed capital to launch your first venture.',
  },
  {
    step: '02',
    icon: Layers,
    title: 'Make Decisions With Real Consequences',
    description:
      'Every choice updates your balance sheet, credit health, business cash flow, and long-term net worth trajectory.',
  },
  {
    step: '03',
    icon: Trophy,
    title: 'Master Habits Through Quests & Feedback',
    description:
      'Earn XP, maintain decision streaks, and unlock AI-powered post-round breakdowns that turn play into lasting skill.',
  },
];

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0b1222]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
        Month {label.replace('M', '')}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">
        ${point.value.toLocaleString()}
      </p>
      <p className="font-mono text-xs text-emerald-400">
        +${point.cashflow.toLocaleString()} net cash flow
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('combined');
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    fetchHealth()
      .then((res) => {
        if (mounted) {
          setApiStatus(res?.status === 'ok' ? 'online' : 'offline');
        }
      })
      .catch(() => {
        if (mounted) setApiStatus('offline');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentMeta = VIEW_META[activeView];
  const chartData = SIMULATION_DATA[activeView];

  return (
    <div className="relative min-h-screen bg-[#060913] text-slate-100">
      {/* Ambient Fintech Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="fintech-grid absolute inset-0 opacity-60" />
        <div className="absolute -top-40 left-1/2 h-[540px] w-[780px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[140px]" />
        <div className="absolute top-[28%] -right-40 h-[460px] w-[520px] rounded-full bg-indigo-500/12 blur-[140px]" />
        <div className="absolute bottom-0 -left-40 h-[400px] w-[480px] rounded-full bg-sky-500/10 blur-[140px]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#060913]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/20">
              <Coins className="h-5 w-5 text-slate-950" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <span className="block font-display text-lg font-extrabold tracking-tight text-white">
                MoneyVerse
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-slate-400 sm:block">
                Life &amp; Business Finance Sim
              </span>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#pillars" className="transition hover:text-white">
              Life &amp; Business
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How It Works
            </a>
            <a href="#platform" className="transition hover:text-white">
              Platform
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-slate-300"
              title="Backend API /api/health status"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : apiStatus === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                }`}
              />
              {apiStatus === 'online'
                ? 'API Online'
                : apiStatus === 'checking'
                  ? 'Connecting...'
                  : 'API Standby'}
            </span>
            <a
              href="#get-started"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#080d1a]/95 px-4 py-4 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-200">
              <a
                href="#pillars"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/5"
              >
                Life &amp; Business
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/5"
              >
                How It Works
              </a>
              <a
                href="#platform"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/5"
              >
                Platform
              </a>
              <a
                href="#get-started"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 font-semibold text-slate-950"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Copy */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Gamified Financial Literacy Platform
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                Learn Money by Managing{' '}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                  Life &amp; Business.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Master personal budgeting, credit, investing, and startup finance inside an
                interactive simulation. Make real-world financial decisions, track live cash flow,
                and build lasting wealth habits with zero real-money risk.
              </p>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <a
                  href="#pillars"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-300"
                >
                  Explore the Simulation
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  See How It Works
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </a>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
                <div>
                  <p className="font-mono text-xl font-semibold text-white sm:text-2xl">2-in-1</p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">Life &amp; Business Engine</p>
                </div>
                <div>
                  <p className="font-mono text-xl font-semibold text-white sm:text-2xl">100%</p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">Risk-Free Sandbox</p>
                </div>
                <div>
                  <p className="font-mono text-xl font-semibold text-white sm:text-2xl">Real-Time</p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">P&amp;L &amp; Net Worth</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Fintech Preview */}
            <div className="lg:col-span-6">
              <div className="glass-panel relative rounded-3xl p-5 sm:p-7">
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      {currentMeta.metricLabel}
                    </p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        {currentMeta.headline}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {currentMeta.delta}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Mode Switcher */}
                  <div className="inline-flex rounded-xl border border-white/10 bg-[#070c18] p-1">
                    {Object.entries(VIEW_META).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveView(key)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          activeView === key
                            ? 'bg-white/12 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recharts Wealth Trajectory */}
                <div className="mt-6 h-56 w-full sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mvAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={currentMeta.accent} stopOpacity={0.38} />
                          <stop offset="95%" stopColor={currentMeta.accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val / 1000}k`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={currentMeta.accent}
                        strokeWidth={2.5}
                        fill="url(#mvAreaGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* KPI Strip */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[11px] font-medium text-slate-400">Net Cash Flow</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-emerald-300 sm:text-base">
                      {currentMeta.cashflow}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[11px] font-medium text-slate-400">
                      {activeView === 'business' ? 'Credit Rating' : 'Credit Score'}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-white sm:text-base">
                      {currentMeta.score}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[11px] font-medium text-slate-400">
                      {activeView === 'life' ? 'Savings Rate' : 'Net Margin'}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-sky-300 sm:text-base">
                      {currentMeta.margin}
                    </p>
                  </div>
                </div>

                {/* Gamified Decision Preview */}
                <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Q2 Capital Allocation Quest
                      </p>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Split $4,200 surplus between emergency reserve &amp; business expansion.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center self-start rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 font-mono text-xs font-semibold text-amber-200 sm:self-center">
                    +250 XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dual Pillars: Life & Business */}
        <section id="pillars" className="border-t border-white/8 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Dual Financial Engine
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Two worlds. One complete money mindset.
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Real financial mastery bridges personal stability and entrepreneurial execution.
                MoneyVerse connects both in one unified simulation.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {/* Manage Life Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
                    <Wallet className="h-3.5 w-3.5" />
                    Personal Finance Track
                  </span>
                  <span className="font-mono text-xs text-slate-400">LIFE MODE</span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold text-white">
                  Manage Your Financial Life
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Navigate career progression, rent vs. buy choices, credit health, and long-term
                  investing with interactive feedback.
                </p>

                <div className="mt-7 space-y-4">
                  {LIFE_PILLARS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex gap-4 rounded-2xl border border-white/6 bg-white/[0.02] p-4 transition hover:border-sky-400/25"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manage Business Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                    <Briefcase className="h-3.5 w-3.5" />
                    Entrepreneurship Track
                  </span>
                  <span className="font-mono text-xs text-slate-400">BUSINESS MODE</span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold text-white">
                  Build &amp; Scale a Business
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Launch ventures from side-hustle to profitable company while mastering pricing,
                  runway, and capital allocation.
                </p>

                <div className="mt-7 space-y-4">
                  {BUSINESS_PILLARS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex gap-4 rounded-2xl border border-white/6 bg-white/[0.02] p-4 transition hover:border-indigo-400/25"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/12 text-indigo-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t border-white/8 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Gameplay Loop
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built like a strategy game. Grounded in real finance.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {JOURNEY_STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="glass-panel relative rounded-3xl p-6 sm:p-7 transition hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-500">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Platform & Upcoming AI Section */}
        <section id="platform" className="border-t border-white/8 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-panel overflow-hidden rounded-3xl p-7 sm:p-10 lg:p-12">
              <div className="grid items-center gap-10 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Cloud-Native Architecture
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Designed for scale, security, and adaptive AI mentorship.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                    MoneyVerse is architected on Firebase Authentication, Cloud Firestore, and
                    Google Cloud Storage — with a modular Gemini AI financial coach coming next to
                    deliver personalized feedback on every life and business move.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
                  {[
                    'Firebase Authentication',
                    'Cloud Firestore Profiles',
                    'Google Cloud Storage',
                    'Gemini AI Coach (Next)',
                  ].map((capability) => (
                    <div
                      key={capability}
                      className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#070c18]/80 px-4 py-3.5 text-sm font-medium text-slate-200"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="get-started" className="pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-[#0d1629] to-indigo-500/15 p-8 text-center sm:p-12 lg:p-16">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ready to build wealth habits before real money is on the line?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
                The MoneyVerse foundation is live. Authentication, interactive life &amp; business
                simulations, and Gemini AI mentorship are up next.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
                >
                  Back to Simulation Preview
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/8 bg-[#050811]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Coins className="h-4 w-4 text-emerald-400" />
            <span className="font-display font-bold text-slate-200">MoneyVerse</span>
            <span className="text-slate-600">•</span>
            <span>Learn Money by Managing Life &amp; Business.</span>
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            API Health: {apiStatus === 'online' ? 'GET /api/health → 200 OK' : apiStatus}
          </p>
        </div>
      </footer>
    </div>
  );
}
