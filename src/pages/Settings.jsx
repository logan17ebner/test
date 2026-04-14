import { useState } from 'react';
import {
  User,
  Building2,
  Shield,
  Trash2,
  AlertTriangle,
  X,
  Database,
  Clock,
  FileText,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { getUserDisplayName } from '../utils/authUserDisplay';
import { useDocuments } from '../context/DocumentsContext';
import { mockWorkspace } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

function ConfirmDialog({ title, message, confirmLabel, confirmClass, onConfirm, onCancel, requireTyped }) {
  const [typed, setTyped] = useState('');
  const isReady = requireTyped ? typed === requireTyped : true;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={14} className="text-red-500" />
            </div>
            <h2 className="text-slate-900 font-semibold text-base">{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">{message}</p>
          {requireTyped && (
            <div>
              <p className="text-slate-500 text-xs mb-2">
                Type <span className="font-mono font-semibold text-slate-700">"{requireTyped}"</span> to confirm
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireTyped}
                className="w-full border border-slate-200 focus:border-red-400 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:ring-2 focus:ring-red-400/20"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => isReady && onConfirm()}
            disabled={!isReady}
            className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition-colors ${confirmClass} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, description, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-slate-500" />
          <div>
            <h3 className="text-slate-800 font-semibold text-sm">{title}</h3>
            {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
      <p className="text-slate-500 text-xs mt-0.5 w-32 flex-shrink-0">{label}</p>
      <p className="text-slate-800 text-sm font-medium text-right">{value}</p>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { docs, clearAllDocuments } = useDocuments();

  const [showClearDocs, setShowClearDocs] = useState(false);
  const [showDeleteWorkspace, setShowDeleteWorkspace] = useState(false);

  const handleDeleteWorkspace = async () => {
    clearAllDocuments();
    await signOut();
    navigate('/');
  };

  const retentionDate = new Date(
    new Date(mockWorkspace.createdAt).getTime() + mockWorkspace.retentionDays * 24 * 3600 * 1000
  ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Workspace */}
        <Section title="Workspace" icon={Building2}>
          <InfoField label="Name" value={mockWorkspace.name} />
          <InfoField label="Plan" value={mockWorkspace.plan} />
          <InfoField label="Documents" value={docs.length} />
          <InfoField
            label="Created"
            value={new Date(mockWorkspace.createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          />
        </Section>

        {/* Account */}
        <Section title="Account" icon={User}>
          <InfoField label="Name" value={getUserDisplayName(user) || '—'} />
          <InfoField label="Email" value={user?.email || ''} />
          <InfoField label="Role" value={user?.role ?? 'Member'} />
        </Section>

        {/* Data retention */}
        <Section title="Data & Retention" icon={Shield}>
          <div className="space-y-3.5">
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-500 text-sm leading-relaxed">
                Documents are retained for <strong className="text-slate-700">{mockWorkspace.retentionDays} days</strong>.
                Scheduled purge: <strong className="text-slate-700">{retentionDate}</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Database size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-500 text-sm leading-relaxed">
                Files are encrypted at rest (AES-256) and in transit (TLS 1.3). Documents are <strong className="text-slate-700">never used to train AI models</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <FileText size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-500 text-sm leading-relaxed">
                All document access and analysis runs are logged for 90 days and exportable on request.
              </p>
            </div>
          </div>
        </Section>

        {/* Danger zone */}
        <div className="bg-white border border-red-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-100 bg-red-50/50">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-red-800 font-semibold text-sm">Danger Zone</h3>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-slate-800 text-sm font-semibold mb-0.5">Clear all documents</p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Remove all {docs.length} document record{docs.length !== 1 ? 's' : ''} from this workspace. Cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowClearDocs(true)}
                disabled={docs.length === 0}
                className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium px-3.5 py-2 rounded-xl transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-800 text-sm font-semibold mb-0.5">Delete workspace</p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Permanently delete this workspace, all documents, and all configuration. Irreversible.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteWorkspace(true)}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {showClearDocs && (
        <ConfirmDialog
          title="Clear all documents"
          message={`This will permanently remove all ${docs.length} document records from this workspace. Your backend data is unaffected.`}
          confirmLabel="Clear all"
          confirmClass="bg-red-500 hover:bg-red-600 text-white"
          onConfirm={() => { clearAllDocuments(); setShowClearDocs(false); }}
          onCancel={() => setShowClearDocs(false)}
        />
      )}

      {showDeleteWorkspace && (
        <ConfirmDialog
          title="Delete workspace"
          message="This will delete your workspace, sign you out, and clear all local data. This action is completely irreversible."
          confirmLabel="Delete workspace"
          confirmClass="bg-red-500 hover:bg-red-600 text-white"
          requireTyped="delete workspace"
          onConfirm={handleDeleteWorkspace}
          onCancel={() => setShowDeleteWorkspace(false)}
        />
      )}
    </AppLayout>
  );
}
