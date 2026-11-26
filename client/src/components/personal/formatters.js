import {
  Briefcase,
  Gift,
  HeartPulse,
  Home,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return inrFormatter.format(value);
}

export function formatDateTime(isoString) {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const EVENT_META = {
  medical_emergency: {
    label: 'Medical Emergency',
    icon: HeartPulse,
    badgeClass: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    iconWrapClass: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
  },
  inflation: {
    label: 'Inflation Spike',
    icon: TrendingUp,
    badgeClass: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    iconWrapClass: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  },
  rent_increase: {
    label: 'Rent Increase',
    icon: Home,
    badgeClass: 'border-orange-400/30 bg-orange-500/15 text-orange-200',
    iconWrapClass: 'bg-orange-500/15 text-orange-300 border-orange-400/25',
  },
  bonus: {
    label: 'Work Bonus',
    icon: Gift,
    badgeClass: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    iconWrapClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  },
  additional_income: {
    label: 'Additional Income',
    icon: Briefcase,
    badgeClass: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    iconWrapClass: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  },
};

export function getEventMeta(type) {
  return (
    EVENT_META[type] || {
      label: 'Monthly Event',
      icon: Sparkles,
      badgeClass: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
      iconWrapClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/25',
    }
  );
}
