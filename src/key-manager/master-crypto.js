/**
 * Master Password Encryption Module for Key Manager
 * 
 * Uses Argon2id for key derivation and XChaCha20-Poly1305 for vault encryption.
 * 
 * Security Parameters:
 * - Argon2id: 256 MiB memory, 3 iterations, 32-byte output
 * - XChaCha20-Poly1305: AEAD cipher with 24-byte nonce, 16-byte tag
 */

import { getSodium } from '../crypto.js';

/**
 * Derive a 256-bit (32-byte) master key from a password using Argon2id
 * 
 * Uses libsodium's crypto_pwhash with the following parameters:
 * - Algorithm: Argon2id v1.3 (sodium.crypto_pwhash_ALG_ARGON2ID13)
 * - Output length: 32 bytes (256 bits)
 * - Operations limit: 3 iterations
 * - Memory limit: 256 MiB (262144 KB)
 * 
 * @param {string} password - The master password to derive the key from
 * @param {Uint8Array} salt - A 16-byte (128-bit) random salt. Must be unique per vault.
 * @returns {Uint8Array} A 32-byte Uint8Array containing the derived master key
 * @throws {Error} If salt is not exactly 16 bytes
 * @throws {Error} If crypto is not initialized
 */
export function deriveMasterKey(password, salt) {
  const sodium = getSodium();
  
  // Validate salt length (must be exactly 16 bytes for Argon2id)
  if (salt.length !== 16) {
    throw new Error(`Salt must be exactly 16 bytes, got ${salt.length}`);
  }
  
  // Convert password string to Uint8Array
  const passwordBytes = sodium.from_string(password);
  
  // Derive key using Argon2id with specified parameters:
  // - 32 bytes output (256-bit key)
  // - 10 iterations (opslimit) - consistent with crypto.js
  // - 256 MiB memory (262144 KB)
  // - Argon2id v1.3 algorithm
  const key = sodium.crypto_pwhash(
    32,                           // outputLength: 32 bytes (256 bits)
    passwordBytes,                // password: Uint8Array
    salt,                         // salt: Uint8Array (16 bytes)
    10,                           // opsLimit: 10 iterations
    262144,                       // memLimit: 256 MiB in KB (262144)
    sodium.crypto_pwhash_ALG_ARGON2ID13  // algorithm: Argon2id v1.3
  );
  
  return key;
}

/**
 * Encrypt vault data using XChaCha20-Poly1305
 * 
 * XChaCha20-Poly1305 is an AEAD (Authenticated Encryption with Associated Data) cipher
 * that provides both confidentiality and authenticity. The extended nonce (24 bytes)
 * allows for safe random nonce generation without collision concerns.
 * 
 * @param {Object} vaultData - The vault data object to encrypt (will be JSON serialized)
 * @param {Uint8Array} masterKey - The 32-byte master key for encryption
 * @returns {string} Base64-encoded encrypted vault (nonce + ciphertext + tag)
 * @throws {Error} If masterKey is not exactly 32 bytes
 * @throws {Error} If crypto is not initialized
 */
export function encryptVault(vaultData, masterKey) {
  const sodium = getSodium();
  
  // Validate master key length
  if (masterKey.length !== 32) {
    throw new Error(`Master key must be exactly 32 bytes, got ${masterKey.length}`);
  }
  
  // Generate random 24-byte nonce for XChaCha20-Poly1305
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  
  // Serialize vault data to JSON and convert to bytes
  const message = sodium.from_string(JSON.stringify(vaultData));
  
  // Encrypt using XChaCha20-Poly1305
  // Returns: ciphertext + 16-byte authentication tag
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,        // message to encrypt
    null,           // additional data (none for vault encryption)
    null,           // secret nonce (always null for this construction)
    nonce,          // public nonce (24 bytes)
    masterKey       // 32-byte key
  );
  
  // Combine nonce + ciphertext for storage
  // Format: [24-byte nonce][ciphertext + 16-byte tag]
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce);
  result.set(ciphertext, nonce.length);
  
  // Encode as Base64 for text storage
  return sodium.to_base64(result);
}

/**
 * Decrypt vault data using XChaCha20-Poly1305
 * 
 * Verifies the authentication tag before returning decrypted data.
 * Throws if the ciphertext has been tampered with or if the wrong key is used.
 * 
 * @param {string} encryptedVault - Base64-encoded encrypted vault (from encryptVault)
 * @param {Uint8Array} masterKey - The 32-byte master key for decryption
 * @returns {Object} The decrypted vault data object (JSON parsed)
 * @throws {Error} If decryption fails (wrong key, tampered ciphertext, or invalid format)
 * @throws {Error} If masterKey is not exactly 32 bytes
 */
export function decryptVault(encryptedVault, masterKey) {
  const sodium = getSodium();
  
  // Validate master key length
  if (masterKey.length !== 32) {
    throw new Error(`Master key must be exactly 32 bytes, got ${masterKey.length}`);
  }
  
  // Decode from Base64
  const combined = sodium.from_base64(encryptedVault);
  
  // Extract nonce and ciphertext
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = combined.slice(0, nonceLength);
  const ciphertext = combined.slice(nonceLength);
  
  // Decrypt using XChaCha20-Poly1305
  // This will throw if authentication fails (wrong key or tampered data)
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,           // secret nonce (always null for this construction)
    ciphertext,     // ciphertext + tag
    null,           // additional data (none for vault encryption)
    nonce,          // public nonce (24 bytes)
    masterKey       // 32-byte key
  );
  
  // Parse JSON and return
  return JSON.parse(sodium.to_string(decrypted));
}
