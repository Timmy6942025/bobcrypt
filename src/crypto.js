// Work around libsodium-wrappers ESM import issue by using dynamic import
// The ESM wrapper has a relative import that doesn't resolve correctly in Bun
// Using libsodium-wrappers-sumo for Argon2id support (crypto_pwhash)
let sodium = null;

// Import format module for algorithm-agile ciphertext
import { serialize, deserialize, createMetadata, hasSelfDestructFlag, VERSION_1, KDF_ARGON2ID, CIPHER_AES_256_GCM, DEFAULT_OPSLIMIT, DEFAULT_MEMLIMIT, FLAG_SELF_DESTRUCT } from './format.js';

// Import stealth module for ciphertext obfuscation
import { applyStealth, removeStealth, STEALTH_NONE, STEALTH_NOISE, STEALTH_PADDING, STEALTH_COMBINED } from './stealth.js';

// Cryptographic constants
const NONCE_SIZE = 12; // 96 bits for AES-GCM
const AUTH_TAG_SIZE = 16; // 128 bits for AES-GCM authentication tag

/**
 * Load libsodium-wrappers-sumo (handles ESM/CJS compatibility)
 * Sumo version includes Argon2id (crypto_pwhash) which standard version lacks
 * @returns {Promise<Object>} The sodium module
 */
async function loadSodium() {
  if (sodium) return sodium;
  
  // Browser environment: use local libsodium from lib directory
  if (typeof window !== 'undefined') {
    const mod = await import('./lib/libsodium.mjs');
    sodium = mod.default || mod;
  } else {
    // Node.js/Bun environment: try dynamic import first, then require
    try {
      const mod = await import('libsodium-wrappers-sumo');
      sodium = mod.default || mod;
    } catch (e) {
      sodium = require('libsodium-wrappers-sumo');
    }
  }
  
  return sodium;
}

/**
 * Check if Web Crypto API is available (browser) or crypto.subtle (Node.js/Bun)
 * @returns {boolean} true if Web Crypto API is available
 */
export function isWebCryptoAvailable() {
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return true;
  }
  // Node.js/Bun environment - check for global crypto.subtle
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return true;
  }
  return false;
}

// Sodium instance (initialized via initCrypto)
let sodiumInstance = null;

/**
 * Get the initialized sodium instance
 * Throws if initCrypto() hasn't been called
 * @returns {Object} The sodium instance
 */
export function getSodium() {
  if (!sodiumInstance) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  return sodiumInstance;
}

/**
 * Initialize libsodium.js and verify Web Crypto API availability
 * @returns {Promise<Object>} The initialized sodium object
 * @throws {Error} If Web Crypto API is not available or libsodium fails to initialize
 */
export async function initCrypto() {
  // Check Web Crypto API availability first
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API not available');
  }

  // Load and initialize libsodium.js (WASM)
  const sodiumMod = await loadSodium();
  await sodiumMod.ready;
  sodiumInstance = sodiumMod;
  
  return sodiumMod;
}

/**
 * Get crypto capabilities status
 * @returns {Object} Status of available crypto libraries
 */
export function getCryptoStatus() {
  return {
    webCrypto: isWebCryptoAvailable(),
    libsodium: sodiumInstance !== null
  };
}

/**
 * Derive a 256-bit (32-byte) encryption key from a password using Argon2id
 * 
 * Uses libsodium's crypto_pwhash with the following parameters:
 * - Algorithm: Argon2id v1.3 (sodium.crypto_pwhash_ALG_ARGON2ID13)
 * - Output length: 32 bytes (256 bits)
 * - Operations limit: 6 iterations (sensitive opslimit)
 * - Memory limit: 64 MB (65536 KB)
 * 
 * @param {string} password - The password to derive the key from
 * @param {Uint8Array} salt - A 16-byte (128-bit) random salt. Must be unique per operation.
 * @returns {Uint8Array} A 32-byte Uint8Array containing the derived key
 * @throws {Error} If salt is not exactly 16 bytes
 * @throws {Error} If crypto is not initialized
 */
export function deriveKey(password, salt) {
  const sodium = getSodium();
  
  // Validate salt length (must be exactly 16 bytes for Argon2id)
  if (salt.length !== 16) {
    throw new Error(`Salt must be exactly 16 bytes, got ${salt.length}`);
  }
  
  // Convert password string to Uint8Array
  const passwordBytes = sodium.from_string(password);
  
  // Derive key using Argon2id with exact parameters:
  // - 32 bytes output (256-bit key for AES-256)
  // - 6 iterations (opslimit for sensitive data)
  // - 64 MB memory (65536 KB)
  // - Argon2id v1.3 algorithm
  const key = sodium.crypto_pwhash(
    32,                           // outputLength: 32 bytes (256 bits)
    passwordBytes,                // password: Uint8Array
    salt,                         // salt: Uint8Array (16 bytes)
    6,                            // opsLimit: 6 iterations
    65536,                        // memLimit: 64 MB in KB (65536)
    sodium.crypto_pwhash_ALG_ARGON2ID13  // algorithm: Argon2id v1.3
  );
  
  return key;
}

/**
 * Generate a random 128-bit (16-byte) salt for key derivation
 * 
 * Each encryption operation should use a unique salt to prevent
 * rainbow table attacks and ensure derived keys are unique.
 * 
 * @returns {Uint8Array} A 16-byte Uint8Array containing random salt
 * @throws {Error} If crypto is not initialized
 */
export function generateSalt() {
  const sodium = getSodium();
  
  // Generate 16 bytes (128 bits) of random data
  return sodium.randombytes_buf(16);
}

/**
 * Derive a key and generate a new salt in one operation
 * 
 * This is a convenience function that generates a random salt and
 * derives a key from the password using that salt.
 * 
 * @param {string} password - The password to derive the key from
 * @returns {{key: Uint8Array, salt: Uint8Array}} An object containing the derived key and the salt used
 * @throws {Error} If crypto is not initialized
 */
export function deriveKeyWithSalt(password) {
  const salt = generateSalt();
  const key = deriveKey(password, salt);
  return { key, salt };
}

/**
 * Generate a random 96-bit (12-byte) nonce for AES-GCM encryption
 * 
 * Each encryption operation MUST use a unique nonce to prevent
 * catastrophic security failures. GCM nonces must be 12 bytes.
 * 
 * @returns {Uint8Array} A 12-byte Uint8Array containing random nonce
 * @throws {Error} If crypto is not initialized
 */
export function generateNonce() {
  const sodium = getSodium();
  
  // Generate 12 bytes (96 bits) of random data for GCM nonce
  return sodium.randombytes_buf(12);
}

/**
 * Get the crypto.subtle object from Web Crypto API
 * Works in both browser and Node.js/Bun environments
 * @returns {CryptoSubtle} The subtle crypto object
 */
function getCryptoSubtle() {
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  // Node.js/Bun environment
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API not available');
}

/**
 * Derive a duress key from a duress password using a modified salt path
 * The duress salt is derived by XORing the original salt with a constant duress prefix
 * This ensures duress and primary keys are completely different
 * 
 * @param {string} duressPassword - The duress password
 * @param {Uint8Array} salt - The original 16-byte salt
 * @returns {Uint8Array} A 32-byte derived duress key
 * @throws {Error} If salt is not exactly 16 bytes
 */
export function deriveDuressKey(duressPassword, salt) {
  const sodium = getSodium();

  // Validate salt length
  if (salt.length !== 16) {
    throw new Error(`Salt must be exactly 16 bytes, got ${salt.length}`);
  }

  // Create duress salt by XORing with duress prefix
  // This ensures duress key derivation path is completely different
  const DURESS_PREFIX = new Uint8Array([
    0x44, 0x55, 0x52, 0x45, 0x53, 0x53, 0x5f, 0x4d, // "DURESS_M"
    0x4f, 0x44, 0x45, 0x5f, 0x53, 0x41, 0x4c, 0x54  // "ODE_SALT"
  ]);

  const duressSalt = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    duressSalt[i] = salt[i] ^ DURESS_PREFIX[i];
  }

  // Convert password string to Uint8Array
  const passwordBytes = sodium.from_string(duressPassword);

  // Derive key using Argon2id with same parameters as primary
  const key = sodium.crypto_pwhash(
    32,                           // outputLength: 32 bytes (256 bits)
    passwordBytes,                // password: Uint8Array
    duressSalt,                   // salt: modified duress salt
    6,                            // opsLimit: 6 iterations
    65536,                        // memLimit: 64 MB in KB (65536)
    sodium.crypto_pwhash_ALG_ARGON2ID13  // algorithm: Argon2id v1.3
  );

  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM with Argon2id key derivation
 * Optionally supports duress password for coercion resistance
 * 
 * Encryption process:
 * 1. Generate random 128-bit salt
 * 2. Derive 256-bit key via Argon2id (opslimit=6, memlimit=64MB)
 * 3. Generate random 96-bit nonce (12 bytes for GCM)
 * 4. Encrypt via Web Crypto API AES-256-GCM
 * 5. If duress password provided:
 *    - Derive duress key using modified salt path
 *    - Encrypt fake plaintext with duress key
 *    - Concatenate: [primary ciphertext][duress ciphertext]
 * 6. Serialize using algorithm-agile format with version headers
 * 
 * Ciphertext format (Version 1 - Algorithm Agile):
 * [1 byte]   Version (0x01)
 * [1 byte]   KDF algorithm (0x01 = Argon2id)
 * [4 bytes]  KDF opslimit (uint32 BE)
 * [4 bytes]  KDF memlimit (uint32 BE)
 * [16 bytes] Salt
 * [1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
 * [12 bytes] Nonce
 * [variable] Primary ciphertext (includes 16-byte auth tag at end)
 * [variable] Duress ciphertext (optional, includes 16-byte auth tag)
 * 
 * Encoded as Base64 string for text transport
 * 
 * @param {string} plaintext - The text to encrypt
 * @param {string} password - The password to derive the encryption key from
 * @param {Object} [options] - Optional encryption options
 * @param {string} [options.duressPassword] - Optional duress password for coercion resistance
 * @param {string} [options.fakePlaintext] - Fake message to show when duress password is used
 * @param {boolean} [options.selfDestruct] - Enable self-destruct mode (one-time decryption)
 * @param {number} [options.stealthMode] - Stealth mode (STEALTH_NONE, STEALTH_NOISE, STEALTH_PADDING, STEALTH_COMBINED)
 * @param {number} [options.noiseMinBytes] - Minimum random bytes for noise mode (default: 64)
 * @param {number} [options.noiseMaxBytes] - Maximum random bytes for noise mode (default: 1024)
 * @param {number} [options.paddingBlockSize] - Block size for padding mode (default: 1024)
 * @param {number} [options.paddingMaxSize] - Maximum padded size (default: 16384)
 * @returns {Promise<string>} Base64-encoded ciphertext with version headers
 * @throws {Error} If encryption fails or crypto is not initialized
 * @throws {Error} If duress password is the same as primary password
 */
export async function encrypt(plaintext, password, options = {}) {
  const sodium = getSodium();

  const { duressPassword, fakePlaintext, selfDestruct } = options;

  // Validate duress password is different from primary
  if (duressPassword && duressPassword === password) {
    throw new Error('Duress password must be different from primary password');
  }

  // Step 1: Generate random 128-bit salt
  const salt = generateSalt();

  // Step 2: Derive 256-bit key via Argon2id
  const derivedKey = deriveKey(password, salt);

  // Step 3: Generate random 96-bit nonce for GCM
  const nonce = generateNonce();

  // Step 4: Import the raw key into Web Crypto API
  const cryptoKey = await getCryptoSubtle().importKey(
    'raw',                    // format
    derivedKey,               // Uint8Array (32 bytes)
    { name: 'AES-GCM' },      // algorithm
    false,                    // not extractable
    ['encrypt', 'decrypt']    // key usages
  );

  // Step 5: Encrypt using AES-256-GCM with AAD for context binding
  const AAD_DATA = new TextEncoder().encode('encyphrix-v1');
  const algorithm = {
    name: 'AES-GCM',
    iv: nonce,
    tagLength: 128,
    additionalData: AAD_DATA
  };

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encryptedBuffer = await getCryptoSubtle().encrypt(
    algorithm,
    cryptoKey,
    plaintextBytes
  );

  // encryptedBuffer contains: [ciphertext...][auth tag (16 bytes)]
  let encryptedBytes = new Uint8Array(encryptedBuffer);

  // Step 6: If duress password provided, encrypt fake plaintext
  if (duressPassword && fakePlaintext) {
    // Derive duress key using modified salt path
    const duressKey = deriveDuressKey(duressPassword, salt);

    // Import duress key
    const duressCryptoKey = await getCryptoSubtle().importKey(
      'raw',
      duressKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    // Generate new nonce for duress encryption
    const duressNonce = generateNonce();

    // Encrypt fake plaintext with AAD
    const fakePlaintextBytes = new TextEncoder().encode(fakePlaintext);
    const duressEncryptedBuffer = await getCryptoSubtle().encrypt(
      {
        name: 'AES-GCM',
        iv: duressNonce,
        tagLength: 128,
        additionalData: AAD_DATA
      },
      duressCryptoKey,
      fakePlaintextBytes
    );

    // Combine: [primary ciphertext][duress nonce (12 bytes)][duress ciphertext]
    const duressEncryptedBytes = new Uint8Array(duressEncryptedBuffer);
    const combinedBytes = new Uint8Array(
      encryptedBytes.length + NONCE_SIZE + duressEncryptedBytes.length
    );

    combinedBytes.set(encryptedBytes, 0);
    combinedBytes.set(duressNonce, encryptedBytes.length);
    combinedBytes.set(duressEncryptedBytes, encryptedBytes.length + NONCE_SIZE);

    encryptedBytes = combinedBytes;
  }

  // Step 7: Serialize using algorithm-agile format
  // Create metadata with version headers
  const flags = selfDestruct ? FLAG_SELF_DESTRUCT : 0;
  const metadata = createMetadata(salt, nonce, {
    opslimit: DEFAULT_OPSLIMIT,
    memlimit: DEFAULT_MEMLIMIT,
    flags: flags
  });

  // Step 8: Serialize and encode as Base64
  const serialized = serialize(metadata, encryptedBytes);

  // Step 9: Apply stealth mode if requested
  const stealthMode = options.stealthMode || STEALTH_NONE;
  if (stealthMode !== STEALTH_NONE) {
    return applyStealth(serialized, {
      mode: stealthMode,
      password: password,
      salt: salt,
      kdfFn: deriveKey,
      noiseMinBytes: options.noiseMinBytes,
      noiseMaxBytes: options.noiseMaxBytes,
      paddingBlockSize: options.paddingBlockSize,
      paddingMaxSize: options.paddingMaxSize
    });
  }

  return serialized;
}

/**
 * Decrypt ciphertext using AES-256-GCM with Argon2id key derivation
 * Supports duress password decryption - if primary decryption fails,
 * automatically tries duress key derivation and returns fake plaintext
 * 
 * Decryption process:
 * 1. Deserialize ciphertext format (extract metadata and encrypted data)
 * 2. Try primary key derivation and decryption
 * 3. If primary fails, try duress key derivation (if duress data exists)
 * 4. Return plaintext string (real or fake)
 * 
 * Expected ciphertext format (Version 1):
 * [1 byte]   Version (0x01)
 * [1 byte]   KDF algorithm (0x01 = Argon2id)
 * [4 bytes]  KDF opslimit (uint32 BE)
 * [4 bytes]  KDF memlimit (uint32 BE)
 * [16 bytes] Salt
 * [1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
 * [12 bytes] Nonce
 * [variable] Primary ciphertext (includes 16-byte auth tag at end)
 * [variable] Duress ciphertext (optional, includes 16-byte auth tag)
 * 
 * Duress ciphertext detection:
 * If encryptedData length > minimum ciphertext size (28 bytes = 12 nonce + 16 tag),
 * we attempt to extract and decrypt the duress portion.
 * 
 * @param {string} ciphertext - Base64-encoded ciphertext from encrypt()
 * @param {string} password - The password to derive the decryption key from
 * @returns {Promise<{plaintext: string, selfDestruct: boolean}>} The decrypted plaintext and self-destruct flag
 * @throws {Error} If decryption fails (wrong password, tampered ciphertext, or invalid format)
 */
export async function decrypt(ciphertext, password) {
  // Step 1: Try to remove any stealth mode first
  let processedCiphertext = ciphertext;

  // Try to remove stealth modes
  // For combined mode (padding + noise), we need to handle it specially
  try {
    const binaryString = atob(ciphertext);
    if (binaryString.length >= 4) {
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const view = new DataView(bytes.buffer);
      const possibleLength = view.getUint32(0, false);

      // Check if it looks like padding mode
      if (possibleLength >= 40 && possibleLength <= binaryString.length - 4) {
        // Try to remove padding first
        try {
          const unpadded = removePaddingMode(ciphertext);
          const unpaddedBinary = atob(unpadded);
          const unpaddedBytes = new Uint8Array(unpaddedBinary.length);
          for (let i = 0; i < unpaddedBinary.length; i++) {
            unpaddedBytes[i] = unpaddedBinary.charCodeAt(i);
          }

          // Check if unpadded data looks like noise mode (first byte is not version)
          if (unpaddedBytes[0] !== VERSION_1 && unpaddedBinary.length >= 8) {
            // This might be combined mode - try to extract salt from noise-mode ciphertext
            // The salt is at offset 10 in the standard format, but we need to find where the standard format starts
            // Try reading the offset from the first 4 bytes
            const noiseOffset = view.getUint32(0, false);
            if (noiseOffset >= 4 && noiseOffset + 26 <= unpaddedBinary.length) {
              // Try to extract salt from the expected location
              const possibleSalt = unpaddedBytes.slice(noiseOffset + 10, noiseOffset + 26);
              if (possibleSalt.length === 16) {
                // Try to remove noise mode with this salt
                try {
                  processedCiphertext = removeNoiseMode(unpadded, password, possibleSalt, 64, 1024, deriveKey);
                } catch (noiseError) {
                  // If that fails, just use the unpadded ciphertext
                  processedCiphertext = unpadded;
                }
              } else {
                processedCiphertext = unpadded;
              }
            } else {
              processedCiphertext = unpadded;
            }
          } else {
            // No noise mode detected, use unpadded ciphertext
            processedCiphertext = unpadded;
          }
        } catch (paddingError) {
          // Padding removal failed, try as noise mode directly
          processedCiphertext = ciphertext;
        }
      } else if (bytes[0] !== VERSION_1) {
        // Might be noise mode only - try to find salt by trying different offsets
        // For noise mode without padding, we need to derive the offset first
        // This is tricky because we need the salt to derive the offset
        // We'll try a brute-force approach with common salt positions
        processedCiphertext = ciphertext;
      }
    }
  } catch (e) {
    // Not valid base64 or other error, continue with normal processing
    processedCiphertext = ciphertext;
  }

  // If we still have the original ciphertext, try standard stealth removal
  if (processedCiphertext === ciphertext) {
    try {
      processedCiphertext = removeStealth(ciphertext, {
        password: password,
        kdfFn: deriveKey
      });
    } catch (stealthError) {
      // If stealth removal fails, use original ciphertext
      processedCiphertext = ciphertext;
    }
  }

  // Step 2: Deserialize ciphertext format
  let metadata;
  try {
    metadata = deserialize(processedCiphertext);
  } catch (error) {
    throw new Error('Invalid ciphertext format: ' + error.message);
  }

  const { salt, nonce, encryptedData, flags } = metadata;
  
  // Check self-destruct flag
  const selfDestruct = (flags & FLAG_SELF_DESTRUCT) !== 0;

  // Step 3: Try primary key derivation and decryption
  const derivedKey = deriveKey(password, salt);

  // Step 4: Import the key into Web Crypto API
  const cryptoKey = await getCryptoSubtle().importKey(
    'raw',
    derivedKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  // Step 5: Try decrypt using AES-256-GCM with AAD
  const AAD_DATA = new TextEncoder().encode('encyphrix-v1');
  const algorithm = {
    name: 'AES-GCM',
    iv: nonce,
    tagLength: 128,
    additionalData: AAD_DATA
  };

  // Try decrypting with the full data first (no duress case)
  try {
    const decryptedBuffer = await getCryptoSubtle().decrypt(
      algorithm,
      cryptoKey,
      encryptedData
    );

    // Decryption succeeded - return plaintext with self-destruct flag
    const plaintext = new TextDecoder().decode(decryptedBuffer);
    return { plaintext, selfDestruct };
  } catch (error) {
    // Full data decryption failed - might be duress-enabled ciphertext
    // SECURITY: Try a single expected truncation point to avoid timing side-channels
    // The iterative approach (trying multiple sizes) creates timing leaks
    const MIN_DURESS_SIZE = NONCE_SIZE + AUTH_TAG_SIZE; // 28 bytes minimum for duress
    
    // Try one expected primary ciphertext size (encryptedData - duress overhead)
    // This assumes standard duress format: [primary][duress_nonce][duress_ciphertext]
    if (encryptedData.length > MIN_DURESS_SIZE) {
      const expectedPrimarySize = encryptedData.length - MIN_DURESS_SIZE;
      const primaryData = encryptedData.slice(0, expectedPrimarySize);
      
      try {
        const decryptedBuffer = await getCryptoSubtle().decrypt(
          algorithm,
          cryptoKey,
          primaryData
        );

        // Primary decryption succeeded - return real plaintext with self-destruct flag
        const plaintext = new TextDecoder().decode(decryptedBuffer);
        return { plaintext, selfDestruct };
      } catch (primaryError) {
        // Expected size failed - continue to duress attempt
      }
    }
    
    // Primary decryption failed - try duress
    if (encryptedData.length > MIN_DURESS_SIZE) {
      try {
        const duressPlaintext = await tryDuressDecrypt(encryptedData, password, salt);
        if (duressPlaintext !== null) {
          return { plaintext: duressPlaintext, selfDestruct };
        }
      } catch (duressError) {
        // Duress also failed, fall through to throw error
      }
    }
    
    // Decryption failed - wrong password or corrupted ciphertext
    throw new Error('Decryption failed: invalid password or corrupted ciphertext');
  }
}

/**
 * Attempt to decrypt using duress key derivation
 * This is called when primary decryption fails
 * 
 * @param {Uint8Array} encryptedData - The full encrypted data (primary + duress)
 * @param {string} password - The password to try as duress password
 * @param {Uint8Array} salt - The original salt from ciphertext
 * @returns {Promise<string|null>} The fake plaintext if duress succeeds, null otherwise
 */
async function tryDuressDecrypt(encryptedData, password, salt) {
  // Minimum size for duress data: nonce (12) + auth tag (16) = 28 bytes
  const MIN_DURESS_SIZE = NONCE_SIZE + AUTH_TAG_SIZE;
  
  if (encryptedData.length <= MIN_DURESS_SIZE) {
    return null;
  }
  
  // Extract duress portion: [primary ciphertext][duress nonce (12 bytes)][duress ciphertext]
  // Primary ciphertext size = encryptedData.length - 12 (nonce) - duress_ciphertext_length
  // We need to find where primary ends and duress begins
  // Format: [primary ciphertext + tag][duress nonce (12)][duress ciphertext + tag]
  
  // The primary ciphertext includes auth tag at the end (16 bytes)
  // So we need to find the boundary - we know duress nonce is 12 bytes
  // Duress starts at: encryptedData.length - duress_ciphertext_length - 12
  // But we don't know duress_ciphertext_length directly
  
  // Strategy: The duress nonce is at position: encryptedData.length - duress_ciphertext.length - 12
  // We need to try different offsets or use a different approach
  
  // Actually, looking at encrypt(): 
  // combinedBytes.set(encryptedBytes, 0); // primary
  // combinedBytes.set(duressNonce, encryptedBytes.length); // duress nonce
  // combinedBytes.set(duressEncryptedBytes, encryptedBytes.length + NONCE_SIZE); // duress ciphertext
  
  // So structure is: [primary ciphertext][duress nonce][duress ciphertext]
  // Primary ciphertext length is unknown from just looking at the data
  // But we know: total = primary_len + 12 + duress_len
  // And duress_len >= 16 (at least auth tag)
  
  // We need to try to find where primary ciphertext ends
  // Since GCM auth tag is 16 bytes, primary ciphertext is at least 16 bytes
  // We'll iterate backwards to find a valid duress decryption
  
  // Actually, simpler approach: try decrypting from various offsets
  // The duress nonce is 12 bytes before the duress ciphertext
  // Duress ciphertext is at the end (includes auth tag)
  
  // Let's work backwards from the end
  // Last 16 bytes are duress auth tag
  // Before that is duress ciphertext
  // Before that is 12-byte duress nonce
  // Everything before that is primary ciphertext
  
  // Try different positions for the duress nonce
  for (let duressNonceOffset = encryptedData.length - MIN_DURESS_SIZE; 
       duressNonceOffset >= AUTH_TAG_SIZE; 
       duressNonceOffset--) {
    
    const duressNonce = encryptedData.slice(duressNonceOffset, duressNonceOffset + NONCE_SIZE);
    const duressCiphertext = encryptedData.slice(duressNonceOffset + NONCE_SIZE);
    
    try {
      // Derive duress key
      const duressKey = deriveDuressKey(password, salt);
      
      // Import duress key
      const duressCryptoKey = await getCryptoSubtle().importKey(
        'raw',
        duressKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Try decrypt with duress
      const duressAlgorithm = {
        name: 'AES-GCM',
        iv: duressNonce,
        tagLength: 128
      };
      
      const duressDecryptedBuffer = await getCryptoSubtle().decrypt(
        duressAlgorithm,
        duressCryptoKey,
        duressCiphertext
      );
      
      // Success! Return the fake plaintext
      return new TextDecoder().decode(duressDecryptedBuffer);
    } catch (e) {
      // This offset didn't work, try the next one
      continue;
    }
  }
  
  // No valid duress decryption found
  return null;
}

/**
 * Check if a ciphertext has self-destruct mode enabled
 * This can be checked without decrypting
 * 
 * @param {string} ciphertext - Base64-encoded ciphertext
 * @returns {boolean} true if self-destruct is enabled, false otherwise
 */
export function checkSelfDestruct(ciphertext) {
  try {
    return hasSelfDestructFlag(ciphertext);
  } catch (e) {
    return false;
  }
}

/**
 * Convert Uint8Array to Base64 string
 * Uses standard btoa after converting to binary string
 * 
 * @param {Uint8Array} bytes - The bytes to encode
 * @returns {string} Base64-encoded string
 */
function bytesToBase64(bytes) {
  // Convert Uint8Array to binary string
  const binaryString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  
  // Encode to Base64
  return btoa(binaryString);
}

/**
 * Convert Base64 string to Uint8Array
 * Uses standard atob and converts to Uint8Array
 * 
 * @param {string} base64 - The Base64 string to decode
 * @returns {Uint8Array} Decoded bytes
 */
function base64ToBytes(base64) {
  // Decode from Base64 to binary string
  const binaryString = atob(base64);
  
  // Convert to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

// Self-initialization when run directly
if (import.meta.main) {
  try {
    await initCrypto();
    console.log('Crypto libraries initialized');
  } catch (error) {
    console.error('Failed to initialize crypto libraries:', error.message);
    process.exit(1);
  }
}
