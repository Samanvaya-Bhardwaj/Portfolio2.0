import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import ProfileEditor from './pages/ProfileEditor.jsx';
import ResourcePage from './pages/ResourcePage.jsx';
import Messages from './pages/Messages.jsx';
import Account from './pages/Account.jsx';
import { RESOURCES } from './resources.js';
import '../styles/admin.css';

function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') {
    return (
      <div className="page-state" role="status">
        <span className="loader" aria-hidden="true" />
        <p className="mono muted">verifying session…</p>
      </div>
    );
  }
  if (status !== 'authenticated') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function AdminApp() {
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    const prevTitle = document.title;
    document.title = 'Admin · Portfolio';
    return () => {
      robots.remove();
      document.title = prevTitle;
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="profile" element={<ProfileEditor />} />
            {Object.keys(RESOURCES).map((key) => (
              <Route key={key} path={key} element={<ResourcePage key={key} resource={key} />} />
            ))}
            <Route path="messages" element={<Messages />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
