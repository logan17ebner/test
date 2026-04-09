import { pushNotification } from './notifications';

const PENDING_KEY = 'dd_pending_analysis_reviews';
const APPROVED_KEY = 'dd_approved_analysis';

function loadPending() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function savePending(list) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('dd-pending-analysis-changed'));
}

export function getPendingReviews() {
  return loadPending();
}

export function addPendingReview({ submissionId, companyName, analysis }) {
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const list = loadPending();
  list.push({
    id,
    submissionId,
    companyName: companyName || 'Unknown Company',
    analysis,
    receivedAt: new Date().toISOString(),
  });
  savePending(list);
  return id;
}

export function getApprovedRecord() {
  try {
    const r = JSON.parse(localStorage.getItem(APPROVED_KEY) || 'null');
    return r && r.analysis ? r : null;
  } catch {
    return null;
  }
}

function setApprovedRecord(record) {
  if (record) {
    localStorage.setItem(APPROVED_KEY, JSON.stringify(record));
  } else {
    localStorage.removeItem(APPROVED_KEY);
  }
  window.dispatchEvent(new CustomEvent('dd-approved-analysis-updated'));
}

export function approvePendingReview(reviewId) {
  const list = loadPending();
  const item = list.find((x) => x.id === reviewId);
  if (!item) return false;
  savePending(list.filter((x) => x.id !== reviewId));

  const pendingSession = sessionStorage.getItem('dd_last_pending_submission');
  if (pendingSession && pendingSession === item.submissionId) {
    sessionStorage.removeItem('dd_last_pending_submission');
  }

  setApprovedRecord({
    submissionId: item.submissionId,
    companyName: item.companyName,
    analysis: item.analysis,
    approvedAt: new Date().toISOString(),
  });

  try {
    const raw = localStorage.getItem('diligence_submissions');
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) {
      localStorage.setItem(
        'diligence_submissions',
        JSON.stringify(
          arr.map((s) =>
            s.id === item.submissionId ? { ...s, status: 'published' } : s
          )
        )
      );
    }
  } catch {
    /* ignore */
  }

  pushNotification({
    type: 'success',
    title: 'Analysis published',
    body: `Results for ${item.companyName} are ready to view.`,
    href: '/analysis',
  });

  return true;
}

export function rejectPendingReview(reviewId) {
  const list = loadPending();
  const item = list.find((x) => x.id === reviewId);
  if (!item) return false;
  savePending(list.filter((x) => x.id !== reviewId));

  const pendingSession = sessionStorage.getItem('dd_last_pending_submission');
  if (pendingSession && pendingSession === item.submissionId) {
    sessionStorage.removeItem('dd_last_pending_submission');
  }

  try {
    const raw = localStorage.getItem('diligence_submissions');
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) {
      localStorage.setItem(
        'diligence_submissions',
        JSON.stringify(
          arr.map((s) =>
            s.id === item.submissionId ? { ...s, status: 'rejected' } : s
          )
        )
      );
    }
  } catch {
    /* ignore */
  }

  pushNotification({
    type: 'error',
    title: 'Analysis not approved',
    body: `An administrator did not publish the run for ${item.companyName}.`,
    href: '/analysis',
  });

  return true;
}
