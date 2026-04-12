/**
 * Large JSON bodies (e.g. base64 data URIs for PDFs) often trigger n8n or gateway
 * errors (500/413). Cap per-document and total content size for the webhook POST.
 */
const MAX_CHARS_PER_DOCUMENT = 25_000_000;
const MAX_TOTAL_CONTENT_CHARS = 55_000_000;

function truncateContent(content, docName, maxLen, reasonSuffix) {
  if (!content || content.length <= maxLen) return content;
  return (
    content.slice(0, maxLen) +
    `\n\n[${reasonSuffix}: ${docName}]`
  );
}

/**
 * @param {string} companyName
 * @param {string} companyId
 * @param {Array<{ status: string, type: string, name: string, content?: string | null }>} docs
 */
export function buildAnalysisWebhookPayload(companyName, companyId, docs) {
  const ready = docs.filter((d) => d.status === 'Ready');
  let totalChars = 0;
  const documents = [];

  for (const d of ready) {
    const isPdf =
      (typeof d.name === 'string' && d.name.toLowerCase().endsWith('.pdf')) ||
      String(d.type || '').toUpperCase() === 'PDF';
    if (d.file instanceof File && isPdf) {
      documents.push({
        type: d.type,
        name: d.name,
        file: d.file,
      });
      continue;
    }

    if (isPdf) {
      continue;
    }

    const content = d.content;
    if (content == null || content === '') {
      continue;
    }

    let truncated = truncateContent(
      content,
      d.name,
      MAX_CHARS_PER_DOCUMENT,
      'Truncated — document exceeded per-file character limit for webhook'
    );

    if (totalChars + truncated.length > MAX_TOTAL_CONTENT_CHARS) {
      const budget = Math.max(0, MAX_TOTAL_CONTENT_CHARS - totalChars);
      if (budget < 500) break;
      const capped =
        truncated.slice(0, budget) +
        '\n\n[Truncated — total webhook payload size limit reached]';
      documents.push({
        type: d.type,
        name: d.name,
        content: capped,
        truncated: true,
      });
      break;
    }

    totalChars += truncated.length;
    documents.push({
      type: d.type,
      name: d.name,
      content: truncated,
    });
  }

  return {
    companyName: companyName.trim() || 'Unknown Company',
    companyId,
    documents,
    sections: {
      kpi: '',
      market: '',
      traction: '',
      redFlags: '',
    },
  };
}
