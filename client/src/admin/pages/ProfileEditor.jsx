import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ResourceForm from '../components/ResourceForm.jsx';
import { useToast } from '../components/Toast.jsx';
import { PROFILE_FIELDS } from '../resources.js';
import { fieldErrorsFrom } from '../errors.js';

export default function ProfileEditor() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errors, setErrors] = useState({});
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        setProfile(p);
        setStatus('ready');
      })
      .catch((err) => {
        // 404 means no profile yet — start from an empty form.
        setProfile(err.status === 404 ? {} : null);
        setStatus(err.status === 404 ? 'ready' : 'error');
      });
  }, []);

  const onSubmit = async (payload) => {
    setErrors({});
    try {
      const saved = await api.saveProfile(payload);
      setProfile(saved);
      setFormKey((k) => k + 1);
      toast('Profile saved and pushed to the live site');
    } catch (err) {
      setErrors(fieldErrorsFrom(err, PROFILE_FIELDS));
      toast(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Profile</h1>
          <p className="muted">Hero, about and contact details.</p>
        </div>
      </header>
      {status === 'loading' && <div className="loader" role="status" aria-label="Loading" />}
      {status === 'error' && <p className="form-status is-error">Could not load profile.</p>}
      {status === 'ready' && (
        <div className="card admin-panel">
          <ResourceForm key={formKey} fields={PROFILE_FIELDS} initial={profile} onSubmit={onSubmit} errors={errors} submitLabel="Save profile" />
        </div>
      )}
    </div>
  );
}
