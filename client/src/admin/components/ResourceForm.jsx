import { useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

// ── dot-path helpers (for nested fields like "socials.github") ──────────────
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, value) {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { ...obj, [head]: value };
  return { ...obj, [head]: setPath(obj?.[head] ?? {}, rest.join('.'), value) };
}

/** Converts stored values into what the inputs edit (arrays → text, null → ''). */
function toFormValues(fields, source) {
  let values = {};
  for (const f of fields) {
    const raw = getPath(source, f.name);
    let v;
    if (f.type === 'list') v = (raw || []).join('\n');
    else if (f.type === 'tags') v = (raw || []).join(', ');
    else if (f.type === 'checkbox') v = Boolean(raw);
    else if (f.type === 'pairs') v = (raw || []).map((item) => ({ ...item }));
    else v = raw ?? '';
    values = setPath(values, f.name, v);
  }
  return values;
}

/** Converts input values back into the API payload shape. */
function toPayload(fields, values) {
  let out = {};
  for (const f of fields) {
    const v = getPath(values, f.name);
    let result;
    if (f.type === 'list') result = String(v).split('\n').map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'tags') result = String(v).split(',').map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'number') result = v === '' || v == null ? null : Number(v);
    else if (f.type === 'pairs')
      result = v
        .map((item) => Object.fromEntries(f.keys.map(({ key }) => [key, (item[key] || '').trim()])))
        .filter((item) => Object.values(item).some(Boolean));
    else if (typeof v === 'string') result = v.trim();
    else result = v;
    out = setPath(out, f.name, result);
  }
  return out;
}

function PairsField({ field, value, onChange }) {
  const update = (i, key, v) => onChange(value.map((item, idx) => (idx === i ? { ...item, [key]: v } : item)));
  const add = () => onChange([...value, Object.fromEntries(field.keys.map(({ key }) => [key, '']))]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const canAdd = !field.max || value.length < field.max;

  return (
    <div className="pairs">
      {value.map((item, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="pair-row">
          {field.keys.map(({ key, label, textarea }) => {
            const id = `${field.name}-${i}-${key}`;
            const Input = textarea ? 'textarea' : 'input';
            return (
              <div key={key} className="field">
                <label htmlFor={id}>{label}</label>
                <Input id={id} rows={textarea ? 3 : undefined} value={item[key] || ''} onChange={(e) => update(i, key, e.target.value)} />
              </div>
            );
          })}
          <button type="button" className="icon-btn danger" onClick={() => remove(i)} aria-label={`Remove ${field.itemLabel} ${i + 1}`}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      ))}
      {canAdd && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
          <Icon name="plus" size={15} /> Add {field.itemLabel || 'item'}
        </button>
      )}
    </div>
  );
}

/** Generic form rendered from a field config. Server validation errors are shown per field. */
export default function ResourceForm({ fields, initial, onSubmit, onCancel, submitLabel = 'Save', errors = {}, suggestions = {} }) {
  const startValues = useMemo(() => toFormValues(fields, initial || {}), [fields, initial]);
  const [values, setValues] = useState(startValues);
  const [submitting, setSubmitting] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(startValues);

  const set = (name, v) => setValues((prev) => setPath(prev, name, v));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(toPayload(fields, values));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {fields.map((f) => {
          const id = `f-${f.name.replace('.', '-')}`;
          const value = getPath(values, f.name);
          const error = errors[f.name];
          const common = {
            id,
            name: f.name,
            'aria-invalid': Boolean(error),
            'aria-describedby': error ? `${id}-err` : f.help ? `${id}-help` : undefined,
          };

          let control;
          switch (f.type) {
            case 'textarea':
            case 'list':
              control = <textarea {...common} rows={f.rows || 4} value={value} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />;
              break;
            case 'checkbox':
              control = (
                <label className="switch" htmlFor={id}>
                  <input {...common} type="checkbox" checked={value} onChange={(e) => set(f.name, e.target.checked)} />
                  <span className="switch-track" aria-hidden="true" />
                  <span>{f.label}</span>
                </label>
              );
              break;
            case 'pairs':
              control = <PairsField field={f} value={value} onChange={(v) => set(f.name, v)} />;
              break;
            default: {
              const listId = f.suggest && suggestions[f.suggest]?.length ? `${id}-list` : undefined;
              control = (
                <>
                  <input
                    {...common}
                    type={f.type === 'tags' ? 'text' : f.type}
                    value={value}
                    required={f.required}
                    placeholder={f.placeholder}
                    list={listId}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                  {listId && (
                    <datalist id={listId}>
                      {suggestions[f.suggest].map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </>
              );
            }
          }

          return (
            <div key={f.name} className={`field ${f.half ? 'half' : ''} ${error ? 'has-error' : ''} ${f.type === 'checkbox' ? 'is-checkbox' : ''}`}>
              {f.type !== 'checkbox' && (
                <label htmlFor={f.type === 'pairs' ? undefined : id}>
                  {f.label}
                  {f.required && <span className="req" aria-hidden="true"> *</span>}
                </label>
              )}
              {control}
              {f.help && !error && (
                <p className="field-help" id={`${id}-help`}>
                  {f.help}
                </p>
              )}
              {error && (
                <p className="field-error" id={`${id}-err`} role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting || (initial?.id && !dirty)}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
