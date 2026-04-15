import BarChart from './charts/BarChart.jsx';

export default function AgentConfidenceBars({ confidenceScores }) {
  const entries = Object.entries(confidenceScores ?? {}).filter(([, v]) => v != null && !Number.isNaN(Number(v)));

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-400 text-sm text-center px-4">
        Agent-level confidence bars will populate when the workflow returns a <span className="font-mono-data text-xs">confidence_scores</span> object.
      </div>
    );
  }

  const data = entries.map(([agent, score]) => ({
    name: agent.replace(/ Agent$/i, '').trim() || agent,
    value: Math.min(100, Math.max(0, Math.round(Number(score) <= 10 ? Number(score) * 10 : Number(score)))),
  }));

  const avg = data.reduce((s, r) => s + r.value, 0) / data.length;

  return (
    <div className="space-y-3">
      <BarChart
        data={data}
        index="name"
        categories={['value']}
        layout="horizontal"
        height={Math.max(200, 48 + data.length * 36)}
        valueFormatter={(v) => `${v}%`}
        yAxisWidth={100}
        showGridLines
      />
      <p className="text-xs text-slate-500 border-t border-slate-300 pt-3">
        Average across agents:{' '}
        <span className="font-mono-data text-slate-800 font-semibold">{avg.toFixed(0)}%</span>
      </p>
    </div>
  );
}
