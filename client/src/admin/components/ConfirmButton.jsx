import { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

/** Two-step destructive button: first click arms it, second click within 3s confirms. */
export default function ConfirmButton({ onConfirm, label = 'Delete', confirmLabel = 'Confirm?' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={`icon-btn danger ${armed ? 'is-armed' : ''}`}
      aria-label={armed ? `${confirmLabel} ${label}` : label}
      title={armed ? 'Click again to confirm' : label}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? <span className="confirm-text">{confirmLabel}</span> : <Icon name="trash" size={16} />}
    </button>
  );
}
