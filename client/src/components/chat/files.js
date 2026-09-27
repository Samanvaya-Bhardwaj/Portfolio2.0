/** Mirrors the server allow-list in server/src/services/chatFiles.js (the server has the final say). */
export const ACCEPT = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EXTENSIONS = ACCEPT.split(',');

/** Returns a user-facing problem with the file, or '' when it can be sent. */
export function checkFile(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!EXTENSIONS.includes(ext)) return 'That file type isn’t supported. Send a PDF, Word document, text file or image.';
  if (file.size > MAX_FILE_BYTES) return 'That file is larger than 5 MB.';
  if (file.size === 0) return 'That file is empty.';
  return '';
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Hands a downloaded blob to the browser as a file save. */
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
