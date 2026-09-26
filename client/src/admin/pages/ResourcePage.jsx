import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../../components/ui/Icon.jsx';
import useAdminResource from '../hooks/useAdminResource.js';
import ResourceForm from '../components/ResourceForm.jsx';
import Drawer from '../components/Drawer.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { RESOURCES } from '../resources.js';
import { fieldErrorsFrom } from '../errors.js';

export default function ResourcePage({ resource }) {
  const config = RESOURCES[resource];
  const toast = useToast();
  const { items, status, error, reload, create, update, remove } = useAdminResource(resource);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${config.primary(item)} ${config.secondary(item)}`.toLowerCase().includes(q));
  }, [items, query, config]);

  // Offer existing values (e.g. skill categories) as suggestions in the form.
  const suggestions = useMemo(
    () => ({ category: [...new Set(items.map((i) => i.category).filter(Boolean))] }),
    [items],
  );

  const close = useCallback(() => {
    setEditing(null);
    setErrors({});
  }, []);

  const onSubmit = async (payload) => {
    setErrors({});
    try {
      if (editing === 'new') {
        await create(payload);
        toast(`Added ${config.singular}`);
      } else {
        await update(editing.id, payload);
        toast(`Updated ${config.singular}`);
      }
      close();
    } catch (err) {
      setErrors(fieldErrorsFrom(err, config.fields));
      toast(err.message, 'error');
    }
  };

  const toggleVisible = async (item) => {
    try {
      await update(item.id, { visible: !item.visible });
      toast(item.visible ? 'Hidden from site' : 'Now visible on site');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const onDelete = async (item) => {
    try {
      await remove(item.id);
      toast(`Deleted ${config.singular}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>{config.label}</h1>
          <p className="muted">
            {items.length} {items.length === 1 ? 'entry' : 'entries'} · {items.filter((i) => !i.visible).length} hidden
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> New {config.singular}
        </button>
      </header>

      {items.length > 6 && (
        <input
          type="search"
          className="admin-search"
          placeholder={`Search ${config.label.toLowerCase()}…`}
          aria-label={`Search ${config.label}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {status === 'loading' && <div className="loader" role="status" aria-label="Loading" />}
      {status === 'error' && (
        <div className="form-status is-error" role="alert">
          {error?.message}{' '}
          <button type="button" className="link" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {status === 'ready' && filtered.length === 0 && (
        <div className="card empty-state">
          <Icon name={config.icon} size={24} />
          <p>{query ? 'No matches.' : `No ${config.label.toLowerCase()} yet.`}</p>
        </div>
      )}

      <ul className="resource-list">
        <AnimatePresence initial={false}>
          {filtered.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`card resource-row ${item.visible ? '' : 'is-hidden'}`}
            >
              <span className="row-order mono" title="Display order">
                {item.order ?? 0}
              </span>
              <button type="button" className="row-main" onClick={() => setEditing(item)}>
                <span className="row-title">{config.primary(item)}</span>
                <span className="row-sub">{config.secondary(item)}</span>
              </button>
              {!item.visible && <span className="badge badge-muted">Hidden</span>}
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => toggleVisible(item)}
                  aria-label={item.visible ? 'Hide from site' : 'Show on site'}
                  title={item.visible ? 'Hide from site' : 'Show on site'}
                >
                  <Icon name={item.visible ? 'eye' : 'eyeOff'} size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => setEditing(item)} aria-label="Edit" title="Edit">
                  <Icon name="edit" size={16} />
                </button>
                <ConfirmButton onConfirm={() => onDelete(item)} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <Drawer open={Boolean(editing)} onClose={close} title={editing === 'new' ? `New ${config.singular}` : `Edit ${config.singular}`}>
        {editing && (
          <ResourceForm
            key={editing === 'new' ? 'new' : editing.id}
            fields={config.fields}
            initial={editing === 'new' ? config.defaults : editing}
            onSubmit={onSubmit}
            onCancel={close}
            errors={errors}
            suggestions={suggestions}
            submitLabel={editing === 'new' ? 'Create' : 'Save changes'}
          />
        )}
      </Drawer>
    </div>
  );
}
