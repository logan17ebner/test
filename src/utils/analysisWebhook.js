/**
 * Turn error response bodies into short, readable text. Generic HTML error pages
 * (Express/Vite "Internal Server Error") are common when the dev proxy fails.
 */
export function summarizeWebhookErrorBody(status, bodyText) {
  const raw = (bodyText ?? '').trim();
  let base = `HTTP ${status}`;
  if (!raw) return base;

  const looksLikeHtml =
    /^<!DOCTYPE\s+html/i.test(raw) ||
    /^<html[\s>]/i.test(raw) ||
    (raw.includes('<body') && raw.includes('</html>'));

  if (looksLikeHtml) {
    const pre = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    const snippet = pre?.[1]?.trim().replace(/\s+/g, ' ') || '';
    if (/internal server error/i.test(snippet) || /internal server error/i.test(raw)) {
      return `${base}: the server returned a generic error page (not JSON). If you use npm run dev, this often means the Vite proxy could not complete the request to n8n (network, URL, or n8n is down). Confirm VITE_N8N_WEBHOOK_URL is the Webhook node Production URL, restart the dev server after changing .env, and check the terminal running Vite for proxy errors.`;
    }
    return `${base}: received an HTML error page instead of JSON. Check the Vite dev terminal and your n8n execution log.`;
  }

  try {
    const j = JSON.parse(raw);
    const main =
      j.message ||
      j.error?.message ||
      (typeof j.error === 'string' ? j.error : null) ||
      null;
    const hint = j.hint && typeof j.hint === 'string' ? j.hint : '';
    if (main && hint) return `${main} — ${hint}`;
    if (main) return main;
    if (hint) return `${base}: ${hint}`;
    return `${base}: ${raw.slice(0, 500)}`;
  } catch {
    return `${base}: ${raw.slice(0, 600)}`;
  }
}

/**
 * n8n "Production URL" looks like https://instance.app.n8n.cloud/webhook/...
 * The workflow editor URL (/workflow/<id>) is HTML, not an API — POST will fail.
 */
export function isWorkflowEditorUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\/workflow\//i.test(url.trim());
}

/**
 * In dev, POST via Vite proxy (/n8n-webhook → full URL) to avoid browser CORS to n8n.cloud.
 */
export function resolveAnalysisWebhookFetchUrl(rawFromEnv) {
  const raw = rawFromEnv?.trim() ?? '';
  if (!raw || isWorkflowEditorUrl(raw)) return '';
  if (import.meta.env.DEV) return '/n8n-webhook';
  return raw;
}
