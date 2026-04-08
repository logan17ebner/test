import { useState } from 'react';
import {
  Zap,
  BarChart3,
  Webhook,
  AlertTriangle,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDocuments } from '../context/DocumentsContext';
import { Link } from 'react-router-dom';

function WebhookResultBanner({ result, onDismiss }) {
  if (!result) return null;
  const ok = result.success;
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
      ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      {ok
        ? <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
        : <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>
          {ok ? 'Analysis triggered successfully' : 'Webhook delivery failed'}
        </p>
        <p className={`text-xs mt-0.5 ${ok ? 'text-green-600' : 'text-red-600'}`}>
          {ok
            ? `Webhook responded with HTTP ${result.status}. Your backend is now processing the documents.`
            : result.error ?? `HTTP ${result.status}`}
        </p>
      </div>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export default function Analysis() {
  const { docs, triggerAnalysis, analysisWebhookUrl } = useDocuments();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const eligibleDocs = docs.filter(
    (d) => d.status === 'Processing' || d.status === 'Ready'
  );

  const handleRunAnalysis = async () => {
    setLoading(true);
    setLastResult(null);
    const result = await triggerAnalysis();
    setLoading(false);
    setLastResult(result);
  };

  const hasDocuments = docs.length > 0;
  const hasWebhook = !!analysisWebhookUrl;

  return (
    <AppLayout title="Analysis">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Run panel */}
        <div className="bg-[#0F172A] border border-slate-700/50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg mb-1">Trigger Analysis</h2>
              <p className="text-slate-400 text-sm leading-snug">
                {eligibleDocs.length > 0
                  ? `${eligibleDocs.length} document${eligibleDocs.length !== 1 ? 's' : ''} ready to analyze`
                  : hasDocuments
                  ? 'No documents in a processable state'
                  : 'No documents uploaded yet'}
              </p>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={loading || !hasWebhook || eligibleDocs.length === 0}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20 flex-shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Run Analysis
                </>
              )}
            </button>
          </div>

          {/* Webhook indicator */}
          <div className={`mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 border text-xs ${
            hasWebhook
              ? 'bg-slate-800 border-slate-600'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <Webhook size={13} className={hasWebhook ? 'text-slate-400' : 'text-amber-400'} />
            {hasWebhook ? (
              <>
                <span className="text-slate-400">POST to</span>
                <span className="font-mono text-slate-300 truncate">{analysisWebhookUrl}</span>
              </>
            ) : (
              <span className="text-amber-400">
                No analysis webhook configured —{' '}
                <Link to="/settings" className="underline font-semibold hover:text-amber-200">
                  add it in Settings
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Result banner */}
        {lastResult && (
          <WebhookResultBanner result={lastResult} onDismiss={() => setLastResult(null)} />
        )}

        {/* What gets sent */}
        {hasWebhook && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-slate-800 font-semibold text-sm">Webhook Payload Preview</h3>
              <p className="text-slate-400 text-xs mt-0.5">This JSON is sent to your analysis webhook on each run.</p>
            </div>
            <div className="px-5 py-4">
              <pre className="bg-slate-950 text-green-400 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed font-mono scrollbar-thin">
{JSON.stringify({
  triggeredAt: new Date().toISOString(),
  documents: eligibleDocs.map(({ id, name, type, uploadedAt }) => ({
    id, name, type, uploadedAt,
  })),
}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Document checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-semibold text-sm">Documents in Workspace</h3>
            <Link to="/documents" className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1">
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
                const eligible = doc.status === 'Processing' || doc.status === 'Ready';
                const statusColor = {
                  Ready: 'text-green-500 bg-green-50 border-green-100',
                  Processing: 'text-amber-600 bg-amber-50 border-amber-100',
                  Uploading: 'text-blue-500 bg-blue-50 border-blue-100',
                  Error: 'text-red-500 bg-red-50 border-red-100',
                }[doc.status] ?? '';
                return (
                  <div key={doc.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${!eligible ? 'opacity-40' : ''}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      eligible ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                    }`}>
                      {eligible && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <span className="text-slate-700 text-sm flex-1 truncate">{doc.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {doc.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <p className="text-blue-700 text-sm leading-relaxed">
            <span className="font-semibold">How it works:</span> Clicking "Run Analysis" sends a POST request to your analysis webhook with a list of document IDs and metadata. Your backend retrieves the documents, runs AI analysis, and returns results to your app. Connect the webhook in{' '}
            <Link to="/settings" className="underline font-semibold">Settings</Link>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
