import {
  CloudRain,
  Coffee,
  Croissant,
  Flame,
  Shirt,
  Sparkles,
  Tag,
  TrendingUp,
  Wrench,
} from 'lucide-react';

export const BUSINESS_CHOICES = [
  {
    key: 'cafe',
    name: 'Café',
    tagline: 'High-volume coffee & snacks',
    description:
      'Steady daily footfall with affordable wholesale ingredients and brisk inventory turnover.',
    icon: Coffee,
    unitCostLabel: '₹80 / unit',
    priceRangeLabel: '₹80 – ₹500',
    recommendedPrice: '180',
    defaultRestock: '80',
    fixedCostLabel: '₹4,500 / wk',
    accentBorder: 'border-amber-400/35 bg-amber-400/10',
    iconClass: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
  },
  {
    key: 'bakery',
    name: 'Bakery',
    tagline: 'Artisanal breads, cakes & pastries',
    description:
      'Balanced unit margins, moderate fixed overhead, and strong demand surges during festivals.',
    icon: Croissant,
    unitCostLabel: '₹120 / unit',
    priceRangeLabel: '₹120 – ₹700',
    recommendedPrice: '260',
    defaultRestock: '65',
    fixedCostLabel: '₹4,000 / wk',
    accentBorder: 'border-emerald-400/35 bg-emerald-400/10',
    iconClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
  },
  {
    key: 'clothing_store',
    name: 'Clothing Store',
    tagline: 'Boutique apparel & fashion retail',
    description:
      'Higher per-unit margins requiring disciplined working capital and smart pricing strategy.',
    icon: Shirt,
    unitCostLabel: '₹450 / unit',
    priceRangeLabel: '₹450 – ₹2,500',
    recommendedPrice: '950',
    defaultRestock: '30',
    fixedCostLabel: '₹5,500 / wk',
    accentBorder: 'border-indigo-400/35 bg-indigo-400/10',
    iconClass: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/25',
  },
];

export function getBusinessChoice(key) {
  return BUSINESS_CHOICES.find((item) => item.key === key) || BUSINESS_CHOICES[0];
}

export const BUSINESS_EVENT_META = {
  supplier_price_increase: {
    label: 'Supplier Price Increase',
    icon: TrendingUp,
    badgeClass: 'border-orange-400/30 bg-orange-500/15 text-orange-200',
    iconWrapClass: 'border-orange-400/25 bg-orange-500/15 text-orange-300',
  },
  festival_demand: {
    label: 'Festival Demand Surge',
    icon: Flame,
    badgeClass: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    iconWrapClass: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-300',
  },
  equipment_breakdown: {
    label: 'Equipment Breakdown',
    icon: Wrench,
    badgeClass: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    iconWrapClass: 'border-rose-400/25 bg-rose-500/15 text-rose-300',
  },
  unexpected_discount: {
    label: 'Supplier Discount',
    icon: Tag,
    badgeClass: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    iconWrapClass: 'border-sky-400/25 bg-sky-500/15 text-sky-300',
  },
  reduced_demand: {
    label: 'Reduced Demand',
    icon: CloudRain,
    badgeClass: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    iconWrapClass: 'border-amber-400/25 bg-amber-500/15 text-amber-300',
  },
  steady_week: {
    label: 'Steady Market',
    icon: Sparkles,
    badgeClass: 'border-slate-400/30 bg-slate-500/15 text-slate-200',
    iconWrapClass: 'border-slate-400/25 bg-slate-500/15 text-slate-300',
  },
};

export function getBusinessEventMeta(type) {
  return BUSINESS_EVENT_META[type] || BUSINESS_EVENT_META.steady_week;
}
