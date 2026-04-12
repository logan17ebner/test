import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

export default function AgentRadarChart({ confidenceScores }) {
  const entries = Object.entries(confidenceScores ?? {});
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm text-center px-4">
        Agent confidence data will appear here after analysis runs.
      </div>
    );
  }

  const data = entries.map(([agent, score]) => ({
    subject: agent.replace(/ Agent$/i, '').trim(),
    A: Math.round(Number(score)),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart outerRadius={85} data={data}>
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 9 }} />
        <Radar name="Confidence" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.12} strokeWidth={2} />
        <Tooltip formatter={(v) => [`${v}%`, 'Confidence']} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
