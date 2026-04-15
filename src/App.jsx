import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DocumentsProvider } from './context/DocumentsContext';
import AuthGate from './components/AuthGate';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Analysis from './pages/Analysis';
import Settings from './pages/Settings';

export default function App() {
  return (
    <DocumentsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AuthGate />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DocumentsProvider>
  );
}
