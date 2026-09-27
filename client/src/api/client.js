const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;
const TOKEN_KEY = 'portfolio.admin.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode) — session lasts until reload */
    }
  },
};

export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }

  /** Map of field → message, handy for highlighting form inputs. */
  get fieldErrors() {
    return Object.fromEntries((this.details || []).map((d) => [d.field, d.message]));
  }
}

/** `body` may be JSON-able or a FormData (multipart). `as: 'blob'` returns the raw response body. */
async function request(path, { method = 'GET', body, auth = false, signal, headers: extra, as = 'json' } = {}) {
  const headers = { Accept: 'application/json', ...extra };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined || isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error — is the API server running?');
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(res.status, payload?.error?.message || res.statusText, payload?.error?.details);
  }
  if (as === 'blob') return res.blob();
  return res.json().catch(() => ({}));
}

/** Multipart body from a plain object, skipping empty fields. */
function formData(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== '' && fd.append(k, v));
  return fd;
}

const chatHeaders = (token) => (token ? { 'X-Chat-Token': token } : undefined);

export const api = {
  // Public
  portfolio: (opts) => request('/portfolio', opts).then((r) => r.data),
  sendMessage: (body) => request('/messages', { method: 'POST', body }),

  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body }).then((r) => r.data),
  me: () => request('/auth/me', { auth: true }).then((r) => r.data.admin),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body, auth: true }),

  // Admin
  stats: () => request('/admin/stats', { auth: true }).then((r) => r.data),
  getProfile: () => request('/profile', { auth: true }).then((r) => r.data),
  saveProfile: (body) => request('/profile', { method: 'PUT', body, auth: true }).then((r) => r.data),

  list: (resource) => request(`/${resource}`, { auth: true }).then((r) => r.data),
  create: (resource, body) => request(`/${resource}`, { method: 'POST', body, auth: true }).then((r) => r.data),
  update: (resource, id, body) =>
    request(`/${resource}/${id}`, { method: 'PUT', body, auth: true }).then((r) => r.data),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE', auth: true }),

  messages: () => request('/messages', { auth: true }),
  markMessage: (id, read) => request(`/messages/${id}`, { method: 'PATCH', body: { read }, auth: true }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE', auth: true }),

  chats: () => request('/chats', { auth: true }).then((r) => r.data),
  chat: (id) => request(`/chats/${id}`, { auth: true }).then((r) => r.data),
  replyChat: (id, text) => request(`/chats/${id}/messages`, { method: 'POST', body: { text }, auth: true }).then((r) => r.data),
  markChatRead: (id) => request(`/chats/${id}/read`, { method: 'POST', auth: true }).then((r) => r.data),
  deleteChat: (id) => request(`/chats/${id}`, { method: 'DELETE', auth: true }),
  sendAdminChatFile: (id, file, text = '') =>
    request(`/chats/${id}/files`, { method: 'POST', body: formData({ text, file }), auth: true }).then((r) => r.data),

  // Live chat files. Visitors authenticate with their chat session token, admins with their JWT.
  sendChatFile: (file, { token, name = '', email = '', text = '' } = {}) =>
    request('/chat/files', { method: 'POST', body: formData({ name, email, text, file }), headers: chatHeaders(token) }).then((r) => r.data),
  chatFile: (fileId, { token } = {}) =>
    request(`/chat/files/${fileId}`, { auth: !token, headers: chatHeaders(token), as: 'blob' }),
};
