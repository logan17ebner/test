import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from './LoginScreen';

export default function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <LoginScreen />;
  }

  return <Outlet />;
}
