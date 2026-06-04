// ============================================
// ANVEXS - AES-256-CBC Payload Encryption
// All API request bodies are decrypted here.
// All API responses are encrypted before send.
// ============================================
import CryptoJS from 'crypto-js';
import { logger } from '../config/logger.js';

const SECRET_KEY = process.env.AES_SECRET_KEY || 'AnvexsAES256SecretKey2024Secure!';
const IV_STRING  = process.env.AES_IV || 'AnvexsIV16Bytes!';

// Derive a 256-bit key and 128-bit IV using CryptoJS WordArray
const getKeyAndIV = () => {
  const key = CryptoJS.enc.Utf8.parse(SECRET_KEY.padEnd(32, '0').slice(0, 32));
  const iv  = CryptoJS.enc.Utf8.parse(IV_STRING.padEnd(16, '0').slice(0, 16));
  return { key, iv };
};

/**
 * Encrypt a plain-text string → Base64 ciphertext
 */
export const encryptPayload = (plainText) => {
  const { key, iv } = getKeyAndIV();
  const encrypted = CryptoJS.AES.encrypt(
    typeof plainText === 'string' ? plainText : JSON.stringify(plainText),
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return encrypted.toString(); // Base64 encoded
};

/**
 * Decrypt a Base64 ciphertext → parsed JS object or raw string
 */
export const decryptPayload = (cipherText) => {
  const { key, iv } = getKeyAndIV();
  const bytes = CryptoJS.AES.decrypt(cipherText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
};

// ── Express Middleware: Decrypt incoming requests ──
export const decryptRequest = (req, res, next) => {
  // Only decrypt if the X-Encrypted header is present
  if (req.headers['x-encrypted'] !== 'true') {
    return next();
  }

  if (!req.body?.data) {
    return next();
  }

  try {
    const decrypted = decryptPayload(req.body.data);
    req.body = typeof decrypted === 'object' ? decrypted : { raw: decrypted };
    logger.debug(`[DECRYPT] ${req.method} ${req.path}`);
    next();
  } catch (error) {
    logger.warn(`[DECRYPT] Failed on ${req.path}: ${error.message}`);
    return res.status(400).json({ success: false, message: 'Invalid encrypted payload.' });
  }
};

// ── Express Middleware: Encrypt outgoing responses ──
export const encryptResponse = (req, res, next) => {
  // Only encrypt if client requests it
  if (req.headers['x-encrypted'] !== 'true') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      const encrypted = encryptPayload(body);
      res.setHeader('Content-Type', 'application/json');
      originalJson({ data: encrypted });
    } catch (error) {
      logger.error('[ENCRYPT] Response encryption failed:', error.message);
      originalJson(body); // Fallback to plain JSON
    }
  };

  next();
};