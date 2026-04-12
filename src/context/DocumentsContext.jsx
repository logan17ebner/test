import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pushNotification } from '../utils/notifications';
import {
  cacheDocFile,
  deleteCachedDocFile,
  clearCachedDocFiles,
} from '../utils/docFileCache';

const STORAGE_KEY = 'dd_documents';
const WEBHOOK_KEY = 'dd_upload_webhook_url';
const ANALYSIS_WEBHOOK_KEY = 'dd_analysis_webhook_url';

function isPdfDocShape(d) {
  return (
    (typeof d.name === 'string' && d.name.toLowerCase().endsWith('.pdf')) ||
    String(d.type || '').toUpperCase() === 'PDF'
  );
}

/** Drop `content` for PDFs — plain text is set only after pdf.js extraction in runDiligenceWorkflow. */
function stripPdfContentField(d) {
  if (!isPdfDocShape(d)) return d;
  const { content: _omit, ...rest } = d;
  return rest;
}

/** localStorage is ~5–10MB; never persist base64 data URLs or very large strings. */
const MAX_PERSISTED_CONTENT_CHARS = 500_000;

function serializeDocsForStorage(docs) {
  return docs.map((d) => {
    const { file: _f, ...rest } = d;
    if (isPdfDocShape(rest)) {
      const { content: __, ...pdfRest } = rest;
      return pdfRest;
    }
    const c = rest.content;
    if (c == null || typeof c !== 'string') return rest;
    if (c.startsWith('data:') || c.length > MAX_PERSISTED_CONTENT_CHARS) {
      return { ...rest, content: null };
    }
    return rest;
  });
}

const DocumentsContext = createContext(null);

/**
 * Reads file content using the FileReader API.
 *   - .txt   → readAsText() (plain UTF-8 string)
 *   - other  → readAsDataURL() for non-PDF binary (e.g. docx). PDFs are not read here.
 */
function readFileContent(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);

    if (ext === 'pdf') {
      resolve(null);
      return;
    }
    if (ext === 'txt') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

export function DocumentsProvider({ children }) {
  const [docs, setDocs] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
      return Array.isArray(raw) ? raw.map(stripPdfContentField) : [];
    } catch {
      return [];
    }
  });

  const [uploadWebhookUrl, setUploadWebhookUrl] = useState(
    () => localStorage.getItem(WEBHOOK_KEY) ?? ''
  );

  const [analysisWebhookUrl, setAnalysisWebhookUrl] = useState(
    () => localStorage.getItem(ANALYSIS_WEBHOOK_KEY) ?? ''
  );

  // Persist docs to localStorage whenever they change (omit huge binary content)
  useEffect(() => {
    const payload = serializeDocsForStorage(docs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      if (e?.name === 'QuotaExceededError') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serializeDocsForStorage(docs))
        );
      }
    }
  }, [docs]);

  const saveUploadWebhook = (url) => {
    setUploadWebhookUrl(url);
    localStorage.setItem(WEBHOOK_KEY, url);
  };

  const saveAnalysisWebhook = (url) => {
    setAnalysisWebhookUrl(url);
    localStorage.setItem(ANALYSIS_WEBHOOK_KEY, url);
  };

  /**
   * Upload a file:
   * 1. Add an "Uploading" record to the list immediately (optimistic)
   * 2. Read the file content via FileReader and store it on the doc object
   * 3. POST the file as multipart/form-data to the configured webhook
   * 4. Transition status to "Ready" on success, "Error" on failure
   */
  const uploadDocument = useCallback(async (file) => {
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ext = file.name.split('.').pop().toUpperCase();
    const lowerExt = ext.toLowerCase();
    const record = {
      id,
      name: file.name,
      type: ext,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadedAt: new Date().toISOString(),
      status: 'Uploading',
      webhookStatus: null,
      webhookResponse: null,
      file,
      ...(lowerExt === 'pdf' ? {} : { content: null }),
    };

    setDocs((prev) => [record, ...prev]);

    await cacheDocFile(id, file).catch(() => {});

    // Text / non-PDF: store string or data URL on `content`. PDFs: no `content` until runDiligenceWorkflow extracts text.
    const content = lowerExt === 'pdf' ? undefined : await readFileContent(file);
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (lowerExt === 'pdf') {
          const { content: _omit, ...rest } = d;
          return rest;
        }
        return { ...d, content };
      })
    );

    if (!uploadWebhookUrl) {
      // No upload webhook configured — mark as Ready so it's eligible for analysis
      setDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: 'Ready', webhookStatus: 'skipped' } : d
        )
      );
      pushNotification({
        type: 'success',
        title: 'Document ready',
        body: `${file.name} is ready in your workspace.`,
        href: '/documents',
      });
      return { success: true, skipped: true };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('fileType', ext);
      formData.append('fileSize', file.size);
      formData.append('documentId', id);
      formData.append('uploadedAt', record.uploadedAt);

      const res = await fetch(uploadWebhookUrl, {
        method: 'POST',
        body: formData,
      });

      const webhookStatus = res.ok ? 'success' : 'error';
      let webhookResponse = null;
      try {
        const text = await res.text();
        webhookResponse = text ? JSON.parse(text) : null;
      } catch {
        // response wasn't JSON — that's fine
      }

      setDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, status: res.ok ? 'Ready' : 'Error', webhookStatus, webhookResponse }
            : d
        )
      );

      if (res.ok) {
        pushNotification({
          type: 'success',
          title: 'Document ready',
          body: `${file.name} finished processing and is ready for analysis.`,
          href: '/documents',
        });
      } else {
        pushNotification({
          type: 'error',
          title: 'Document error',
          body: `${file.name} could not be processed (HTTP ${res.status}).`,
          href: '/documents',
        });
      }

      return { success: res.ok, status: res.status };
    } catch (err) {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, status: 'Error', webhookStatus: 'error', webhookResponse: err.message }
            : d
        )
      );
      pushNotification({
        type: 'error',
        title: 'Upload failed',
        body: `${file.name}: ${err.message}`,
        href: '/documents',
      });
      return { success: false, error: err.message };
    }
  }, [uploadWebhookUrl]);

  /**
   * Trigger an analysis run — POSTs document IDs + metadata to the analysis webhook.
   * NOTE: Analysis.jsx performs its own fetch directly to VITE_N8N_WEBHOOK_URL so it
   * can read and map the response body. This method is kept for backwards compatibility.
   */
  const triggerAnalysis = useCallback(async () => {
    if (!analysisWebhookUrl) return { success: false, skipped: true };

    const payload = {
      triggeredAt: new Date().toISOString(),
      documents: docs
        .filter((d) => d.status === 'Ready')
        .map(({ id, name, type, uploadedAt }) => ({ id, name, type, uploadedAt })),
    };

    const res = await fetch(analysisWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: res.ok, status: res.status };
  }, [analysisWebhookUrl, docs]);

  const deleteDocument = useCallback((id) => {
    void deleteCachedDocFile(id).catch(() => {});
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearAllDocuments = useCallback(() => {
    void clearCachedDocFiles().catch(() => {});
    setDocs([]);
  }, []);

  return (
    <DocumentsContext.Provider
      value={{
        docs,
        uploadDocument,
        deleteDocument,
        clearAllDocuments,
        triggerAnalysis,
        uploadWebhookUrl,
        saveUploadWebhook,
        analysisWebhookUrl,
        saveAnalysisWebhook,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export const useDocuments = () => useContext(DocumentsContext);
