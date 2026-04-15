import { useState } from 'react';
import { CheckCircledIcon, ExitIcon } from '@radix-ui/react-icons';
import Sidebar, { MobileMenuButton } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AppLayout({ children, title, actions }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main content */}
      <div className="lg:pl-60 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-blue-50/80 backdrop-blur-sm border-b border-slate-300 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <MobileMenuButton onClick={() => setMobileOpen(true)} />
              <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-slate-300 flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center">
                  <CheckCircledIcon width={16} height={16} className="text-white" />
                </div>
                <span className="text-slate-900 font-semibold text-sm">DiligenceAI</span>
              </div>
              {title && (
                <h1 className="text-slate-900 font-semibold text-base sm:text-lg leading-tight truncate">
                  {title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {session?.user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2 rounded-sm border border-slate-300 hover:bg-blue-100/50 transition-colors"
                >
                  <ExitIcon width={15} height={15} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              )}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
