import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../ui/Icon.jsx';
import useActiveSection from '../../hooks/useActiveSection.js';

export const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'contact', label: 'Contact' },
];

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Navbar({ profile, ready }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(['hero', ...NAV_ITEMS.map((n) => n.id)], [ready]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock page scroll and allow Escape to close while the mobile menu is open.
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="container navbar-inner" aria-label="Primary">
        <a href="#hero" className="brand" aria-label={`${profile?.name || 'Home'} — back to top`}>
          <span className="brand-mark">{initials(profile?.name) || '··'}</span>
          <span className="brand-name">{profile?.name}</span>
        </a>

        <ul className="nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`nav-link ${active === item.id ? 'is-active' : ''}`}
                aria-current={active === item.id ? 'true' : undefined}
              >
                {item.label}
                {active === item.id && <motion.span layoutId="nav-pill" className="nav-pill" />}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {profile?.resumeUrl && (
            <a className="btn btn-ghost btn-sm hide-mobile" href={profile.resumeUrl} target="_blank" rel="noreferrer">
              <Icon name="download" size={16} /> Résumé
            </a>
          )}
          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ul>
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <a href={`#${item.id}`} onClick={() => setOpen(false)} className={active === item.id ? 'is-active' : ''}>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            {profile?.resumeUrl && (
              <a className="btn btn-primary" href={profile.resumeUrl} target="_blank" rel="noreferrer">
                <Icon name="download" size={16} /> Download résumé
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
