import supabase from '../lib/supabaseClient';
import { resolveAnalysisWebhookFetchUrl } from './analysisWebhook';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const POLL_INTERVAL_MS = 3000;
/** Default 10 minutes — multi-document n8n runs often exceed the previous 3-minute cap. */
const DEFAULT_POLL_TIMEOUT_MS = 600_000;

function resolvePollTimeoutMs() {
  const raw = import.meta.env.VITE_ANALYSIS_POLL_TIMEOUT_MS?.trim();
  const n = Number.parseInt(raw ?? '', 10);
  if (Number.isFinite(n) && n >= 30_000) return n;
  return DEFAULT_POLL_TIMEOUT_MS;
}

async function extractPDFText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(p => p.getTextContent()).then(tc => tc.items.map(item => item.str).join(' '))
    )
  );
  return pages.join('\n\n');
}

/**
 * @param {string} companyName
 * @param {string} companyId
 * @param {Array<Record<string, unknown>>} documents
 * @returns {Promise<unknown>} Parsed `result` from the completed analyses row
 */
export async function runDiligenceWorkflow(companyName, companyId, documents) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authError || !user) throw 'No authenticated user — cannot start diligence run.';

  const n8nWebhookUrl = resolveAnalysisWebhookFetchUrl(
    import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? ''
  );
  if (!n8nWebhookUrl) {
    throw new Error('Analysis webhook URL is not configured (VITE_N8N_WEBHOOK_URL).');
  }

  const enrichedDocuments = await Promise.all(
    documents.map(async doc => {
      if (doc.content && !doc.content.startsWith('[No content')) return doc;
      const file = doc instanceof File ? doc : doc.file;
      if (file instanceof File) {
        const content = await extractPDFText(file);
        return { name: file.name, type: 'PDF', content };
      }
      return { ...doc, content: '[Could not extract text]' };
    })
  );

  // 1. Fire and forget — webhook responds immediately
  // n8n must read user_id from this payload and write it to the dilligencetable row so RLS allows the frontend poll to find it.
  const res = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      companyName,
      companyId,
      documents: enrichedDocuments,
      user_id: user.id,
    }),
  });

  if (!res.ok) throw new Error(`Webhook error: ${res.status}`);

  await res.text();
  const run_id = companyId;
  const pollTimeoutMs = resolvePollTimeoutMs();

  if (import.meta.env.DEV) {
    // Helps distinguish Supabase poll timeout vs webhook/upload issues (see README).
    console.info(
      '[runDiligenceWorkflow] Polling dilligencetable for run_id=%s every %sms (timeout %sms)',
      run_id,
      POLL_INTERVAL_MS,
      pollTimeoutMs
    );
  }

  // 2. Poll Supabase until status === 'complete'
  return new Promise((resolve, reject) => {
    let pollIntervalId;
    let timeoutId;

    const cleanup = () => {
      clearInterval(pollIntervalId);
      clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Analysis timed out after ${pollTimeoutMs}ms waiting for a dilligencetable row with run_id="${run_id}" and status="complete". ` +
            `Set VITE_ANALYSIS_POLL_TIMEOUT_MS (ms) for longer n8n runs. ` +
            `Confirm n8n writes run_id equal to the webhook body companyId (${run_id}).`
        )
      );
    }, pollTimeoutMs);

    pollIntervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from('dilligencetable')
        .select('*')
        .eq('run_id', run_id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return; // keep polling
      if (data?.result) {
        cleanup();
        resolve(data.result);
      }
    }, POLL_INTERVAL_MS);
  });
}
