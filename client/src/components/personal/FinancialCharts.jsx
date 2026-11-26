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
import { formatINR } from './formatters';

function BalanceTooltip({ active, payload, label }) {
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

export default function FinancialCharts({ history = [] }) {
  // Map exact backend response values directly without frontend financial recalculation
  const balanceSeries = history.map((entry) => ({
    label: `M${entry.month}`,
    wallet: entry.breakdown?.endingWallet ?? 0,
    savings: entry.breakdown?.endingSavings ?? 0,
    debt: entry.breakdown?.endingDebt ?? 0,
  }));

  const expenseSeries = history.map((entry) => ({
    label: `M${entry.month}`,
    spending: entry.breakdown?.spendingBudget ?? 0,
    eventCost: entry.breakdown?.eventCost ?? 0,
    rentAdjustment: entry.breakdown?.priorRentAdjustmentPaid ?? 0,
    interest: entry.breakdown?.interestAccrued ?? 0,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Wallet, Savings & Debt Trajectory */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Wallet, Savings &amp; Debt
              </h3>
              <p className="text-xs text-slate-400">Backend-verified month-end balances</p>
            </div>
          </div>
        </div>

        {balanceSeries.length === 0 ? (
          <div className="mt-6 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs text-slate-400">
            Submit Month 1 decisions to unlock your live balance trajectory chart.
          </div>
        ) : (
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="pfWalletGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pfSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pfDebtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
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
                <Tooltip content={<BalanceTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="wallet"
                  name="Wallet"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#pfWalletGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  name="Savings"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#pfSavingsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="debt"
                  name="Debt"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#pfDebtGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Monthly Expenses Breakdown */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-amber-300" />
            <div>
              <h3 className="font-display text-base font-bold text-white">Monthly Expenses</h3>
              <p className="text-xs text-slate-400">
                Spending budget, unexpected event costs, rent &amp; interest
              </p>
            </div>
          </div>
        </div>

        {expenseSeries.length === 0 ? (
          <div className="mt-6 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs text-slate-400">
            Your monthly expense breakdown will populate here after Month 1.
          </div>
        ) : (
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<BalanceTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="spending" name="Budget Spend" stackId="exp" fill="#818cf8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="eventCost" name="Event Costs" stackId="exp" fill="#fb7185" />
                <Bar dataKey="rentAdjustment" name="Rent Hike" stackId="exp" fill="#f59e0b" />
                <Bar dataKey="interest" name="Loan Interest" stackId="exp" fill="#e879f9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
