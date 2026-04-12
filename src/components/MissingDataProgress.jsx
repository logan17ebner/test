import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const PRI_STYLE = {
  High: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};
const PRI_ORDER = ['High', 'Medium', 'Low'];

export default function MissingDataProgress({ missingData }) {
  const [localChecked, setLocalChecked] = useState({});

  if (!missingData || missingData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
        <CheckCircle size={28} className="text-green-400" />
        <p className="text-sm">All required data present.</p>
      </div>
    );
  }

  const isChecked = (item) => localChecked[item.id] ?? item.checked;
  const checkedCount = missingData.filter((m) => isChecked(m)).length;
  const total = missingData.length;
  const pct = Math.round((checkedCount / total) * 100);

  const R = 32;
  const circ = 2 * Math.PI * R;
  const dash = circ - (pct / 100) * circ;

  const sorted = [...missingData].sort(
    (a, b) => PRI_ORDER.indexOf(a.priority) - PRI_ORDER.indexOf(b.priority)
  );

  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={R} fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={R} fill="none"
            stroke="#3B82F6" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0F172A" fontFamily="DM Mono, monospace">
            {pct}%
          </text>
        </svg>
        <p className="text-slate-400 text-xs text-center">{checkedCount}/{total} resolved</p>
      </div>

      <div className="flex-1 min-w-0 max-h-52 overflow-y-auto space-y-1.5 pr-1">
        {sorted.map((item) => {
          const checked = isChecked(item);
          const p = PRI_STYLE[item.priority] ?? PRI_STYLE.Medium;
          return (
            <label key={item.id} className="flex items-start gap-2.5 cursor-pointer group">
              <div
                onClick={() => setLocalChecked((prev) => ({ ...prev, [item.id]: !checked }))}
                className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-blue-400'
                }`}
              >
                {checked && <CheckCircle size={9} className="text-white" />}
              </div>
              <span className={`text-xs leading-relaxed flex-1 ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item.item}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex-shrink-0 mt-0.5 ${p.bg} ${p.text} ${p.border}`}>
                {item.priority}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
