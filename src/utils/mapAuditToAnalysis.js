/**
 * mapAuditToAnalysis
 *
 * Converts the raw n8n webhook response into the shape expected by the
 * Analysis page (matching the mockAnalysis structure).
 *
 * The n8n "Respond to Webhook" node may return either:
 *   - A plain markdown string (the generated memo), or
 *   - A structured JSON object with known fields
 */

import { normalizeN8nWebhookResponse } from './normalizeN8nWebhookResponse';

/** Strip ```json ... ``` (anywhere in string) or parse whole string as JSON. */
function tryParseLooseJson(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim();
  if (!t) return null;
  const fence = /```(?:json)?\s*([\s\S]*?)```/im.exec(t);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function pickNonEmptyString(v) {
  return typeof v === 'string' && v.trim() ? v : '';
}

/**
 * LangChain / OpenAI nodes often return `output` as an object or an array of
 * content parts, not a plain string.
 */
function agentFieldToText(val, depth = 0) {
  if (val == null || depth > 12) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val
      .map((x) => agentFieldToText(x, depth + 1))
      .filter(Boolean)
      .join('');
  }
  if (typeof val === 'object') {
    if (typeof val.text === 'string') return val.text;
    if (typeof val.content === 'string') return val.content;
    if (Array.isArray(val.content)) return agentFieldToText(val.content, depth + 1);
    if (val.type === 'text' && typeof val.text === 'string') return val.text;
    if (typeof val.message?.content === 'string') return val.message.content;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return '';
    }
  }
  return '';
}

function pickDeclaredAuditFields(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {
      final_memo: '',
      investment_recommendation: undefined,
      overall_diligence_score: undefined,
      audit_findings: undefined,
      additional_flags: undefined,
      confidence_scores: undefined,
      contradictions_found: undefined,
    };
  }
  const memo =
    obj.final_memo ??
    obj.finalMemo ??
    obj.memo ??
    obj.diligence_memo ??
    obj.executive_summary ??
    obj.executiveSummary ??
    obj.report ??
    obj.diligenceReport;
  return {
    final_memo:
      typeof memo === 'string'
        ? memo
        : memo != null && memo !== ''
        ? String(memo)
        : '',
    investment_recommendation: obj.investment_recommendation,
    overall_diligence_score: obj.overall_diligence_score,
    audit_findings: obj.audit_findings,
    additional_flags: obj.additional_flags,
    confidence_scores: obj.confidence_scores,
    contradictions_found: obj.contradictions_found,
  };
}

/**
 * Startup Diligence workflow: Audit Agent asks for final_memo in JSON, but n8n
 * LangChain agent nodes usually return the model reply in `output` / `text` /
 * `message.content` as a string (often JSON-in-a-string). Merge those shapes.
 */
function coerceAuditDataFromWebhook(raw) {
  const empty = () => ({
    final_memo: '',
    investment_recommendation: 'WATCH',
    overall_diligence_score: 5,
    audit_findings: [],
    additional_flags: [],
    confidence_scores: {},
    contradictions_found: [],
  });

  if (raw == null) return empty();

  if (typeof raw === 'string') {
    const parsed = tryParseLooseJson(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const picked = pickDeclaredAuditFields(parsed);
      const base = empty();
      return {
        ...base,
        ...picked,
        investment_recommendation:
          picked.investment_recommendation ??
          detectRecommendation(picked.final_memo || raw),
        overall_diligence_score: picked.overall_diligence_score ?? base.overall_diligence_score,
        audit_findings: Array.isArray(picked.audit_findings)
          ? picked.audit_findings
          : base.audit_findings,
        additional_flags: Array.isArray(picked.additional_flags)
          ? picked.additional_flags
          : base.additional_flags,
        confidence_scores:
          picked.confidence_scores && typeof picked.confidence_scores === 'object'
            ? picked.confidence_scores
            : base.confidence_scores,
        contradictions_found: Array.isArray(picked.contradictions_found)
          ? picked.contradictions_found
          : base.contradictions_found,
      };
    }
    return {
      ...empty(),
      final_memo: raw,
      investment_recommendation: detectRecommendation(raw),
    };
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return empty();
    return coerceAuditDataFromWebhook(raw[0]);
  }

  if (typeof raw !== 'object') {
    return { ...empty(), final_memo: String(raw) };
  }

  const flat = pickDeclaredAuditFields(raw);
  if (flat.final_memo) {
    const base = empty();
    return {
      ...base,
      ...flat,
      investment_recommendation:
        flat.investment_recommendation ??
        detectRecommendation(flat.final_memo),
      overall_diligence_score: flat.overall_diligence_score ?? base.overall_diligence_score,
      audit_findings: Array.isArray(flat.audit_findings)
        ? flat.audit_findings
        : base.audit_findings,
      additional_flags: Array.isArray(flat.additional_flags)
        ? flat.additional_flags
        : base.additional_flags,
      confidence_scores:
        flat.confidence_scores && typeof flat.confidence_scores === 'object'
          ? flat.confidence_scores
          : base.confidence_scores,
      contradictions_found: Array.isArray(flat.contradictions_found)
        ? flat.contradictions_found
        : base.contradictions_found,
    };
  }

  const blob =
    pickNonEmptyString(raw.output) ||
    agentFieldToText(raw.output) ||
    pickNonEmptyString(raw.text) ||
    agentFieldToText(raw.text) ||
    pickNonEmptyString(raw.response) ||
    agentFieldToText(raw.response) ||
    pickNonEmptyString(raw.data) ||
    agentFieldToText(raw.data) ||
    pickNonEmptyString(raw.message?.content) ||
    agentFieldToText(raw.message) ||
    pickNonEmptyString(raw.choices?.[0]?.message?.content) ||
    '';

  if (blob.trim()) {
    const parsed = tryParseLooseJson(blob);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const fromParsed = pickDeclaredAuditFields(parsed);
      const base = empty();
      return {
        ...base,
        ...fromParsed,
        final_memo:
          fromParsed.final_memo ||
          (typeof parsed.summary === 'string' ? parsed.summary : '') ||
          blob,
        investment_recommendation:
          fromParsed.investment_recommendation ??
          detectRecommendation(fromParsed.final_memo || blob),
        overall_diligence_score:
          fromParsed.overall_diligence_score ?? base.overall_diligence_score,
        audit_findings: Array.isArray(fromParsed.audit_findings)
          ? fromParsed.audit_findings
          : Array.isArray(raw.audit_findings)
          ? raw.audit_findings
          : base.audit_findings,
        additional_flags: Array.isArray(fromParsed.additional_flags)
          ? fromParsed.additional_flags
          : Array.isArray(raw.additional_flags)
          ? raw.additional_flags
          : base.additional_flags,
        confidence_scores:
          fromParsed.confidence_scores && typeof fromParsed.confidence_scores === 'object'
            ? fromParsed.confidence_scores
            : base.confidence_scores,
        contradictions_found: Array.isArray(fromParsed.contradictions_found)
          ? fromParsed.contradictions_found
          : base.contradictions_found,
      };
    }
    return {
      ...empty(),
      final_memo: blob,
      investment_recommendation: detectRecommendation(blob),
      audit_findings: Array.isArray(raw.audit_findings) ? raw.audit_findings : [],
      additional_flags: Array.isArray(raw.additional_flags) ? raw.additional_flags : [],
    };
  }

  const base = empty();
  return {
    ...base,
    ...flat,
    audit_findings: Array.isArray(flat.audit_findings)
      ? flat.audit_findings
      : base.audit_findings,
    additional_flags: Array.isArray(flat.additional_flags)
      ? flat.additional_flags
      : base.additional_flags,
  };
}

function detectRecommendation(text) {
  if (/\bPASS\b/.test(text)) return 'PASS';
  if (/\bFAIL\b/.test(text)) return 'FAIL';
  if (/\bWATCH\b/.test(text)) return 'WATCH';
  return 'WATCH';
}

/** Walk the tree for long strings; parse JSON memos or use longest as memo. */
function extractAuditFromDeepStrings(root) {
  const strings = [];
  function walk(v, depth) {
    if (depth > 18 || v == null) return;
    if (typeof v === 'string') {
      if (v.trim().length > 20) strings.push(v);
      return;
    }
    if (typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
      return;
    }
    Object.values(v).forEach((x) => walk(x, depth + 1));
  }
  walk(root, 0);
  strings.sort((a, b) => b.length - a.length);
  for (const s of strings) {
    const parsed = tryParseLooseJson(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const p = pickDeclaredAuditFields(parsed);
      if (p.final_memo?.trim()) {
        return {
          final_memo: p.final_memo,
          investment_recommendation:
            p.investment_recommendation ?? detectRecommendation(p.final_memo),
          overall_diligence_score: p.overall_diligence_score ?? 5,
          audit_findings: Array.isArray(p.audit_findings) ? p.audit_findings : [],
          additional_flags: Array.isArray(p.additional_flags) ? p.additional_flags : [],
          confidence_scores:
            p.confidence_scores && typeof p.confidence_scores === 'object'
              ? p.confidence_scores
              : {},
          contradictions_found: Array.isArray(p.contradictions_found)
            ? p.contradictions_found
            : [],
        };
      }
    }
  }
  if (strings[0]?.trim()) {
    const longest = strings[0];
    return {
      final_memo: longest,
      investment_recommendation: detectRecommendation(longest),
      overall_diligence_score: 5,
      audit_findings: [],
      additional_flags: [],
      confidence_scores: {},
      contradictions_found: [],
    };
  }
  return null;
}

function normalizeKPIs(data) {
  let raw = data.kpis ?? data.metrics ?? data.kpi_extraction ?? [];
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      raw = Object.entries(raw).map(([metric, value]) => ({ metric, value: String(value) }));
    } else {
      return [];
    }
  }
  return raw.map((k, i) => ({
    id: i,
    metric: k.metric ?? k.name ?? k.label ?? `Metric ${i + 1}`,
    value: k.value != null ? String(k.value) : '—',
    confidence: k.confidence ?? 'medium',
    confidenceScore: (() => {
      const s = Number(k.confidenceScore ?? k.confidence_score ?? k.score ?? 50);
      return s <= 10 ? s * 10 : s;
    })(),
  }));
}

export function mapAuditToAnalysis(raw) {
  const normalized = normalizeN8nWebhookResponse(raw);
  // #region agent log
  try{localStorage.setItem('dbg_b7feaf_normalized',JSON.stringify({ts:Date.now(),type:typeof normalized,isArray:Array.isArray(normalized),strValue:typeof normalized==='string'?normalized.slice(0,600):null,keys:typeof normalized==='object'&&normalized!==null&&!Array.isArray(normalized)?Object.keys(normalized).slice(0,20):null,containsExpr:typeof normalized==='string'&&/\{\{.*?\}\}/.test(normalized)}));}catch(e){}
  // #endregion
  let data = coerceAuditDataFromWebhook(normalized);
  // #region agent log
  try{localStorage.setItem('dbg_b7feaf_coerced',JSON.stringify({ts:Date.now(),memoPreview:data.final_memo?.slice(0,600),memoLen:data.final_memo?.length,rec:data.investment_recommendation,findings:data.audit_findings?.length,flags:data.additional_flags?.length,containsExpr:data.final_memo?/\{\{.*?\}\}/.test(data.final_memo):false}));}catch(e){}
  // #endregion

  if (!data.final_memo?.trim()) {
    const deep = extractAuditFromDeepStrings(normalized);
    if (deep) {
      data = {
        ...data,
        ...deep,
        audit_findings:
          data.audit_findings.length > 0 ? data.audit_findings : deep.audit_findings,
        additional_flags:
          data.additional_flags.length > 0 ? data.additional_flags : deep.additional_flags,
      };
    }
  }

  if (!data.final_memo?.trim() && normalized != null) {
    let dump = '';
    try {
      dump =
        typeof normalized === 'string'
          ? normalized
          : JSON.stringify(normalized, null, 2);
    } catch {
      dump = String(normalized);
    }
    if (dump.trim()) {
      data = {
        ...data,
        final_memo:
          `Could not map a diligence memo from this response. If your n8n “Respond to Webhook” body uses a custom shape, align field names with final_memo (or output/text). Raw JSON:\n\n${dump.slice(0, 120000)}`,
      };
    }
  }

  if (!data.final_memo?.trim()) {
    data = {
      ...data,
      final_memo:
        'No memo text was returned. In n8n, open the last execution: confirm “Audit Agent” produced output and “Respond to Webhook” is set to return that item (First Entry JSON / same data).',
    };
  }

  const score = data.overall_diligence_score;

  return {
    executiveSummary: {
      content: data.final_memo,
      confidence: score * 10,
      citations: [],
    },

    kpis: normalizeKPIs(data),

    market: {
      // Market intelligence comes from specialist agents — leave empty for now
      bullets: [],
      confidence: score * 10,
    },

    redFlags: data.audit_findings
      .filter((f) => f != null && typeof f === 'object')
      .map((finding, index) => ({
        id: index,
        severity: finding.severity ?? 'Medium',
        title: finding.title ?? finding.name ?? `Finding ${index + 1}`,
        description: finding.description ?? finding.details ?? '',
        citation: '',
        contradicts: null,
      })),

    missingData: data.additional_flags.map((flag, index) => ({
      id: index,
      item: typeof flag === 'string' ? flag : (flag.label ?? flag.item ?? String(flag)),
      priority: 'High',
      checked: false,
    })),

    recommendation: data.investment_recommendation ?? 'WATCH',
    diligenceScore: Number(data.overall_diligence_score ?? 5),
    confidenceScores: (() => {
      const cs = data.confidence_scores ?? {};
      const normalized = {};
      for (const [k, v] of Object.entries(cs)) {
        const n = Number(v);
        normalized[k] = n <= 10 ? n * 10 : n;
      }
      return normalized;
    })(),
  };
}
