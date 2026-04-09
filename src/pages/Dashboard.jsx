import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  Upload,
  Zap,
  ArrowRight,
  TrendingUp,
  Activity,
  Settings,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DashboardNotificationBell from '../components/DashboardNotificationBell';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../context/DocumentsContext';
import { mockWorkspace } from '../data/mockData';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { docs } = useDocuments();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const readyCount = docs.filter((d) => d.status === 'Ready' || d.status === 'Processing').length;
  const errorCount = docs.filter((d) => d.status === 'Error').length;
  const lastDoc = docs[0];

  const overviewCards = [
    {
      label: 'Documents',
      value: docs.length,
      sub: docs.length === 0
        ? 'No documents yet'
        : `${readyCount} active · ${errorCount} error${errorCount !== 1 ? 's' : ''}`,
      icon: FileText,
      color: 'blue',
      to: '/documents',
    },
    {
      label: 'Last Upload',
      value: lastDoc ? timeAgo(lastDoc.uploadedAt) : '—',
      sub: lastDoc ? lastDoc.name : 'No uploads yet',
      icon: Clock,
      color: 'purple',
      to: '/documents',
    },
  ];

  const colorMap = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: 'text-blue-400',   value: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-400', value: 'text-purple-500' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: 'text-amber-400',  value: 'text-amber-500' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: 'text-green-400',  value: 'text-green-500' },
  };

  return (
    <AppLayout
      title="Dashboard"
      actions={<DashboardNotificationBell errorCount={errorCount} />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-slate-900 font-bold text-xl sm:text-2xl tracking-tight">
              Good morning, {firstName}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">{mockWorkspace.name}</p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Upload size={15} />
            Upload Document
          </Link>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
          {overviewCards.map(({ label, value, sub, icon: Icon, color, to }) => {
            const c = colorMap[color];
            return (
              <Link
                key={label}
                to={to}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                  <Icon size={17} className={c.icon} />
                </div>
                <p className={`text-2xl font-bold ${c.value} mb-0.5`}>{value}</p>
                <p className="text-slate-700 text-sm font-medium leading-tight">{label}</p>
                <p className="text-slate-400 text-xs mt-1 leading-tight truncate">{sub}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent documents */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-slate-500" />
                <h3 className="text-slate-800 font-semibold text-sm">Recent Documents</h3>
              </div>
              <Link to="/documents" className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <FileText size={18} className="text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">No documents uploaded yet</p>
                <p className="text-slate-400 text-xs">
                  Upload your first document to get started.
                </p>
                <Link
                  to="/documents"
                  className="mt-4 inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  <Upload size={13} /> Upload a document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {docs.slice(0, 8).map((doc) => {
                  const statusColor = {
                    Ready: 'text-green-500',
                    Processing: 'text-amber-500',
                    Uploading: 'text-blue-500',
                    Error: 'text-red-500',
                  }[doc.status] ?? 'text-slate-400';
                  return (
                    <div key={doc.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={13} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-slate-400 text-xs">{timeAgo(doc.uploadedAt)}</p>
                      </div>
                      <span className={`text-xs font-medium ${statusColor} flex-shrink-0`}>
                        {doc.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions + workspace panel */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-slate-800 font-semibold text-sm">Quick Actions</h3>
              </div>
              <div className="p-3 space-y-1.5">
                <Link to="/documents" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Upload size={13} className="text-blue-500" />
                  </div>
                  <span className="text-slate-700 text-sm font-medium">Upload document</span>
                  <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-slate-400" />
                </Link>
                <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-7 h-7 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Settings size={13} className="text-purple-500" />
                  </div>
                  <span className="text-slate-700 text-sm font-medium">Settings</span>
                  <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-slate-400" />
                </Link>
                <Link to="/analysis" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-7 h-7 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Zap size={13} className="text-green-500" />
                  </div>
                  <span className="text-slate-700 text-sm font-medium">Run analysis</span>
                  <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Workspace info */}
            <div className="bg-[#0F172A] border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-blue-400" />
                <h3 className="text-slate-200 font-semibold text-sm">Workspace</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Plan</span>
                  <span className="text-slate-300 text-xs font-medium bg-blue-500/15 border border-blue-500/20 rounded-full px-2 py-0.5">
                    {mockWorkspace.plan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Documents</span>
                  <span className="text-slate-300 text-xs font-medium">{docs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Retention</span>
                  <span className="text-slate-300 text-xs font-medium">{mockWorkspace.retentionDays} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
