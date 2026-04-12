import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const SEV_COLOR = { High: '#EF4444', Medium: '#F59E0B', Low: '#3B82F6' };
const SEV_ORDER = ['High', 'Medium', 'Low'];

export default function RedFlagsChart({ redFlags }) {
  const [expanded, setExpanded] = useState(null);

  if (!redFlags || redFlags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
        <CheckCircle size={28} className="text-green-400" />
        <p className="text-sm">No red flags identified.</p>
      </div>
    );
  }

  const counts = SEV_ORDER.map((s) => ({ severity: s, count: redFlags.filter((f) => f.severity === s).length }));
  const topFlags = [...redFlags].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)).slice(0, 5);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={counts} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="severity" tick={{ fill: '#64748B', fontSize: 12 }} width={52} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(v) => [v, 'Flags']} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {counts.map((entry, i) => (
              <Cell key={i} fill={SEV_COLOR[entry.severity]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-1.5">
        {topFlags.map((flag) => (
          <div key={flag.id} className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === flag.id ? null : flag.id)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors"
            >
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: `${SEV_COLOR[flag.severity]}18`, color: SEV_COLOR[flag.severity] }}
              >
                {flag.severity}
              </span>
              <span className="text-slate-700 text-xs font-medium flex-1 truncate">{flag.title}</span>
              {expanded === flag.id ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
            </button>
            {expanded === flag.id && flag.description && (
              <div className="px-3.5 pb-3 pt-0">
                <p className="text-slate-500 text-xs leading-relaxed">{flag.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
