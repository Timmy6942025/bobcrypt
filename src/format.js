/**
 * Algorithm-Agile Ciphertext Format
 *
 * This module implements a versioned, extensible binary format for encrypted data.
 * The format includes algorithm identifiers and parameters to enable future migration
 * to different ciphers or KDFs without breaking backward compatibility.
 *
 * Format Specification (Version 1):
 *
 * [1 byte]   Version (0x01)
 * [1 byte]   KDF algorithm (0x01 = Argon2id)
 * [4 bytes]  KDF opslimit (uint32 big-endian)
 * [4 bytes]  KDF memlimit (uint32 big-endian)
 * [16 bytes] Salt
 * [1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
 * [12 bytes] Nonce
 * [1 byte]   Flags (0x01 = Self-destruct enabled)
 * [variable] Ciphertext (includes 16-byte auth tag at end)
 *
 * Total header size: 40 bytes (1+1+4+4+16+1+12+1)
 *
 * Constants:
 * - VERSION_1 = 0x01
 * - KDF_ARGON2ID = 0x01
 * - CIPHER_AES_256_GCM = 0x01
 * - FLAG_SELF_DESTRUCT = 0x01
 *
 * Design Rationale:
 * - Binary format: Efficient, compact, no parsing ambiguity
 * - Version header: Enables algorithm agility and future migration
 * - Algorithm identifiers: Allows cipher/KDF upgrades without format changes
 * - Parameter storage: KDF parameters stored with ciphertext for future verification
 * - Big-endian: Network byte order, consistent across platforms
 * - Base64 encoding: Text-safe transport while preserving binary structure
 * - Flags byte: Extensible mechanism for optional features like self-destruct
 */

/** Version 1 of the ciphertext format */
export const VERSION_1 = 0x01;

/** KDF algorithm identifier for Argon2id */
export const KDF_ARGON2ID = 0x01;

/** Cipher algorithm identifier for AES-256-GCM */
export const CIPHER_AES_256_GCM = 0x01;

/** Flag for self-destruct mode (one-time decryption) */
export const FLAG_SELF_DESTRUCT = 0x01;

/** Default KDF parameters for Argon2id */
export const DEFAULT_OPSLIMIT = 6;
export const DEFAULT_MEMLIMIT = 65536; // 64MB in KB

/** Salt size in bytes (128 bits) */
export const SALT_SIZE = 16;

/** Nonce size in bytes for AES-GCM (96 bits) */
export const NONCE_SIZE = 12;

/** Authentication tag size in bytes for AES-GCM (128 bits) */
export const AUTH_TAG_SIZE = 16;

/** Flags size in bytes */
export const FLAGS_SIZE = 1;

/** Total header size in bytes */
export const HEADER_SIZE = 40; // 1+1+4+4+16+1+12+1

/**
 * Metadata structure for serialization
 * @typedef {Object} CiphertextMetadata
 * @property {number} version - Format version (0x01)
 * @property {number} kdfAlgorithm - KDF algorithm ID (0x01 = Argon2id)
 * @property {number} opslimit - KDF operations limit (uint32)
 * @property {number} memlimit - KDF memory limit in KB (uint32)
 * @property {Uint8Array} salt - 16-byte random salt
 * @property {number} cipherAlgorithm - Cipher algorithm ID (0x01 = AES-256-GCM)
 * @property {Uint8Array} nonce - 12-byte random nonce
 * @property {number} flags - Feature flags (0x01 = self-destruct enabled)
 */

/**
 * Serialize ciphertext metadata and encrypted data into the standard format
 * 
 * Uses DataView for precise big-endian encoding of multi-byte integers.
 * The resulting buffer is encoded as Base64 for text transport.
 * 
 * @param {CiphertextMetadata} metadata - Encryption parameters and identifiers
 * @param {Uint8Array} encryptedData - Ciphertext with auth tag (from Web Crypto)
 * @returns {string} Base64-encoded serialized ciphertext
 * @throws {Error} If metadata fields are invalid or missing
 */
export function serialize(metadata, encryptedData) {
  // Validate metadata
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Metadata is required');
  }
  
  if (metadata.version !== VERSION_1) {
    throw new Error(`Unsupported version: ${metadata.version}. Only version 1 (0x01) is supported.`);
  }
  
  if (metadata.kdfAlgorithm !== KDF_ARGON2ID) {
    throw new Error(`Unsupported KDF algorithm: ${metadata.kdfAlgorithm}. Only Argon2id (0x01) is supported.`);
  }
  
  if (metadata.cipherAlgorithm !== CIPHER_AES_256_GCM) {
    throw new Error(`Unsupported cipher algorithm: ${metadata.cipherAlgorithm}. Only AES-256-GCM (0x01) is supported.`);
  }
  
  if (!metadata.salt || metadata.salt.length !== SALT_SIZE) {
    throw new Error(`Salt must be exactly ${SALT_SIZE} bytes, got ${metadata.salt?.length || 0}`);
  }
  
  if (!metadata.nonce || metadata.nonce.length !== NONCE_SIZE) {
    throw new Error(`Nonce must be exactly ${NONCE_SIZE} bytes, got ${metadata.nonce?.length || 0}`);
  }
  
  // Validate KDF parameters are within acceptable ranges
  if (metadata.opslimit < 3 || metadata.opslimit > 10) {
    throw new Error(`Invalid opslimit: ${metadata.opslimit}. Must be between 3 and 10.`);
  }
  
  if (metadata.memlimit < 65536 || metadata.memlimit > 1048576) {
    throw new Error(`Invalid memlimit: ${metadata.memlimit}. Must be between 64MB and 1GB.`);
  }
  
  if (!encryptedData || encryptedData.length === 0) {
    throw new Error('Encrypted data is required');
  }
  
  // Calculate total buffer size
  // 1 (version) + 1 (kdf) + 4 (opslimit) + 4 (memlimit) + 16 (salt) + 1 (cipher) + 12 (nonce) + 1 (flags) + encryptedData.length
  const totalLength = HEADER_SIZE + encryptedData.length;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  let offset = 0;

  // Version (1 byte)
  view.setUint8(offset, metadata.version);
  offset += 1;

  // KDF algorithm (1 byte)
  view.setUint8(offset, metadata.kdfAlgorithm);
  offset += 1;

  // KDF opslimit (4 bytes, big-endian uint32)
  view.setUint32(offset, metadata.opslimit, false); // false = big-endian
  offset += 4;

  // KDF memlimit (4 bytes, big-endian uint32)
  view.setUint32(offset, metadata.memlimit, false);
  offset += 4;

  // Salt (16 bytes)
  new Uint8Array(buffer, offset, SALT_SIZE).set(metadata.salt);
  offset += SALT_SIZE;

  // Cipher algorithm (1 byte)
  view.setUint8(offset, metadata.cipherAlgorithm);
  offset += 1;

  // Nonce (12 bytes)
  new Uint8Array(buffer, offset, NONCE_SIZE).set(metadata.nonce);
  offset += NONCE_SIZE;

  // Flags (1 byte) - defaults to 0 if not specified
  view.setUint8(offset, metadata.flags || 0);
  offset += 1;

  // Encrypted data (ciphertext + auth tag)
  new Uint8Array(buffer, offset).set(encryptedData);
  
  // Encode as Base64 string
  return bytesToBase64(new Uint8Array(buffer));
}

/**
 * Deserialize a Base64-encoded ciphertext into metadata and encrypted data
 * 
 * Uses DataView for precise big-endian decoding of multi-byte integers.
 * Validates the format and extracts all components.
 * 
 * @param {string} base64String - Base64-encoded serialized ciphertext
 * @returns {CiphertextMetadata & { encryptedData: Uint8Array }} Metadata and encrypted data
 * @throws {Error} If format is invalid, corrupted, or unsupported
 */
export function deserialize(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Base64 string is required');
  }
  
  // Decode Base64 to binary
  let binary;
  try {
    binary = atob(base64String);
  } catch (e) {
    throw new Error('Invalid Base64 encoding: ' + e.message);
  }
  
  if (binary.length < HEADER_SIZE + AUTH_TAG_SIZE) {
    throw new Error(`Invalid ciphertext: too short (${binary.length} bytes, minimum ${HEADER_SIZE + AUTH_TAG_SIZE})`);
  }
  
  // Create buffer and copy binary data
  const buffer = new ArrayBuffer(binary.length);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  let offset = 0;
  const metadata = {};
  
  // Version (1 byte)
  metadata.version = view.getUint8(offset);
  offset += 1;
  
  // Validate version
  if (metadata.version !== VERSION_1) {
    throw new Error(`Unsupported format version: 0x${metadata.version.toString(16).padStart(2, '0')}. Only version 1 (0x01) is supported.`);
  }
  
  // KDF algorithm (1 byte)
  metadata.kdfAlgorithm = view.getUint8(offset);
  offset += 1;
  
  // Validate KDF algorithm
  if (metadata.kdfAlgorithm !== KDF_ARGON2ID) {
    throw new Error(`Unsupported KDF algorithm: 0x${metadata.kdfAlgorithm.toString(16).padStart(2, '0')}. Only Argon2id (0x01) is supported.`);
  }
  
  // KDF opslimit (4 bytes, big-endian uint32)
  metadata.opslimit = view.getUint32(offset, false); // false = big-endian
  offset += 4;
  
  // KDF memlimit (4 bytes, big-endian uint32)
  metadata.memlimit = view.getUint32(offset, false);
  offset += 4;
  
  // Salt (16 bytes)
  metadata.salt = bytes.slice(offset, offset + SALT_SIZE);
  offset += SALT_SIZE;
  
  // Cipher algorithm (1 byte)
  metadata.cipherAlgorithm = view.getUint8(offset);
  offset += 1;
  
  // Validate cipher algorithm
  if (metadata.cipherAlgorithm !== CIPHER_AES_256_GCM) {
    throw new Error(`Unsupported cipher algorithm: 0x${metadata.cipherAlgorithm.toString(16).padStart(2, '0')}. Only AES-256-GCM (0x01) is supported.`);
  }
  
  // Nonce (12 bytes)
  metadata.nonce = bytes.slice(offset, offset + NONCE_SIZE);
  offset += NONCE_SIZE;

  // Flags (1 byte)
  metadata.flags = view.getUint8(offset);
  offset += 1;

  // Encrypted data (rest of buffer: ciphertext + auth tag)
  metadata.encryptedData = bytes.slice(offset);
  
  // Validate encrypted data includes auth tag
  if (metadata.encryptedData.length < AUTH_TAG_SIZE) {
    throw new Error(`Invalid encrypted data: missing authentication tag (expected at least ${AUTH_TAG_SIZE} bytes, got ${metadata.encryptedData.length})`);
  }
  
  return metadata;
}

/**
 * Create default metadata structure for new encryptions
 * 
 * @param {Uint8Array} salt - 16-byte random salt
 * @param {Uint8Array} nonce - 12-byte random nonce
 * @param {Object} [options] - Optional overrides
 * @param {number} [options.opslimit] - KDF operations limit (default: 6)
 * @param {number} [options.memlimit] - KDF memory limit in KB (default: 65536)
 * @param {number} [options.flags] - Feature flags (default: 0, use FLAG_SELF_DESTRUCT for self-destruct)
 * @returns {CiphertextMetadata} Populated metadata object
 */
export function createMetadata(salt, nonce, options = {}) {
  if (!salt || salt.length !== SALT_SIZE) {
    throw new Error(`Salt must be exactly ${SALT_SIZE} bytes`);
  }
  
  if (!nonce || nonce.length !== NONCE_SIZE) {
    throw new Error(`Nonce must be exactly ${NONCE_SIZE} bytes`);
  }
  
  return {
    version: VERSION_1,
    kdfAlgorithm: KDF_ARGON2ID,
    opslimit: options.opslimit ?? DEFAULT_OPSLIMIT,
    memlimit: options.memlimit ?? DEFAULT_MEMLIMIT,
    salt: salt,
    cipherAlgorithm: CIPHER_AES_256_GCM,
    nonce: nonce,
    flags: options.flags || 0
  };
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

/**
 * Check if self-destruct flag is set in ciphertext metadata
 * 
 * @param {string} base64String - Base64-encoded serialized ciphertext
 * @returns {boolean} true if self-destruct flag is set, false otherwise
 * @throws {Error} If format is invalid or corrupted
 */
export function hasSelfDestructFlag(base64String) {
  const metadata = deserialize(base64String);
  return (metadata.flags & FLAG_SELF_DESTRUCT) !== 0;
}
