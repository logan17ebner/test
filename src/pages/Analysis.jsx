import { useState, useEffect } from 'react';
import {
  LightningBoltIcon,
  BarChartIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  Cross2Icon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoCircledIcon,
  DrawingPinIcon,
  ClipboardIcon,
  DownloadIcon,
} from '@radix-ui/react-icons';
import AppLayout from '../components/AppLayout';
import { useDocuments } from '../context/DocumentsContext';
import { Link } from 'react-router-dom';
import { mapAuditToAnalysis } from '../utils/mapAuditToAnalysis';
import {
  isWorkflowEditorUrl,
  resolveAnalysisWebhookFetchUrl,
} from '../utils/analysisWebhook';
import { buildAnalysisWebhookPayload } from '../utils/analysisPayload';
import { getCachedDocFile } from '../utils/docFileCache';
import { runDiligenceWorkflow } from '../utils/runDiligenceWorkflow';
import {
  addPendingReview,
  getApprovedRecord,
  getPendingReviews,
} from '../utils/analysisReviewQueue';

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

function RunResultBanner({ result, onDismiss }) {
  if (!result) return null;
  const ok = result.success;
  const awaiting = ok && result.awaitingReview;
  return (
    <div
      className={`flex items-start gap-3 rounded-sm px-4 py-3 border ${
        ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      {ok ? (
        <CheckCircledIcon width={16} height={16} className="text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <ExclamationTriangleIcon width={16} height={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>
          {awaiting
            ? 'Submitted for administrator review'
            : ok
            ? 'Analysis completed successfully'
            : 'Analysis failed'}
        </p>
        <p className={`text-xs mt-0.5 whitespace-pre-wrap break-words ${ok ? 'text-green-600' : 'text-red-600'}`}>
          {awaiting
            ? 'An admin must review and approve the output before it appears on this page. You will be notified when it is published.'
            : ok
            ? `Completed with HTTP ${result.status}`
            : result.error ?? `HTTP ${result.status}`}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
      >
        <Cross2Icon width={14} height={14} />
      </button>
    </div>
  );
}

export default function Analysis() {
  const { docs } = useDocuments();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(() => getApprovedRecord()?.analysis ?? null);
  const [companyName, setCompanyName] = useState(() => getApprovedRecord()?.companyName ?? '');
  const [envError, setEnvError] = useState('');
  const [awaitingReview, setAwaitingReview] = useState(
    () => typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('dd_last_pending_submission')
  );

  useEffect(() => {
    const onApproved = () => {
      const rec = getApprovedRecord();
      setLiveAnalysis(rec?.analysis ?? null);
      if (rec?.companyName) setCompanyName(rec.companyName);
      setAwaitingReview(
        typeof sessionStorage !== 'undefined' &&
          !!sessionStorage.getItem('dd_last_pending_submission')
      );
    };
    window.addEventListener('dd-approved-analysis-updated', onApproved);
    return () => window.removeEventListener('dd-approved-analysis-updated', onApproved);
  }, []);

  const rawWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? '';
  const webhookConfigError =
    rawWebhookUrl && isWorkflowEditorUrl(rawWebhookUrl)
      ? 'The analysis endpoint URL is misconfigured (workflow editor link instead of a webhook URL). An administrator can correct this in the deployment environment / admin panel.'
      : '';
  const webhookFetchUrl = resolveAnalysisWebhookFetchUrl(rawWebhookUrl);
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  const eligibleDocs = docs.filter((d) => d.status === 'Ready');
  const hasDocuments = docs.length > 0;
  const hasWebhook = !!webhookFetchUrl && !webhookConfigError && hasSupabaseKey;

  const runAnalysis = async () => {
    // Runtime guard — show an inline error if the env var is missing
    if (webhookConfigError) {
      setEnvError(webhookConfigError);
      return;
    }
    if (!webhookFetchUrl) {
      setEnvError(
        'Analysis is not available — the server endpoint is not configured. An administrator can set it in the deployment environment.'
      );
      return;
    }
    if (!hasSupabaseKey) {
      setEnvError(
        'Analysis requires VITE_SUPABASE_ANON_KEY in your environment so completed runs can be loaded from Supabase.'
      );
      return;
    }

    setEnvError('');
    setLoading(true);
    setLastResult(null);

    const submissionId = `sub_${Date.now()}`;

    try {
      const docsForPayload = await Promise.all(
        docs.map(async (d) => {
          const isPdf =
            (typeof d.name === 'string' && d.name.toLowerCase().endsWith('.pdf')) ||
            String(d.type || '').toUpperCase() === 'PDF';
          const base = isPdf
            ? (() => {
                const { content: _omit, ...rest } = d;
                return rest;
              })()
            : d;

          if (base.file instanceof File) return base;
          if (!isPdf) return d;

          const blob = await getCachedDocFile(d.id);
          if (!blob) return base;
          const file =
            blob instanceof File ? blob : new File([blob], d.name, { type: 'application/pdf' });
          return { ...base, file };
        })
      );

      const payload = buildAnalysisWebhookPayload(
        companyName,
        submissionId,
        docsForPayload
      );

      const prevCount = parseInt(localStorage.getItem('diligence_submission_count') || '0', 10);
      localStorage.setItem('diligence_submission_count', String(isNaN(prevCount) ? 1 : prevCount + 1));
      const submissionTimestamp = new Date().toISOString();
      localStorage.setItem('diligence_last_submission', submissionTimestamp);
      const prevSubs = (() => {
        try {
          const p = JSON.parse(localStorage.getItem('diligence_submissions') || '[]');
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      })();
      localStorage.setItem(
        'diligence_submissions',
        JSON.stringify([
          ...prevSubs,
          {
            id: submissionId,
            filename: companyName.trim() || 'Unknown Company',
            timestamp: submissionTimestamp,
            status: 'pending',
          },
        ])
      );

      const raw = await runDiligenceWorkflow(
        payload.companyName,
        payload.companyId,
        payload.documents
      );

      const mapped = mapAuditToAnalysis(raw);
      const approvedRecord = {
        submissionId,
        companyName: companyName.trim() || 'Unknown Company',
        analysis: mapped,
        approvedAt: new Date().toISOString(),
      };
      localStorage.setItem('dd_approved_analysis', JSON.stringify(approvedRecord));
      window.dispatchEvent(new CustomEvent('dd-approved-analysis-updated'));
      setLiveAnalysis(mapped);
      setLastResult({ success: true, status: 200 });
      const siSubs = (() => {
        try { return JSON.parse(localStorage.getItem('diligence_submissions') || '[]'); }
        catch { return []; }
      })();
      localStorage.setItem('diligence_submissions',
        JSON.stringify(siSubs.map(s => s.id === submissionId ? { ...s, status: 'published' } : s))
      );
    } catch (err) {
      setLastResult({ success: false, error: err.message });
      const siSubs3 = (() => {
        try {
          return JSON.parse(localStorage.getItem('diligence_submissions') || '[]');
        } catch {
          return [];
        }
      })();
      localStorage.setItem(
        'diligence_submissions',
        JSON.stringify(siSubs3.map((s) => (s.id === submissionId ? { ...s, status: 'error' } : s)))
      );
    } finally {
      setLoading(false);
    }
  };

  const newerPendingCount = liveAnalysis ? getPendingReviews().length : 0;

  const displayAnalysis =
    liveAnalysis ??
    (awaitingReview
      ? {
          ...mockAnalysis,
          executiveSummary: {
            content:
              'Your analysis output was sent to an administrator. You will be notified when it is approved and published here.',
            confidence: 0,
            citations: [],
          },
          redFlags: [],
          missingData: [],
        }
      : mockAnalysis);

  return (
    <AppLayout title="Analysis">
      <div className="max-w-3xl mx-auto space-y-5">

        {newerPendingCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-sm px-4 py-3">
            <InfoCircledIcon width={16} height={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-900 text-sm flex-1">
              You have {newerPendingCount} newer analysis run
              {newerPendingCount !== 1 ? 's' : ''} awaiting administrator review. Published results below
              are from an earlier approved run.
            </p>
          </div>
        )}

        {/* ENV error banner */}
        {envError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-sm px-4 py-3">
            <InfoCircledIcon width={16} height={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm flex-1">{envError}</p>
            <button
              onClick={() => setEnvError('')}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <Cross2Icon width={14} height={14} />
            </button>
          </div>
        )}

        {/* Run panel */}
        <div className="bg-[#0F172A] border border-slate-700/50 rounded-sm p-6">
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
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-sm text-sm transition-colors shadow-lg shadow-blue-500/20 flex-shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <LightningBoltIcon width={16} height={16} />
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
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm rounded-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Result banner */}
          {lastResult && (
            <div className="mt-4">
              <RunResultBanner
                result={lastResult}
                onDismiss={() => setLastResult(null)}
              />
            </div>
          )}

          {/* Document checklist */}
          <div className="mt-4 bg-blue-50 border border-slate-300 rounded-sm overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300">
              <h3 className="text-slate-800 font-semibold text-sm">Documents in Workspace</h3>
              <Link
                to="/documents"
                className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1"
              >
                Manage <ExternalLinkIcon width={11} height={11} />
              </Link>
            </div>

            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-10 h-10 bg-blue-100/40 rounded-sm flex items-center justify-center mb-3">
                  <BarChartIcon width={18} height={18} className="text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">No documents uploaded</p>
                <p className="text-slate-400 text-xs max-w-xs">
                  Upload documents first, then run analysis from this page.
                </p>
                <Link
                  to="/documents"
                  className="mt-4 inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
                >
                  Go to Documents
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
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
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                          eligible ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                        }`}
                      >
                        {eligible && <CheckCircledIcon width={10} height={10} className="text-white" />}
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
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-sm px-5 py-4">
            <p className="text-blue-700 text-sm leading-relaxed">
              <span className="font-semibold">How it works:</span> Run Analysis sends your ready
              documents for processing. An administrator reviews the output before it is published
              to this page; you will get a notification when it is ready.
            </p>
          </div>
        </div>

        {/* PDF export — shown after a successful run populated liveAnalysis */}
        {liveAnalysis && (
          <div className="bg-blue-50 border border-slate-300 rounded-sm overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 border-b border-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-sm bg-blue-100/40 flex items-center justify-center flex-shrink-0">
                  <FileTextIcon width={18} height={18} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-semibold text-sm">Formatted report (PDF)</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Download the analysis below as a printable PDF. This uses the same summary,
                    red flags, and missing-data sections shown on this page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const { exportAnalysisToPdf } = await import('../utils/analysisPdf');
                  exportAnalysisToPdf({
                    companyName: companyName.trim() || 'Unknown Company',
                    analysis: liveAnalysis,
                  });
                }}
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-sm transition-colors flex-shrink-0"
              >
                <DownloadIcon width={16} height={16} />
                Download PDF
              </button>
            </div>
          </div>
        )}

        {/* ── Analysis Results ─────────────────────────────────────────────── */}

        {/* Executive Summary */}
        <div className="bg-blue-50 border border-slate-300 rounded-sm overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300">
            <div className="flex items-center gap-2">
              <FileTextIcon width={15} height={15} className="text-slate-500" />
              <h3 className="text-slate-800 font-semibold text-sm">Executive Summary</h3>
            </div>
            {displayAnalysis.executiveSummary.confidence > 0 && (
              <span className="text-xs text-slate-500 bg-blue-100/40 px-2 py-0.5 rounded-full">
                Confidence: {displayAnalysis.executiveSummary.confidence}%
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {displayAnalysis.executiveSummary.content || 'No summary available.'}
            </p>
          </div>
        </div>

        {/* Red Flags — only rendered when there are findings */}
        {displayAnalysis.redFlags.length > 0 && (
          <div className="bg-blue-50 border border-slate-300 rounded-sm overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-300">
              <DrawingPinIcon width={15} height={15} className="text-red-500" />
              <h3 className="text-slate-800 font-semibold text-sm">
                Red Flags{' '}
                <span className="text-slate-400 font-normal text-xs">
                  ({displayAnalysis.redFlags.length})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {displayAnalysis.redFlags.map((flag) => (
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
        {displayAnalysis.missingData.length > 0 && (
          <div className="bg-blue-50 border border-slate-300 rounded-sm overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-300">
              <ClipboardIcon width={15} height={15} className="text-amber-500" />
              <h3 className="text-slate-800 font-semibold text-sm">
                Missing Data{' '}
                <span className="text-slate-400 font-normal text-xs">
                  ({displayAnalysis.missingData.length})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {displayAnalysis.missingData.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                      item.checked ? 'bg-green-500 border-green-500' : 'border-slate-300'
                    }`}
                  >
                    {item.checked && <CheckCircledIcon width={10} height={10} className="text-white" />}
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
