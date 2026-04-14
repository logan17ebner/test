import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Flag, TrendingUp, ClipboardList, BarChart3, Upload, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import DashboardNotificationBell from '../components/DashboardNotificationBell';
import DiligenceScoreHero from '../components/DiligenceScoreHero';
import AgentRadarChart from '../components/AgentRadarChart';
import RedFlagsChart from '../components/RedFlagsChart';
import KPITable from '../components/KPITable';
import MissingDataProgress from '../components/MissingDataProgress';
import ComparableCompanies from '../components/ComparableCompanies';
import { useAuth } from '../contexts/AuthContext';
import { getUserFirstName } from '../utils/authUserDisplay';
import { useDocuments } from '../context/DocumentsContext';
import { getApprovedRecord } from '../utils/analysisReviewQueue';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MetricPanel({ title, icon: Icon, children, fullWidth = false }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden${fullWidth ? ' lg:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Icon size={15} className="text-slate-500" />
        <h3 className="text-slate-800 font-semibold text-sm">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };

export default function Dashboard() {
  const { user } = useAuth();
  const { docs } = useDocuments();
  const [approvedRecord, setApprovedRecord] = useState(() => getApprovedRecord());

  useEffect(() => {
    const onUpdate = () => setApprovedRecord(getApprovedRecord());
    window.addEventListener('dd-approved-analysis-updated', onUpdate);
    return () => window.removeEventListener('dd-approved-analysis-updated', onUpdate);
  }, []);

  const firstName = getUserFirstName(user);
  const analysis = approvedRecord?.analysis ?? null;
  const companyName = approvedRecord?.companyName ?? '';
  const errorCount = docs.filter((d) => d.status === 'Error').length;

  return (
    <AppLayout
      title="Dashboard"
      actions={<DashboardNotificationBell errorCount={errorCount} />}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Greeting */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-slate-900 font-bold text-xl tracking-tight">
              Good morning, {firstName}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {analysis ? `Viewing: ${companyName}` : 'No analysis published yet'}
            </p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Upload size={15} />
            Upload
          </Link>
        </div>

        {/* No-analysis CTA */}
        {!analysis && (
          <div className="bg-[#0F172A] border border-slate-700/50 rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
              <BarChart3 size={22} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base mb-1">No analysis available yet</p>
              <p className="text-slate-400 text-sm max-w-sm">Upload your documents, run analysis, and once an administrator approves the output your metrics will appear here.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/documents" className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Upload size={14} /> Upload docs
              </Link>
              <Link to="/analysis" className="inline-flex items-center gap-1.5 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                Run analysis <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Score hero */}
        {analysis && (
          <DiligenceScoreHero
            companyName={companyName}
            recommendation={analysis.recommendation}
            diligenceScore={analysis.diligenceScore}
          />
        )}

        {/* Metrics grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          <motion.div variants={item}>
            <MetricPanel title="Agent Confidence" icon={Activity}>
              <AgentRadarChart confidenceScores={analysis?.confidenceScores ?? {}} />
            </MetricPanel>
          </motion.div>

          <motion.div variants={item}>
            <MetricPanel title="Red Flags" icon={Flag}>
              <RedFlagsChart redFlags={analysis?.redFlags ?? []} />
            </MetricPanel>
          </motion.div>

          <motion.div variants={item}>
            <MetricPanel title="KPI Extraction" icon={TrendingUp}>
              <KPITable kpis={analysis?.kpis ?? []} />
            </MetricPanel>
          </motion.div>

          <motion.div variants={item}>
            <MetricPanel title="Missing Data" icon={ClipboardList}>
              <MissingDataProgress missingData={analysis?.missingData ?? []} />
            </MetricPanel>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2">
            <MetricPanel title="Comparable Companies" icon={BarChart3} fullWidth>
              <ComparableCompanies comparables={analysis?.market?.comparables ?? []} />
            </MetricPanel>
          </motion.div>
        </motion.div>

        {/* Recent documents — compact */}
        {docs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-slate-500" />
                <h3 className="text-slate-800 font-semibold text-sm">Recent Documents</h3>
              </div>
              <Link to="/documents" className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {docs.slice(0, 5).map((doc) => {
                const statusColor = { Ready: 'text-green-500', Processing: 'text-amber-500', Uploading: 'text-blue-500', Error: 'text-red-500' }[doc.status] ?? 'text-slate-400';
                return (
                  <div key={doc.id} className="flex items-center gap-3.5 px-5 py-3">
                    <FileText size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="text-slate-700 text-sm flex-1 truncate">{doc.name}</span>
                    <span className="text-slate-400 text-xs">{timeAgo(doc.uploadedAt)}</span>
                    <span className={`text-xs font-medium ${statusColor}`}>{doc.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
