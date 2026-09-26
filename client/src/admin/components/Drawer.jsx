import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../../components/ui/Icon.jsx';

/** Slide-over panel for editing. Closes on Escape or backdrop click; focuses itself on open. */
export default function Drawer({ open, title, onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    panel.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer-root">
          <motion.div className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            ref={panel}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <header className="drawer-head">
              <h2>{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="drawer-body">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
