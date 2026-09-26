import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client.js';
import { refreshSocketAuth } from '../api/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'anonymous'));

  const logout = useCallback(() => {
    tokenStore.set(null);
    setAdmin(null);
    setStatus('anonymous');
    refreshSocketAuth();
  }, []);

  // Validate a stored token on first load.
  useEffect(() => {
    if (status !== 'checking') return;
    api
      .me()
      .then((a) => {
        setAdmin(a);
        setStatus('authenticated');
      })
      .catch(logout);
  }, [status, logout]);

  // Any authenticated request that comes back 401 ends the session.
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const { token, admin: a } = await api.login(credentials);
    tokenStore.set(token);
    setAdmin(a);
    setStatus('authenticated');
    refreshSocketAuth();
    return a;
  }, []);

  const value = useMemo(() => ({ admin, status, login, logout }), [admin, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
