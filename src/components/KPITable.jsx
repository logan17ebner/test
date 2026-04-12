import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

function ConfidencePill({ score }) {
  const cfg =
    score >= 70 ? { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' } :
    score >= 40 ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' } :
                  { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  return (
    <span className={`inline-block font-mono-data text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {score}%
    </span>
  );
}

export default function KPITable({ kpis }) {
  const [sortKey, setSortKey] = useState('metric');
  const [sortDir, setSortDir] = useState('asc');

  if (!kpis || kpis.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm text-center px-4">
        KPI data will appear here after analysis runs. Ensure your n8n workflow outputs a <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-xs">kpis</code> or <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-xs">metrics</code> array.
      </div>
    );
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...kpis].sort((a, b) => {
    const av = sortKey === 'confidenceScore' ? Number(a[sortKey]) : String(a[sortKey]).toLowerCase();
    const bv = sortKey === 'confidenceScore' ? Number(b[sortKey]) : String(b[sortKey]).toLowerCase();
    return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
  });

  const SortIcon = ({ k }) => sortKey !== k ? null : sortDir === 'asc'
    ? <ChevronUp size={12} className="text-blue-500 inline ml-0.5" />
    : <ChevronDown size={12} className="text-blue-500 inline ml-0.5" />;

  const cols = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
    { key: 'confidenceScore', label: 'Confidence' },
  ];

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {cols.map((c) => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className="text-left py-2.5 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
              >
                {c.label}<SortIcon k={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((kpi) => (
            <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 pr-4 text-slate-700 font-medium">{kpi.metric}</td>
              <td className="py-2.5 pr-4 font-mono-data text-slate-800">{kpi.value}</td>
              <td className="py-2.5"><ConfidencePill score={kpi.confidenceScore} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
