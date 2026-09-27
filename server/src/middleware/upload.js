import multer from 'multer';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES, cleanFileName, identifyFile } from '../services/chatFiles.js';
import { ApiError } from '../utils/ApiError.js';

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 6, fieldSize: 4 * 1024 },
}).single('file');

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `File is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`,
  LIMIT_FILE_COUNT: 'Send one file at a time',
  LIMIT_UNEXPECTED_FILE: 'Send one file at a time, in the "file" field',
};

/**
 * Parses a single-file multipart upload and checks it against the allow-list.
 * On success `req.chatFile` is `{ name, buffer, kind }` and `req.body` holds the text fields.
 */
export function chatFileUpload(req, res, next) {
  parser(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return next(new ApiError(status, MULTER_MESSAGES[err.code] || 'Could not read the upload'));
    }
    if (!req.file) return next(ApiError.badRequest('Attach a file in the "file" field'));

    // Browsers send multipart filenames as UTF-8, but busboy decodes them as latin1.
    const name = cleanFileName(Buffer.from(req.file.originalname, 'latin1').toString('utf8'));
    const kind = identifyFile(name, req.file.buffer);
    if (!kind) {
      return next(ApiError.badRequest(`Unsupported or corrupted file. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    req.chatFile = { name, buffer: req.file.buffer, kind };
    req.body ??= {};
    next();
  });
}
