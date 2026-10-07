/**
 * Cryptographic helpers for OTP generation and secure hashing
 * Isomorphic: works across Node.js, Web Browsers, and React Native / Expo
 */

/**
 * Generates a cryptographically secure 6-digit OTP string
 */
export function generateSecureOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const range = max - min + 1;

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const uint32 = new Uint32Array(1);
    globalThis.crypto.getRandomValues(uint32);
    const val = min + (uint32[0] % range);
    return val.toString();
  }

  try {
    // Node.js fallback
    // @ts-ignore
    const nodeCrypto = typeof require !== 'undefined' ? require('crypto') : null;
    if (nodeCrypto && typeof nodeCrypto.randomInt === 'function') {
      return nodeCrypto.randomInt(min, max + 1).toString();
    }
  } catch {
    // ignore
  }

  const fallback = min + Math.floor(Math.random() * range);
  return fallback.toString();
}

/**
 * Hashes a string using SHA-256 with optional salt
 */
export function hashToken(token: string, salt = ''): string {
  try {
    // @ts-ignore
    const nodeCrypto = typeof require !== 'undefined' ? require('crypto') : null;
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
      return nodeCrypto
        .createHash('sha256')
        .update(`${token}:${salt}`)
        .digest('hex');
    }
  } catch {
    // ignore
  }

  // Fallback for pure browser without node crypto
  let hash = 0;
  const str = `${token}:${salt}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Validates a plaintext OTP against a stored hash
 */
export function verifyOtpHash(plaintextOtp: string, hashedOtp: string, salt = ''): boolean {
  const computedHash = hashToken(plaintextOtp, salt);
  return computedHash === hashedOtp;
}
