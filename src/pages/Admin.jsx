import { useState, useEffect } from 'react';
import { Webhook, CheckCircle, Save, Eye, EyeOff, ShieldCheck, FileText } from 'lucide-react';
import { useDocuments } from '../context/DocumentsContext';
import { isWorkflowEditorUrl, resolveAnalysisWebhookFetchUrl } from '../utils/analysisWebhook';
import {
  getPendingReviews,
  approvePendingReview,
  rejectPendingReview,
} from '../utils/analysisReviewQueue';

const ADMIN_EMAIL = 'admin@diligenceai.com';
const ADMIN_PASSWORD = 'W9!kQrT4#mLsNz2';

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function formatSubmissionTimestamp(isoString) {
  const date = isoString ? new Date(isoString) : null;
  const isValid = date && !isNaN(date.getTime());
  if (!isValid) return null;
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

function statusBadgeClass(status) {
  if (status === 'success' || status === 'published') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20';
  }
  if (status === 'error' || status === 'rejected') {
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  }
  if (status === 'pending' || status === 'awaiting_review') {
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }
  return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
}

function formatSubmissionStatusLabel(status) {
  const map = {
    success: 'Success',
    published: 'Published',
    error: 'Error',
    rejected: 'Rejected',
    pending: 'Pending',
    awaiting_review: 'Awaiting review',
  };
  return map[status] || status || '—';
}

function AdminWebhookField({ label, description, value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(draft.trim());
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEdit = () => {
    setDraft(value);
    setEditing(true);
    setSaved(false);
  };

  const isValid = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="py-4 border-b border-slate-700/50 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div>
          <p className="text-slate-100 text-sm font-semibold">{label}</p>
          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {saved && <CheckCircle size={14} className="text-green-400" />}
          {!editing ? (
            <button
              type="button"
              onClick={handleEdit}
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors"
            >
              {value ? 'Edit' : 'Add'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={draft.length > 0 && !isValid(draft)}
              className="flex items-center gap-1 text-white bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
            >
              <Save size={11} /> Save
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-2">
          <input
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full bg-[#0F172A] border border-slate-600 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono outline-none"
          />
          {draft.length > 0 && !isValid(draft) && (
            <p className="text-red-400 text-xs mt-1">Enter a valid URL (e.g. https://…)</p>
          )}
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="mt-1.5 text-slate-500 hover:text-slate-400 text-xs flex items-center gap-1"
          >
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
            {show ? 'Hide URL' : 'Show URL'}
          </button>
        </div>
      ) : (
        <div className="mt-2">
          {value ? (
            <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-600 rounded-xl px-3 py-2">
              <Webhook size={13} className="text-blue-400 flex-shrink-0" />
              <span className="text-slate-400 text-xs font-mono truncate">
                {value.replace(/^(https?:\/\/[^/]+).*/, '$1')}/••••••••
              </span>
              <span className="ml-auto bg-green-500/15 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full border border-green-500/25 flex-shrink-0">
                Configured
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 border-dashed rounded-xl px-3 py-2">
              <Webhook size={13} className="text-amber-400 flex-shrink-0" />
              <span className="text-amber-200/90 text-xs">Not configured — optional; documents stay local without it</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const {
    docs,
    uploadWebhookUrl,
    saveUploadWebhook,
    analysisWebhookUrl,
    saveAnalysisWebhook,
  } = useDocuments();

  const [pendingVersion, setPendingVersion] = useState(0);
  useEffect(() => {
    const bump = () => setPendingVersion((v) => v + 1);
    window.addEventListener('dd-pending-analysis-changed', bump);
    return () => window.removeEventListener('dd-pending-analysis-changed', bump);
  }, []);

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-white font-bold text-xl mb-6">Admin Sign In</h1>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            inputMode="email"
            className="w-full bg-[#0F172A] border border-slate-600 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm outline-none mb-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full bg-[#0F172A] border border-slate-600 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm outline-none mb-3"
          />
          {error !== '' && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="button"
            onClick={() => {
              const normalized = normalizeEmail(email);
              if (!normalized.includes('@')) {
                setError('Enter a valid email address');
                return;
              }
              if (normalized === normalizeEmail(ADMIN_EMAIL) && password === ADMIN_PASSWORD) {
                setIsAuthed(true);
                setError('');
              } else {
                setError('Invalid email or password');
              }
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const count = parseInt(localStorage.getItem('diligence_submission_count') || '0', 10);
  const displayCount = isNaN(count) ? 0 : count;

  const lastRaw = localStorage.getItem('diligence_last_submission');
  const lastDate = lastRaw ? new Date(lastRaw) : null;
  const lastValid = lastDate && !isNaN(lastDate.getTime());
  const lastFormatted = lastValid
    ? lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      lastDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  let submissions = [];
  try {
    const raw = localStorage.getItem('diligence_submissions');
    if (raw) submissions = JSON.parse(raw);
    if (!Array.isArray(submissions)) submissions = [];
  } catch {
    submissions = [];
  }
  const displayed = [...submissions].reverse().slice(0, 10);

  const rawEnv = import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? '';
  const envEditorError =
    rawEnv && isWorkflowEditorUrl(rawEnv)
      ? 'This URL looks like an n8n workflow editor link. Use the Webhook node production URL (path contains /webhook/).'
      : '';
  const envFetchOk = !!resolveAnalysisWebhookFetchUrl(rawEnv) && !envEditorError;
  const integrationReady = [envFetchOk, !!uploadWebhookUrl, !!analysisWebhookUrl].filter(Boolean).length;

  void pendingVersion;
  const pendingList = getPendingReviews();

  const errorDocCount = docs.filter((d) => d.status === 'Error').length;
  const workspaceHealth =
    docs.length === 0 ? 100 : Math.max(0, Math.round(100 - (errorDocCount / docs.length) * 100));

  return (
    <div className="min-h-screen bg-[#0F172A] px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-white font-bold text-2xl">DiligenceAI Admin</h1>
            <p className="text-slate-400 text-sm mt-0.5">Site Overview</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAuthed(false);
              setEmail('');
              setPassword('');
            }}
            className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            <p className="text-3xl font-bold text-white mb-1">{displayCount}</p>
            <p className="text-slate-400 text-sm">Total Analyses Submitted</p>
          </div>
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            {lastFormatted ? (
              <p className="text-lg font-semibold text-white mb-1">{lastFormatted}</p>
            ) : (
              <p className="text-slate-500 text-sm mb-1">No submissions yet</p>
            )}
            <p className="text-slate-400 text-sm">Last Submission</p>
          </div>
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            <p className="text-3xl font-bold text-white mb-1">{integrationReady}/3</p>
            <p className="text-slate-400 text-sm">Integrations ready</p>
            <span
              className={`inline-flex mt-2 items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                integrationReady === 3
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              {integrationReady === 3 ? '● All set' : '● Finish setup'}
            </span>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-blue-400" />
            <h2 className="text-white font-semibold text-sm">Workspace health</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-white mb-1">{workspaceHealth}%</p>
              <p className="text-slate-400 text-sm">
                {docs.length === 0
                  ? 'No documents in this workspace yet.'
                  : `${errorDocCount} document${errorDocCount !== 1 ? 's' : ''} with errors of ${docs.length} total.`}
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-500 text-xs">Health bar</span>
                <span
                  className={`text-xs font-semibold ${workspaceHealth >= 80 ? 'text-green-400' : 'text-amber-400'}`}
                >
                  {workspaceHealth}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${workspaceHealth >= 80 ? 'bg-green-400' : 'bg-amber-400'}`}
                  style={{ width: `${workspaceHealth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold text-sm">Pending analysis outputs</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Open each output, verify the memo, then approve to publish it to the user or reject to decline.
            </p>
          </div>
          {pendingList.length === 0 ? (
            <p className="text-slate-500 text-sm px-5 py-8 text-center">No outputs awaiting review.</p>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {pendingList.map((item) => {
                const snippet = (item.analysis?.executiveSummary?.content || '').slice(0, 320);
                const received = formatSubmissionTimestamp(item.receivedAt);
                return (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm">{item.companyName}</p>
                            <p className="text-slate-500 text-xs mt-0.5">
                              Submission {item.submissionId}
                              {received ? ` · ${received}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => approvePendingReview(item.id)}
                            className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                          >
                            Approve &amp; publish
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectPendingReview(item.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <div className="bg-[#0F172A] border border-slate-600 rounded-xl px-3 py-2.5 max-h-40 overflow-y-auto">
                        <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
                          {snippet || 'No executive summary text.'}
                          {(item.analysis?.executiveSummary?.content || '').length > 320 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2.5">
            <Webhook size={18} className="text-slate-400" />
            <div>
              <h2 className="text-white font-semibold text-sm">Webhooks & analysis endpoint</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Upload and optional analysis-trigger URLs are stored in this browser. The run-analysis endpoint is set at build time.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 border-b border-slate-700/50">
            <p className="text-slate-300 text-sm font-semibold mb-1">Run analysis (VITE_N8N_WEBHOOK_URL)</p>
            <p className="text-slate-500 text-xs mb-3">
              Set in <code className="text-slate-400">.env</code> or your host&apos;s environment, then rebuild. Shown read-only here.
            </p>
            {rawEnv ? (
              <>
                {envEditorError && (
                  <p className="text-amber-400 text-xs mb-2 leading-relaxed">{envEditorError}</p>
                )}
                <p className="text-slate-300 text-xs font-mono break-all bg-[#0F172A] border border-slate-600 rounded-xl px-3 py-2">
                  {rawEnv}
                </p>
                <p className={`text-xs mt-2 font-medium ${envFetchOk ? 'text-green-400' : 'text-amber-400'}`}>
                  {envFetchOk ? 'Endpoint resolves for analysis runs' : 'Fix URL or unset until valid'}
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">Not set — analysis runs will be disabled until configured.</p>
            )}
          </div>
          <div className="px-5 py-2">
            <AdminWebhookField
              label="Document upload webhook"
              description="POST multipart/form-data on each confirmed upload (file + metadata)."
              value={uploadWebhookUrl}
              onSave={saveUploadWebhook}
              placeholder="https://your-backend.com/webhooks/upload"
            />
            <AdminWebhookField
              label="Analysis trigger webhook"
              description="Optional JSON POST with document metadata; separate from the run-analysis endpoint above."
              value={analysisWebhookUrl}
              onSave={saveAnalysisWebhook}
              placeholder="https://your-backend.com/webhooks/analyze"
            />
          </div>
        </div>

        <div>
          <h2 className="text-white font-semibold text-base">Recent Submissions</h2>
          {displayed.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No submissions recorded yet.</p>
          ) : (
            <div className="mt-4 bg-[#1E293B] border border-slate-700/50 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0F172A]">
                    <th className="px-5 py-3 text-left text-slate-400 text-xs font-medium">#</th>
                    <th className="px-5 py-3 text-left text-slate-400 text-xs font-medium">File Name</th>
                    <th className="px-5 py-3 text-left text-slate-400 text-xs font-medium">Submitted At</th>
                    <th className="px-5 py-3 text-left text-slate-400 text-xs font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((entry, idx) => {
                    const submittedFormatted = formatSubmissionTimestamp(entry.timestamp);
                    return (
                      <tr key={entry.id ?? idx} className="border-t border-slate-700/50">
                        <td className="px-5 py-3.5 text-slate-500 text-sm">{idx + 1}</td>
                        <td className="px-5 py-3.5 text-slate-200 text-sm">{entry.filename ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-400 text-sm">
                          {submittedFormatted ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex ${statusBadgeClass(
                              entry.status
                            )}`}
                          >
                            {formatSubmissionStatusLabel(entry.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
