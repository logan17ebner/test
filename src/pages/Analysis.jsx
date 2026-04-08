import { useState } from 'react';
import {
  Zap,
  BarChart3,
  Webhook,
  AlertTriangle,
  CheckCircle,
  X,
  ExternalLink,
  FileText,
  AlertCircle,
  Flag,
  ClipboardList,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDocuments } from '../context/DocumentsContext';
import { Link } from 'react-router-dom';
import { mapAuditToAnalysis } from '../utils/mapAuditToAnalysis';

// Fallback mock analysis — shown when no live run has completed yet.
// Replaced by liveAnalysis once a successful run returns data.
const mockAnalysis = {
  executiveSummary: {
    content:
      'No analysis has been run yet. Upload documents, enter a company name, and click Run Analysis to get started.',
    confidence: 0,
    citations: [],
  },
  kpis: [],
  market: {
    bullets: [],
    confidence: 0,
  },
  redFlags: [],
  missingData: [],
};

function WebhookResultBanner({ result, onDismiss }) {
  if (!result) return null;
  const ok = result.success;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
        ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      {ok ? (
        <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>
          {ok ? 'Analysis completed successfully' : 'Analysis failed'}
        </p>
        <p className={`text-xs mt-0.5 ${ok ? 'text-green-600' : 'text-red-600'}`}>
          {ok
            ? `Webhook responded with HTTP ${result.status}`
            : result.error ?? `HTTP ${result.status}`}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function Analysis() {
  const { docs } = useDocuments();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [envError, setEnvError] = useState('');

  // Read the n8n webhook URL from the environment at runtime
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  const eligibleDocs = docs.filter((d) => d.status === 'Ready');
  const hasDocuments = docs.length > 0;
  const hasWebhook = !!webhookUrl;

  const runAnalysis = async () => {
    // Runtime guard — show an inline error if the env var is missing
    if (!webhookUrl) {
      setEnvError(
        'VITE_N8N_WEBHOOK_URL is not set. Add it to your .env file and restart the dev server.'
      );
      return;
    }

    setEnvError('');
    setLoading(true);
    setLastResult(null);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          companyName: companyName.trim() || 'Unknown Company',
          companyId: `run-${Date.now()}`,
          documents: docs
            .filter((d) => d.status === 'Ready')
            .map((d) => ({
              type: d.type,
              content: d.content || `[No content extracted for ${d.name}]`,
            })),
        }),
      });

      if (res.ok) {
        const text = await res.text();
        let raw;
        try {
          raw = JSON.parse(text);
        } catch {
          // n8n returned plain markdown — treat as string
          raw = text;
        }
        const mapped = mapAuditToAnalysis(raw);
        setLiveAnalysis(mapped);
        setLastResult({ success: true, status: res.status });
      } else {
        setLastResult({ success: false, status: res.status });
      }
    } catch (err) {
      setLastResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // All result JSX uses liveAnalysis ?? mockAnalysis so live data displays when
  // available and mock data shows as a fallback
  const analysis = liveAnalysis ?? mockAnalysis;

  return (
    <AppLayout title="Analysis">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ENV error banner */}
        {envError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm flex-1">{envError}</p>
            <button
              onClick={() => setEnvError('')}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Run panel */}
        <div className="bg-[#0F172A] border border-slate-700/50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg mb-1">Trigger Analysis</h2>
              <p className="text-slate-400 text-sm leading-snug">
                {eligibleDocs.length > 0
                  ? `${eligibleDocs.length} document${eligibleDocs.length !== 1 ? 's' : ''} ready to analyze`
                  : hasDocuments
                  ? 'No documents in a Ready state'
                  : 'No documents uploaded yet'}
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={loading || !hasWebhook || eligibleDocs.length === 0}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20 flex-shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Run Analysis
                </>
              )}
            </button>
          </div>

          {/* Company name input */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Company name (e.g. Acme Corp)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Webhook indicator */}
          <div
            className={`mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 border text-xs ${
              hasWebhook
                ? 'bg-slate-800 border-slate-600'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            <Webhook size={13} className={hasWebhook ? 'text-slate-400' : 'text-amber-400'} />
            {hasWebhook ? (
              <>
                <span className="text-slate-400">POST to</span>
                <span className="font-mono text-slate-300 truncate">{webhookUrl}</span>
              </>
            ) : (
              <span className="text-amber-400">
                VITE_N8N_WEBHOOK_URL is not set —{' '}
                <span className="font-mono">add it to your .env file</span>
              </span>
            )}
          </div>

          {/* Result banner */}
          {lastResult && (
            <div className="mt-4">
              <WebhookResultBanner
                result={lastResult}
                onDismiss={() => setLastResult(null)}
              />
            </div>
          )}

          {/* Payload preview */}
          {hasWebhook && (
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-slate-800 font-semibold text-sm">Webhook Payload Preview</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  This JSON is sent to your analysis webhook on each run.
                </p>
              </div>
              <div className="px-5 py-4">
                <pre className="bg-slate-950 text-green-400 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed font-mono scrollbar-thin">
{JSON.stringify(
  {
    companyName: companyName.trim() || 'Unknown Company',
    companyId: `run-${Date.now()}`,
    documents: eligibleDocs.map(({ type, name }) => ({
      type,
      content: `[content for ${name}]`,
    })),
  },
  null,
  2
)}
                </pre>
              </div>
            </div>
          )}

          {/* Document checklist */}
          <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-slate-800 font-semibold text-sm">Documents in Workspace</h3>
              <Link
                to="/documents"
                className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1"
              >
                Manage <ExternalLink size={11} />
              </Link>
            </div>

            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <BarChart3 size={18} className="text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">No documents uploaded</p>
                <p className="text-slate-400 text-xs max-w-xs">
                  Upload documents first, then trigger analysis to send them to your backend.
                </p>
                <Link
                  to="/documents"
                  className="mt-4 inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Go to Documents
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {docs.map((doc) => {
                  const eligible = doc.status === 'Ready';
                  const statusColor =
                    {
                      Ready: 'text-green-500 bg-green-50 border-green-100',
                      Processing: 'text-amber-600 bg-amber-50 border-amber-100',
                      Uploading: 'text-blue-500 bg-blue-50 border-blue-100',
                      Error: 'text-red-500 bg-red-50 border-red-100',
                    }[doc.status] ?? '';
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3.5 px-5 py-3.5 ${
                        !eligible ? 'opacity-40' : ''
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          eligible ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                        }`}
                      >
                        {eligible && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <span className="text-slate-700 text-sm flex-1 truncate">{doc.name}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
            <p className="text-blue-700 text-sm leading-relaxed">
              <span className="font-semibold">How it works:</span> Clicking "Run Analysis" sends
              document content to your n8n webhook. The workflow runs AI due diligence and returns
              a memo. Results appear below. Set{' '}
              <code className="text-xs bg-blue-100 px-1 py-0.5 rounded font-mono">
                VITE_N8N_WEBHOOK_URL
              </code>{' '}
              in your{' '}
              <code className="text-xs bg-blue-100 px-1 py-0.5 rounded font-mono">.env</code>{' '}
              file.
            </p>
          </div>
        </div>

        {/* ── Analysis Results ─────────────────────────────────────────────── */}

        {/* Executive Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-500" />
              <h3 className="text-slate-800 font-semibold text-sm">Executive Summary</h3>
            </div>
            {(liveAnalysis ?? mockAnalysis).executiveSummary.confidence > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Confidence: {(liveAnalysis ?? mockAnalysis).executiveSummary.confidence}%
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {analysis.executiveSummary.content || 'No summary available.'}
            </p>
          </div>
        </div>

        {/* Red Flags — only rendered when there are findings */}
        {(liveAnalysis ?? mockAnalysis).redFlags.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <Flag size={15} className="text-red-500" />
              <h3 className="text-slate-800 font-semibold text-sm">
                Red Flags{' '}
                <span className="text-slate-400 font-normal text-xs">
                  ({analysis.redFlags.length})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {analysis.redFlags.map((flag) => (
                <div key={flag.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${
                        flag.severity === 'High'
                          ? 'text-red-600 bg-red-50 border-red-100'
                          : flag.severity === 'Low'
                          ? 'text-blue-600 bg-blue-50 border-blue-100'
                          : 'text-amber-600 bg-amber-50 border-amber-100'
                      }`}
                    >
                      {flag.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="text-slate-800 font-medium text-sm">{flag.title}</p>
                      {flag.description && (
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                          {flag.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Data — only rendered when there are flags */}
        {(liveAnalysis ?? mockAnalysis).missingData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <ClipboardList size={15} className="text-amber-500" />
              <h3 className="text-slate-800 font-semibold text-sm">
                Missing Data{' '}
                <span className="text-slate-400 font-normal text-xs">
                  ({analysis.missingData.length})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {analysis.missingData.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      item.checked ? 'bg-green-500 border-green-500' : 'border-slate-300'
                    }`}
                  >
                    {item.checked && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <span
                    className={`text-sm flex-1 ${
                      item.checked ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    {item.item}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      item.priority === 'High'
                        ? 'text-red-600 bg-red-50 border-red-100'
                        : item.priority === 'Low'
                        ? 'text-blue-600 bg-blue-50 border-blue-100'
                        : 'text-amber-600 bg-amber-50 border-amber-100'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
