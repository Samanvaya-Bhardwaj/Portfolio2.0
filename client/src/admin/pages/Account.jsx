import { useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Account() {
  const { admin } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 10) return setError('New password must be at least 10 characters.');
    if (form.newPassword !== form.confirm) return setError('New passwords do not match.');
    setSaving(true);
    try {
      await api.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Account</h1>
          <p className="muted">Signed in as {admin?.email}</p>
        </div>
      </header>

      <form className="card admin-panel narrow" onSubmit={onSubmit} noValidate>
        <h2>Change password</h2>
        <div className="field">
          <label htmlFor="cur-pw">Current password</label>
          <input id="cur-pw" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
        </div>
        <div className="field">
          <label htmlFor="new-pw">New password</label>
          <input id="new-pw" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} />
          <p className="field-help">At least 10 characters.</p>
        </div>
        <div className="field">
          <label htmlFor="confirm-pw">Confirm new password</label>
          <input id="confirm-pw" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </div>
        {error && (
          <p className="form-status is-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
