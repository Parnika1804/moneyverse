import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Bot, Briefcase, Sparkles, Wallet } from 'lucide-react';

const MODULE_META = {
  'personal-finance': {
    title: 'Personal Finance',
    subtitle: 'Budgeting, Emergency Funds, Credit & Investing',
    description:
      'Interactive personal finance scenarios and virtual wallet budgeting tools will be added in the next phase.',
    icon: Wallet,
    badge: 'Coming Next',
  },
  'business-simulation': {
    title: 'Business Simulation',
    subtitle: 'Entrepreneurship, Unit Economics & Cash Flow',
    description:
      'Launch and scale virtual businesses, track P&L statements, and manage working capital in the upcoming simulation module.',
    icon: Briefcase,
    badge: 'Coming Next',
  },
  'learning-hub': {
    title: 'Learning Hub',
    subtitle: 'Structured Financial Literacy Quests',
    description:
      'Bite-sized financial literacy modules, quizzes, and XP-earning challenges are planned for the next milestone.',
    icon: BookOpen,
    badge: 'Coming Next',
  },
  'ai-mentor': {
    title: 'AI Mentor',
    subtitle: 'Personalized Coaching Powered by Gemini AI',
    description:
      'Contextual financial guidance and decision breakdowns powered by Gemini AI will be integrated here.',
    icon: Bot,
    badge: 'Planned Integration',
  },
};

export default function ModulePlaceholderPage({ moduleKey }) {
  const meta = MODULE_META[moduleKey] || MODULE_META['personal-finance'];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass-panel rounded-3xl p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          {meta.badge}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-emerald-300">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">{meta.title}</h1>
            <p className="text-sm text-slate-400">{meta.subtitle}</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-slate-300">{meta.description}</p>

        <div className="mt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
