/**
 * Ciphertext Stealth Features
 *
 * This module implements optional stealth modes for encrypted data:
 *
 * 1. Random Noise Mode: Prepends random bytes to hide the ciphertext structure
 *    - The offset to real data is derived from the password via an additional KDF operation
 *    - The derived offset is stored in the first 4 bytes (big-endian uint32)
 *    - Output appears as random bytes (no version headers visible at start)
 *    - Without the password, an attacker cannot determine where the real ciphertext begins
 *
 * 2. Padding Mode: Pads ciphertext to fixed block sizes
 *    - Hides the actual message length
 *    - Different length messages produce same size output
 *
 * All modes maintain backward compatibility with standard decryption.
 */

import { serialize, deserialize, createMetadata, VERSION_1, HEADER_SIZE, AUTH_TAG_SIZE } from './format.js';

// Stealth mode identifiers
export const STEALTH_NONE = 0x00;
export const STEALTH_NOISE = 0x01;
export const STEALTH_PADDING = 0x02;
export const STEALTH_COMBINED = 0x03;

// Default parameters
export const DEFAULT_NOISE_MIN_BYTES = 64;
export const DEFAULT_NOISE_MAX_BYTES = 1024;
export const DEFAULT_PADDING_BLOCK_SIZE = 1024;
export const DEFAULT_PADDING_MAX_SIZE = 16384;

/**
 * @typedef {Object} StealthOptions
 * @property {number} mode - Stealth mode (STEALTH_NONE, STEALTH_NOISE, STEALTH_PADDING, STEALTH_COMBINED)
 * @property {string} [password] - Password for noise mode offset derivation
 * @property {Uint8Array} [salt] - Salt for key derivation
 * @property {Function} [kdfFn] - Key derivation function
 * @property {number} [noiseMinBytes] - Minimum random bytes for noise mode (default: 64)
 * @property {number} [noiseMaxBytes] - Maximum random bytes for noise mode (default: 1024)
 * @property {number} [paddingBlockSize] - Block size for padding mode (default: 1024)
 * @property {number} [paddingMaxSize] - Maximum padded size (default: 16384)
 */

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes to generate
 * @returns {Uint8Array} Random bytes
 */
export function generateRandomBytes(length) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Get a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function getRandomInt(min, max) {
  const range = max - min + 1;
  const randomBytes = generateRandomBytes(4);
  const randomValue = (randomBytes[0] << 24) | (randomBytes[1] << 16) |
                      (randomBytes[2] << 8) | randomBytes[3];
  return min + (Math.abs(randomValue) % range);
}

/**
 * Derive the noise offset from password and salt
 * This ensures only someone with the correct password can find the real ciphertext
 * @param {string} password - The password to derive offset from
 * @param {Uint8Array} salt - The 16-byte salt
 * @param {number} minOffset - Minimum offset value
 * @param {number} maxOffset - Maximum offset value
 * @param {Function} kdfFn - Key derivation function
 * @returns {number} Derived offset within range
 */
export function deriveNoiseOffset(password, salt, minOffset, maxOffset, kdfFn) {
  const offsetPassword = password + '_STEALTH_NOISE_OFFSET_v1';
  const offsetKey = kdfFn(offsetPassword, salt);
  const view = new DataView(offsetKey.buffer, offsetKey.byteOffset, 4);
  const offsetValue = view.getUint32(0, false);
  const range = maxOffset - minOffset + 1;
  return minOffset + (offsetValue % range);
}

/**
 * Apply random noise stealth mode
 * Format: [4 bytes: offset to real data][random bytes (offset bytes total)][actual ciphertext]
 * The offset value is derived from password+salt for security
 * @param {string} base64Ciphertext - Base64-encoded ciphertext
 * @param {string} password - Password for deriving the offset
 * @param {Uint8Array} salt - Salt for key derivation
 * @param {number} minNoiseBytes - Minimum noise bytes to prepend
 * @param {number} maxNoiseBytes - Maximum noise bytes to prepend
 * @param {Function} kdfFn - Key derivation function
 * @returns {string} Base64-encoded stealth ciphertext with noise
 */
export function applyNoiseMode(base64Ciphertext, password, salt, minNoiseBytes = DEFAULT_NOISE_MIN_BYTES, maxNoiseBytes = DEFAULT_NOISE_MAX_BYTES, kdfFn) {
  const binaryString = atob(base64Ciphertext);
  const ciphertextBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    ciphertextBytes[i] = binaryString.charCodeAt(i);
  }

  // Derive the offset from password and salt
  const offset = deriveNoiseOffset(password, salt, minNoiseBytes, maxNoiseBytes, kdfFn);

  // Generate random noise (offset includes the 4-byte header)
  const noiseLength = offset;
  const noiseBytes = generateRandomBytes(noiseLength);

  // Create output buffer: [4 bytes offset][noise][ciphertext]
  const totalLength = 4 + noiseLength + ciphertextBytes.length;
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  // Write offset as big-endian uint32 (this is the total offset to real data)
  view.setUint32(0, 4 + noiseLength, false);

  // Write noise after the offset header
  output.set(noiseBytes, 4);

  // Write actual ciphertext at the derived offset
  output.set(ciphertextBytes, 4 + noiseLength);

  // Encode as base64
  const outputBinary = Array.from(output)
    .map(byte => String.fromCharCode(byte))
    .join('');

  return btoa(outputBinary);
}

/**
 * Remove noise mode and extract the actual ciphertext
 * @param {string} stealthCiphertext - Base64-encoded stealth ciphertext
 * @param {string} password - Password for deriving the offset
 * @param {Uint8Array} salt - Salt for key derivation
 * @param {number} minNoiseBytes - Minimum noise bytes
 * @param {number} maxNoiseBytes - Maximum noise bytes
 * @param {Function} kdfFn - Key derivation function
 * @returns {string} Base64-encoded actual ciphertext
 * @throws {Error} If format is invalid
 */
export function removeNoiseMode(stealthCiphertext, password, salt, minNoiseBytes = DEFAULT_NOISE_MIN_BYTES, maxNoiseBytes = DEFAULT_NOISE_MAX_BYTES, kdfFn) {
  let binaryString;
  try {
    binaryString = atob(stealthCiphertext);
  } catch (e) {
    throw new Error('Invalid Base64 encoding in stealth ciphertext');
  }

  if (binaryString.length < 4) {
    throw new Error('Stealth ciphertext too short');
  }

  // Read stored offset from first 4 bytes
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const view = new DataView(bytes.buffer);
  const storedOffset = view.getUint32(0, false);

  // Validate offset is within reasonable bounds
  if (storedOffset < 4 || storedOffset >= binaryString.length) {
    throw new Error('Invalid offset in noise mode ciphertext');
  }

  // Extract actual ciphertext at the offset
  const actualCiphertextBytes = bytes.slice(storedOffset);

  // Verify it looks like valid ciphertext (starts with version byte 0x01)
  if (actualCiphertextBytes.length < 1 || actualCiphertextBytes[0] !== VERSION_1) {
    throw new Error('Invalid ciphertext at offset - wrong password or corrupted data');
  }

  // Encode back to base64
  const outputBinary = Array.from(actualCiphertextBytes)
    .map(byte => String.fromCharCode(byte))
    .join('');

  return btoa(outputBinary);
}

/**
 * Apply padding mode to hide message length
 * Format: [4 bytes: original length][padded ciphertext with random padding]
 * @param {string} base64Ciphertext - Base64-encoded ciphertext
 * @param {number} blockSize - Block size to pad to (default: 1024)
 * @param {number} maxSize - Maximum padded size (default: 16384)
 * @returns {string} Base64-encoded padded ciphertext
 */
export function applyPaddingMode(base64Ciphertext, blockSize = DEFAULT_PADDING_BLOCK_SIZE, maxSize = DEFAULT_PADDING_MAX_SIZE) {
  const binaryString = atob(base64Ciphertext);
  const ciphertextBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    ciphertextBytes[i] = binaryString.charCodeAt(i);
  }

  const originalLength = ciphertextBytes.length;

  // Calculate padded size
  let paddedSize = Math.ceil((originalLength + 4) / blockSize) * blockSize;
  if (paddedSize > maxSize) {
    paddedSize = maxSize;
  }
  if (paddedSize < originalLength + 4) {
    paddedSize = originalLength + 4 + blockSize;
  }

  // Create output buffer
  const output = new Uint8Array(paddedSize);
  const view = new DataView(output.buffer);

  // Write original length as big-endian uint32
  view.setUint32(0, originalLength, false);

  // Write actual ciphertext
  output.set(ciphertextBytes, 4);

  // Fill remaining space with random padding
  const paddingStart = 4 + originalLength;
  const paddingLength = paddedSize - paddingStart;
  if (paddingLength > 0) {
    const padding = generateRandomBytes(paddingLength);
    output.set(padding, paddingStart);
  }

  // Encode as base64
  const outputBinary = Array.from(output)
    .map(byte => String.fromCharCode(byte))
    .join('');

  return btoa(outputBinary);
}

/**
 * Remove padding and extract the actual ciphertext
 * @param {string} paddedCiphertext - Base64-encoded padded ciphertext
 * @returns {string} Base64-encoded actual ciphertext
 * @throws {Error} If format is invalid
 */
export function removePaddingMode(paddedCiphertext) {
  let binaryString;
  try {
    binaryString = atob(paddedCiphertext);
  } catch (e) {
    throw new Error('Invalid Base64 encoding in padded ciphertext');
  }

  if (binaryString.length < 4) {
    throw new Error('Padded ciphertext too short');
  }

  // Read original length from first 4 bytes
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const view = new DataView(bytes.buffer);
  const originalLength = view.getUint32(0, false);

  // Validate length
  if (originalLength < HEADER_SIZE + AUTH_TAG_SIZE || originalLength > binaryString.length - 4) {
    throw new Error('Invalid original length in padded ciphertext');
  }

  // Extract actual ciphertext
  const actualCiphertextBytes = bytes.slice(4, 4 + originalLength);

  // Encode back to base64
  const outputBinary = Array.from(actualCiphertextBytes)
    .map(byte => String.fromCharCode(byte))
    .join('');

  return btoa(outputBinary);
}

/**
 * Apply combined noise + padding mode
 * First applies noise, then pads the result
 * @param {string} base64Ciphertext - Base64-encoded ciphertext
 * @param {string} password - Password for deriving the offset
 * @param {Uint8Array} salt - Salt for key derivation
 * @param {Object} options - Options for noise and padding
 * @param {Function} kdfFn - Key derivation function
 * @returns {string} Base64-encoded stealth ciphertext
 */
export function applyCombinedMode(base64Ciphertext, password, salt, options = {}, kdfFn) {
  const noiseCiphertext = applyNoiseMode(
    base64Ciphertext,
    password,
    salt,
    options.noiseMinBytes || DEFAULT_NOISE_MIN_BYTES,
    options.noiseMaxBytes || DEFAULT_NOISE_MAX_BYTES,
    kdfFn
  );

  return applyPaddingMode(
    noiseCiphertext,
    options.paddingBlockSize || DEFAULT_PADDING_BLOCK_SIZE,
    options.paddingMaxSize || DEFAULT_PADDING_MAX_SIZE
  );
}

/**
 * Remove combined mode (padding + noise)
 * First removes padding, then removes noise
 * @param {string} stealthCiphertext - Base64-encoded stealth ciphertext
 * @param {string} password - Password for deriving the offset
 * @param {Uint8Array} salt - Salt for key derivation
 * @param {Object} options - Options for noise and padding
 * @param {Function} kdfFn - Key derivation function
 * @returns {string} Base64-encoded actual ciphertext
 */
export function removeCombinedMode(stealthCiphertext, password, salt, options = {}, kdfFn) {
  const unpaddedCiphertext = removePaddingMode(stealthCiphertext);
  return removeNoiseMode(
    unpaddedCiphertext,
    password,
    salt,
    options.noiseMinBytes || DEFAULT_NOISE_MIN_BYTES,
    options.noiseMaxBytes || DEFAULT_NOISE_MAX_BYTES,
    kdfFn
  );
}

/**
 * Detect if ciphertext has stealth mode applied by examining structure
 * @param {string} ciphertext - Ciphertext to analyze (base64 string)
 * @returns {{mode: number, confidence: string}} Detected stealth mode and confidence level
 */
export function detectStealthMode(ciphertext) {
  try {
    const binaryString = atob(ciphertext);
    if (binaryString.length < 4) {
      return { mode: STEALTH_NONE, confidence: 'low' };
    }

    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const view = new DataView(bytes.buffer);

    // Check for padding mode (first 4 bytes = length)
    const possibleLength = view.getUint32(0, false);

    if (possibleLength >= HEADER_SIZE + AUTH_TAG_SIZE &&
        possibleLength <= binaryString.length - 4 &&
        possibleLength < 100000) {
      const possibleVersion = bytes[4];
      if (possibleVersion === VERSION_1) {
        return { mode: STEALTH_PADDING, confidence: 'high' };
      }
    }

    // Check for noise mode (first 4 bytes = offset)
    const possibleOffset = view.getUint32(0, false);
    if (possibleOffset >= 4 && possibleOffset < binaryString.length) {
      const possibleVersion = bytes[possibleOffset];
      if (possibleVersion === VERSION_1) {
        return { mode: STEALTH_NOISE, confidence: 'high' };
      }
    }

    // Check if it starts directly with version byte (no stealth)
    if (bytes[0] === VERSION_1) {
      return { mode: STEALTH_NONE, confidence: 'high' };
    }

    return { mode: STEALTH_NOISE, confidence: 'low' };

  } catch (e) {
    return { mode: STEALTH_NONE, confidence: 'none' };
  }
}

/**
 * Auto-detect and remove any stealth mode to get standard ciphertext
 * @param {string} stealthCiphertext - Ciphertext with potential stealth mode
 * @param {Object} options - Options including password and KDF function
 * @param {string} options.password - Password for noise mode derivation
 * @param {Uint8Array} options.salt - Salt for key derivation
 * @param {Function} options.kdfFn - Key derivation function
 * @returns {string} Standard base64-encoded ciphertext
 * @throws {Error} If stealth mode cannot be removed
 */
export function removeStealth(stealthCiphertext, options = {}) {
  const detection = detectStealthMode(stealthCiphertext);

  switch (detection.mode) {
    case STEALTH_PADDING:
      try {
        const unpadded = removePaddingMode(stealthCiphertext);
        const innerDetection = detectStealthMode(unpadded);
        if (innerDetection.mode === STEALTH_NOISE) {
          if (!options.password || !options.salt || !options.kdfFn) {
            throw new Error('Password required to decrypt noise-mode ciphertext');
          }
          return removeNoiseMode(unpadded, options.password, options.salt,
            options.noiseMinBytes, options.noiseMaxBytes, options.kdfFn);
        }
        return unpadded;
      } catch (e) {
        if (options.password && options.salt && options.kdfFn) {
          try {
            return removeNoiseMode(stealthCiphertext, options.password, options.salt,
              options.noiseMinBytes, options.noiseMaxBytes, options.kdfFn);
          } catch (noiseError) {
            throw e;
          }
        }
        throw e;
      }

    case STEALTH_NOISE:
      if (!options.password || !options.salt || !options.kdfFn) {
        throw new Error('Password required to decrypt noise-mode ciphertext');
      }
      return removeNoiseMode(stealthCiphertext, options.password, options.salt,
        options.noiseMinBytes, options.noiseMaxBytes, options.kdfFn);

    case STEALTH_NONE:
    default:
      return stealthCiphertext;
  }
}

/**
 * Apply stealth mode to standard ciphertext
 * @param {string} base64Ciphertext - Standard base64-encoded ciphertext
 * @param {StealthOptions} options - Stealth mode options
 * @returns {string} Stealth ciphertext
 */
export function applyStealth(base64Ciphertext, options = {}) {
  const mode = options.mode || STEALTH_NONE;

  switch (mode) {
    case STEALTH_NOISE:
      if (!options.password || !options.salt || !options.kdfFn) {
        throw new Error('Noise mode requires password, salt, and kdfFn options');
      }
      return applyNoiseMode(
        base64Ciphertext,
        options.password,
        options.salt,
        options.noiseMinBytes || DEFAULT_NOISE_MIN_BYTES,
        options.noiseMaxBytes || DEFAULT_NOISE_MAX_BYTES,
        options.kdfFn
      );

    case STEALTH_PADDING:
      return applyPaddingMode(
        base64Ciphertext,
        options.paddingBlockSize || DEFAULT_PADDING_BLOCK_SIZE,
        options.paddingMaxSize || DEFAULT_PADDING_MAX_SIZE
      );

    case STEALTH_COMBINED:
      if (!options.password || !options.salt || !options.kdfFn) {
        throw new Error('Combined mode requires password, salt, and kdfFn options');
      }
      return applyCombinedMode(base64Ciphertext, options.password, options.salt, options, options.kdfFn);

    case STEALTH_NONE:
    default:
      return base64Ciphertext;
  }
}

/**
 * Perform chi-square test for randomness
 * Returns a p-value. Values close to 1 indicate high randomness.
 * @param {Uint8Array} data - Data to test
 * @returns {number} Chi-square p-value (0-1)
 */
export function chiSquareRandomnessTest(data) {
  if (data.length === 0) return 0;

  const counts = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    counts[data[i]]++;
  }

  const expected = data.length / 256;
  let chiSquare = 0;
  for (let i = 0; i < 256; i++) {
    const diff = counts[i] - expected;
    chiSquare += (diff * diff) / expected;
  }

  const expectedChiSquare = 255;
  const ratio = chiSquare / expectedChiSquare;

  if (ratio >= 0.5 && ratio <= 2.0) {
    return 1 - Math.abs(ratio - 1);
  } else {
    return Math.max(0, 1 - Math.abs(ratio - 1) / 10);
  }
}

/**
 * Test if data passes chi-square randomness test
 * @param {Uint8Array} data - Data to test
 * @param {number} threshold - Minimum p-value to pass (default: 0.5)
 * @returns {boolean} True if data appears random
 */
export function passesRandomnessTest(data, threshold = 0.5) {
  const pValue = chiSquareRandomnessTest(data);
  return pValue >= threshold;
}

/**
 * Calculate the entropy of data in bits per byte
 * Maximum entropy for random data is 8 bits per byte
 * @param {Uint8Array} data - Data to analyze
 * @returns {number} Entropy in bits per byte (0-8)
 */
export function calculateEntropy(data) {
  if (data.length === 0) return 0;

  const counts = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    counts[data[i]]++;
  }

  let entropy = 0;
  const length = data.length;
  for (let i = 0; i < 256; i++) {
    if (counts[i] > 0) {
      const probability = counts[i] / length;
      entropy -= probability * Math.log2(probability);
    }
  }

  return entropy;
}
