import { createClient } from '@supabase/supabase-js';
import { resolveAnalysisWebhookFetchUrl } from './analysisWebhook';

const supabaseUrl = 'https://ohztnzrivotdueqafquw.supabase.co';

/**
 * @param {string} companyName
 * @param {string} companyId
 * @param {Array<Record<string, unknown>>} documents
 * @returns {Promise<unknown>} Parsed `result` from the completed analyses row
 */
export async function runDiligenceWorkflow(companyName, companyId, documents) {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!anon) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not configured.');
  }

  const supabase = createClient(supabaseUrl, anon);

  const n8nWebhookUrl = resolveAnalysisWebhookFetchUrl(
    import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? ''
  );
  if (!n8nWebhookUrl) {
    throw new Error('Analysis webhook URL is not configured (VITE_N8N_WEBHOOK_URL).');
  }

  // 1. Fire and forget — webhook responds immediately
  const res = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ companyName, companyId, documents }),
  });

  if (!res.ok) throw new Error(`Webhook error: ${res.status}`);

  await res.text();
  const run_id = companyId;

  // 2. Poll Supabase every 3s until status === 'complete'
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
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
        clearInterval(interval);
        resolve(data.result);
      }
    }, 3000);

    // Timeout after 3 minutes
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Analysis timed out'));
    }, 180000);
  });
}
