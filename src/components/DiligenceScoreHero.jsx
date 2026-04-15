import { useEffect, useState } from 'react';
import DiligenceScoreGauge from './DiligenceScoreGauge';

const REC_STYLES = {
  PASS: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  WATCH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  FAIL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

export default function DiligenceScoreHero({ companyName, recommendation, diligenceScore }) {
  const [displayScore, setDisplayScore] = useState(0);
  const rec = REC_STYLES[recommendation] ?? REC_STYLES.WATCH;

  useEffect(() => {
    const target = diligenceScore;
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(+(eased * target).toFixed(1));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [diligenceScore]);

  return (
    <div className="bg-blue-50 border border-slate-300 rounded-sm px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">Company Under Review</p>
        <h2 className="text-slate-900 font-bold text-2xl truncate">{companyName || 'Unknown Company'}</h2>
      </div>
      <div className="flex items-center gap-6 flex-shrink-0 flex-wrap sm:flex-nowrap justify-center sm:justify-end">
        <div className="text-center">
          <p className="text-slate-400 text-xs mb-1">Recommendation</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${rec.bg} ${rec.text} ${rec.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rec.dot}`} />
            {recommendation ?? 'WATCH'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-slate-400 text-xs">Diligence Score</p>
          <DiligenceScoreGauge displayScore={displayScore} diligenceScore={diligenceScore} />
        </div>
      </div>
    </div>
  );
}
