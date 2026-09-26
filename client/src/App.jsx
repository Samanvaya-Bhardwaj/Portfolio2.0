import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';

// The dashboard is its own chunk — public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function NotFound() {
  return (
    <div className="page-state">
      <p className="mono eyebrow-plain">404</p>
      <p className="muted">This page doesn’t exist.</p>
      <a href="/" className="btn btn-ghost">
        Back home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PortfolioProvider>
                <PortfolioPage />
              </PortfolioProvider>
            }
          />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="page-state"><span className="loader" /></div>}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
