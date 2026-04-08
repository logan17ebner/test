import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dd_documents';
const WEBHOOK_KEY = 'dd_upload_webhook_url';
const ANALYSIS_WEBHOOK_KEY = 'dd_analysis_webhook_url';

const DocumentsContext = createContext(null);

/**
 * Reads file content using the FileReader API.
 *   - .txt             → readAsText()     (returns plain UTF-8 string)
 *   - .pdf/.docx/.xlsx → readAsDataURL()  (returns base64 data URI)
 *     NOTE: proper text extraction from binary formats would require a
 *     parsing library (e.g. pdf-parse, mammoth, xlsx). The base64 string
 *     is stored here so it can be forwarded to n8n for server-side parsing.
 */
function readFileContent(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);

    if (ext === 'txt') {
      reader.readAsText(file);
    } else {
      // .pdf, .docx, .xlsx — store as base64 data URI
      // NOTE: proper text extraction would require a parsing library
      reader.readAsDataURL(file);
    }
  });
}

export function DocumentsProvider({ children }) {
  const [docs, setDocs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
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

  // Persist docs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
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
    const record = {
      id,
      name: file.name,
      type: ext,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadedAt: new Date().toISOString(),
      status: 'Uploading',
      webhookStatus: null,
      webhookResponse: null,
      content: null,
    };

    setDocs((prev) => [record, ...prev]);

    // Read file content and attach it to the doc so Analysis can forward it to n8n
    const content = await readFileContent(file);
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, content } : d))
    );

    if (!uploadWebhookUrl) {
      // No upload webhook configured — mark as Ready so it's eligible for analysis
      setDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: 'Ready', webhookStatus: 'skipped' } : d
        )
      );
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

      return { success: res.ok, status: res.status };
    } catch (err) {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, status: 'Error', webhookStatus: 'error', webhookResponse: err.message }
            : d
        )
      );
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
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearAllDocuments = useCallback(() => {
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
