/**
 * n8n often returns the last node's items as a JSON array:
 *   [{ "json": { ...actual fields... } }]
 * or a single wrapper object. Normalize to the inner payload for mapping.
 */
export function normalizeN8nWebhookResponse(raw) {
  if (raw == null) return raw;

  if (typeof raw === 'string') {
    const t = raw.trim();
    if (
      (t.startsWith('[') && t.endsWith(']')) ||
      (t.startsWith('{') && t.endsWith('}'))
    ) {
      try {
        return normalizeN8nWebhookResponse(JSON.parse(t));
      } catch {
        return raw;
      }
    }
    return raw;
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return raw;
    const first = raw[0];
    if (first && typeof first === 'object' && first.json != null) {
      return normalizeN8nWebhookResponse(first.json);
    }
    return first;
  }

  if (typeof raw === 'object' && raw.json != null) {
    if (Array.isArray(raw.json)) {
      if (raw.json.length === 0) return raw;
      return normalizeN8nWebhookResponse(raw.json[0]);
    }
    return raw.json;
  }

  /** Respond-to-webhook / HTTP wrappers */
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    if (raw.body != null) {
      return normalizeN8nWebhookResponse(raw.body);
    }
    if (Array.isArray(raw.items) && raw.items.length > 0) {
      const first = raw.items[0];
      if (first && typeof first === 'object' && first.json != null) {
        return normalizeN8nWebhookResponse(first.json);
      }
      return normalizeN8nWebhookResponse(first);
    }
  }

  return raw;
}
