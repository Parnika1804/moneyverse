import { BarChart3, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR } from '../personal/formatters';

function BusinessChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0b1222]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span style={{ color: item.color }}>{item.name}</span>
            <span className="font-mono font-semibold text-white">{formatINR(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessCharts({ history = [] }) {
  // Directly render backend-returned weekly breakdown metrics (zero client math)
  const cashProfitSeries = history.map((entry) => ({
    label: `W${entry.week}`,
    remainingCash: entry.breakdown?.remainingCash ?? 0,
    profit: entry.breakdown?.profit ?? 0,
  }));

  const revExpSeries = history.map((entry) => ({
    label: `W${entry.week}`,
    revenue: entry.breakdown?.revenue ?? 0,
    expenses: entry.breakdown?.expenses ?? 0,
    marketingCost: entry.breakdown?.marketingCost ?? 0,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Cash Balance & Weekly Profit */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-300" />
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Remaining Cash &amp; Weekly Profit
            </h3>
            <p className="text-xs text-slate-400">Server-verified cash balance and P&amp;L</p>
          </div>
        </div>

        {cashProfitSeries.length === 0 ? (
          <div className="mt-6 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs text-slate-400">
            Submit Week 1 decisions to view your cash flow and profit trajectory.
          </div>
        ) : (
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashProfitSeries} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="bizCashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="bizProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<BusinessChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="remainingCash"
                  name="Remaining Cash"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#bizCashGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Weekly Profit/Loss"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#bizProfitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Revenue vs Expenses */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-indigo-300" />
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Weekly Revenue vs. Expenses
            </h3>
            <p className="text-xs text-slate-400">Sales revenue, total expenses &amp; marketing spend</p>
          </div>
        </div>

        {revExpSeries.length === 0 ? (
          <div className="mt-6 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs text-slate-400">
            Your weekly revenue and expense comparison will populate after Week 1.
          </div>
        ) : (
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revExpSeries} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<BusinessChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Total Expenses" fill="#fb7185" radius={[4, 4, 0, 0]} />
                <Bar dataKey="marketingCost" name="Marketing" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
