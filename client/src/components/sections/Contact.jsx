import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Section from '../ui/Section.jsx';
import Reveal from '../ui/Reveal.jsx';
import Icon from '../ui/Icon.jsx';
import { api } from '../../api/client.js';

const EMPTY = { name: '', email: '', subject: '', message: '', website: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = 'Please enter your name';
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Please enter a valid email';
  if (v.message.trim().length < 10) errors.message = 'Message should be at least 10 characters';
  return errors;
}

function Field({ id, label, error, children, optional }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Contact({ profile }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [serverError, setServerError] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setStatus('sending');
    setServerError('');
    try {
      await api.sendMessage(values);
      setStatus('sent');
      setValues(EMPTY);
    } catch (err) {
      setStatus('error');
      setErrors(err.fieldErrors || {});
      setServerError(err.message);
    }
  };

  const aria = (name) => ({
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `contact-${name}-error` : undefined,
  });

  return (
    <Section
      id="contact"
      index="07"
      eyebrow="Contact"
      title="Let’s talk."
      intro="Have a question, an opportunity or feedback on my work? Send a message and it lands straight in my inbox."
      className="contact-section"
    >
      <div className="contact-grid">
        <Reveal className="contact-aside">
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="card contact-link">
              <span className="contact-link-icon">
                <Icon name="mail" size={20} />
              </span>
              <span>
                <span className="card-kicker">Email</span>
                <span className="contact-link-value">{profile.email}</span>
              </span>
              <Icon name="arrowUpRight" size={18} className="contact-link-arrow" />
            </a>
          )}
          {profile.location && (
            <div className="card contact-link is-static">
              <span className="contact-link-icon">
                <Icon name="mapPin" size={20} />
              </span>
              <span>
                <span className="card-kicker">Location</span>
                <span className="contact-link-value">{profile.location}</span>
              </span>
            </div>
          )}
        </Reveal>

        <Reveal as="form" className="card contact-form" onSubmit={onSubmit} noValidate delay={0.1} aria-label="Contact form">
          <div className="form-row">
            <Field id="contact-name" label="Name" error={errors.name}>
              <input id="contact-name" name="name" autoComplete="name" value={values.name} onChange={onChange} maxLength={100} {...aria('name')} />
            </Field>
            <Field id="contact-email" label="Email" error={errors.email}>
              <input id="contact-email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} maxLength={200} {...aria('email')} />
            </Field>
          </div>
          <Field id="contact-subject" label="Subject" optional error={errors.subject}>
            <input id="contact-subject" name="subject" value={values.subject} onChange={onChange} maxLength={160} />
          </Field>
          <Field id="contact-message" label="Message" error={errors.message}>
            <textarea id="contact-message" name="message" rows={5} value={values.message} onChange={onChange} maxLength={5000} {...aria('message')} />
          </Field>

          {/* Honeypot — hidden from people and assistive tech, filled only by bots. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={onChange} />
          </div>

          <div className="form-foot">
            <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send message'} <Icon name="send" size={16} />
            </button>
            <AnimatePresence mode="wait">
              {status === 'sent' && (
                <motion.p key="ok" className="form-status is-success" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Icon name="check" size={16} /> Thanks — your message was sent.
                </motion.p>
              )}
              {status === 'error' && serverError && (
                <motion.p key="err" className="form-status is-error" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {serverError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
