import { BarChartIcon } from '@radix-ui/react-icons';

const ACCENT_COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444'];

export default function ComparableCompanies({ comparables }) {
  if (!comparables || comparables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-10 h-10 bg-blue-100/40 rounded-sm flex items-center justify-center">
          <BarChartIcon width={18} height={18} className="text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm">Comparable company analysis will appear here once the n8n workflow outputs a <code className="mx-1 px-1.5 py-0.5 bg-blue-100/40 rounded-sm text-slate-600 text-xs">market.comparables</code> array.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {comparables.map((company, i) => (
        <div
          key={i}
          className="border border-slate-300 rounded-sm overflow-hidden bg-blue-50 shadow-sm"
          style={{ borderLeftWidth: 3, borderLeftColor: ACCENT_COLORS[i % ACCENT_COLORS.length] }}
        >
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between gap-2">
            <p className="text-slate-900 font-semibold text-sm truncate">{company.name}</p>
            {company.stage && (
              <span className="text-xs text-slate-500 bg-blue-100/40 px-2 py-0.5 rounded-full flex-shrink-0">{company.stage}</span>
            )}
          </div>
          {company.metrics && (
            <div className="px-4 py-3 space-y-1.5">
              {Object.entries(company.metrics).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-slate-500 text-xs">{k}</span>
                  <span className="font-mono-data text-xs text-slate-800 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
