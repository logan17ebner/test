import { useState, useEffect, useMemo } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../utils/notifications';

export default function DashboardNotificationBell({ errorCount = 0 }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((t) => t + 1);
    window.addEventListener('dd-notifications-changed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('dd-notifications-changed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const list = useMemo(() => getNotifications(), [version]);
  const unread = useMemo(() => unreadNotificationCount(), [version]);
  const showDot = unread > 0 || errorCount > 0;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        type="button"
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={2} />
        {showDot && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="z-50 mt-2 w-[min(100vw-2rem,22rem)] origin-top-right rounded-2xl border border-slate-200 bg-white py-2 shadow-xl focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
          <p className="text-slate-800 text-sm font-semibold">Notifications</p>
          {list.some((n) => !n.read) && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Mark all read
            </button>
          )}
        </div>

        {errorCount > 0 && (
          <div className="mx-2 mt-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-800">
            {errorCount} document{errorCount !== 1 ? 's have' : ' has'} an error —{' '}
            <Link to="/documents" className="font-semibold underline">
              Review documents
            </Link>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto py-1">
          {list.length === 0 ? (
            <p className="px-4 py-6 text-center text-slate-500 text-sm">No notifications yet</p>
          ) : (
            list.slice(0, 25).map((n) => (
              <MenuItem key={n.id}>
                {({ focus }) => (
                  <div
                    className={`px-4 py-2.5 border-b border-slate-50 last:border-0 ${
                      focus ? 'bg-slate-50' : ''
                    } ${!n.read ? 'bg-blue-50/40' : ''}`}
                  >
                    {n.href ? (
                      <Link
                        to={n.href}
                        onClick={() => markNotificationRead(n.id)}
                        className="block text-left"
                      >
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                        )}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </MenuItem>
            ))
          )}
        </div>
      </MenuItems>
    </Menu>
  );
}
