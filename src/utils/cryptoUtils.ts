/**
 * Crypto helper utilities for password hashing using Web Crypto API SHA-256
 */

export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(inputPassword: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) {
    // If no password set in database record, accept fallback default
    return true;
  }
  const inputHash = await hashPassword(inputPassword);
  return inputHash.toLowerCase() === storedHash.toLowerCase();
}
