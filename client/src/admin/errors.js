/**
 * Maps server validation details to form field names. Nested array paths such as
 * "highlights.2" are attributed to their parent field; "socials.github" stays as-is.
 */
export function fieldErrorsFrom(err, fields) {
  const names = new Set(fields.map((f) => f.name));
  const out = {};
  for (const { field, message } of err?.details || []) {
    let key = field;
    while (key && !names.has(key)) key = key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : '';
    if (key && !out[key]) out[key] = message;
  }
  return out;
}
