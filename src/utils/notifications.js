const STORAGE_KEY = 'dd_notifications';
const MAX_ITEMS = 80;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new CustomEvent('dd-notifications-changed'));
}

export function getNotifications() {
  return load();
}

export function unreadNotificationCount() {
  return load().filter((n) => !n.read).length;
}

export function pushNotification({ type = 'info', title, body, href }) {
  const list = load();
  list.unshift({
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    body,
    href: href || null,
    read: false,
    createdAt: new Date().toISOString(),
  });
  save(list);
}

export function markNotificationRead(id) {
  const list = load().map((n) => (n.id === id ? { ...n, read: true } : n));
  save(list);
}

export function markAllNotificationsRead() {
  const list = load().map((n) => ({ ...n, read: true }));
  save(list);
}
