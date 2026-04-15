import AreaChart from './charts/AreaChart.jsx';

function formatMoneyCompact(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  const abs = Math.abs(x);
  if (abs >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(x / 1e3).toFixed(0)}K`;
  return `$${x.toFixed(0)}`;
}

export default function BurnRunwayChart({ financials }) {
  const burnHistory = financials?.burnHistory ?? [];
  const runwayMonths = Number(financials?.runwayMonths ?? 0);
  const chartData = burnHistory.map((row) => ({
    month: row.month ?? row.period ?? '—',
    burn: Number(row.burn ?? row.monthlyBurn ?? 0),
    cashBalance: Number(row.cashBalance ?? row.cash ?? 0),
  }));

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const hasSeries = chartData.some((r) => r.burn > 0 || r.cashBalance > 0);
  const hasRunway = runwayMonths > 0;

  if (!hasSeries && !hasRunway) {
    return (
      <div className="flex items-center justify-center min-h-[220px] text-slate-400 text-sm text-center px-4">
        Burn and runway data will appear once financials are extracted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-100/40 border border-slate-300 rounded-sm px-4 py-3 shadow-sm">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Runway</p>
          <p className="font-mono-data text-2xl font-bold text-slate-900 leading-tight">
            {runwayMonths > 0 ? `${runwayMonths}` : '—'}
            {runwayMonths > 0 && <span className="text-slate-500 text-sm font-semibold ml-1">mo</span>}
          </p>
        </div>
        <div className="bg-blue-100/40 border border-slate-300 rounded-sm px-4 py-3 shadow-sm">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Monthly Burn</p>
          <p className="font-mono-data text-2xl font-bold text-slate-900 leading-tight">
            {latest && latest.burn > 0 ? formatMoneyCompact(latest.burn) : '—'}
          </p>
        </div>
      </div>
      {hasSeries ? (
        <AreaChart
          data={chartData}
          index="month"
          categories={['burn', 'cashBalance']}
          colors={['#EF4444', '#3B82F6']}
          height={240}
          valueFormatter={formatMoneyCompact}
          yAxisWidth={56}
          showLegend
        />
      ) : (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm text-center px-4 border border-dashed border-slate-300 rounded-sm">
          Monthly burn and cash balance series will chart here once <span className="font-mono-data text-xs mx-1">financials.burnHistory</span> is present.
        </div>
      )}
    </div>
  );
}
