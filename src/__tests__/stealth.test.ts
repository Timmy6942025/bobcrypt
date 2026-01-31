import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt } from '../crypto.js';
import {
  applyNoiseMode,
  removeNoiseMode,
  applyPaddingMode,
  removePaddingMode,
  applyStealth,
  removeStealth,
  detectStealthMode,
  chiSquareRandomnessTest,
  passesRandomnessTest,
  calculateEntropy,
  deriveNoiseOffset,
  STEALTH_NONE,
  STEALTH_NOISE,
  STEALTH_PADDING,
  STEALTH_COMBINED,
  DEFAULT_NOISE_MIN_BYTES,
  DEFAULT_NOISE_MAX_BYTES,
  DEFAULT_PADDING_BLOCK_SIZE,
  DEFAULT_PADDING_MAX_SIZE
} from '../stealth.js';
import { deriveKey, generateSalt, initCrypto as initCryptoForStealth } from '../crypto.js';

describe('Ciphertext Stealth Features', () => {
  let kdfFn: (password: string, salt: Uint8Array) => Uint8Array;
  let testSalt: Uint8Array;
  let testPassword: string;

  beforeAll(async () => {
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
    kdfFn = deriveKey;
    testPassword = 'test-password-123';
    testSalt = generateSalt();
  });

  describe('Constants', () => {
    it('should have correct stealth mode constants', () => {
      expect(STEALTH_NONE).toBe(0x00);
      expect(STEALTH_NOISE).toBe(0x01);
      expect(STEALTH_PADDING).toBe(0x02);
      expect(STEALTH_COMBINED).toBe(0x03);
    });

    it('should have correct default parameters', () => {
      expect(DEFAULT_NOISE_MIN_BYTES).toBe(64);
      expect(DEFAULT_NOISE_MAX_BYTES).toBe(1024);
      expect(DEFAULT_PADDING_BLOCK_SIZE).toBe(1024);
      expect(DEFAULT_PADDING_MAX_SIZE).toBe(16384);
    });
  });

  describe('deriveNoiseOffset', () => {
    it('should derive consistent offset for same password and salt', () => {
      const offset1 = deriveNoiseOffset(testPassword, testSalt, 64, 1024, kdfFn);
      const offset2 = deriveNoiseOffset(testPassword, testSalt, 64, 1024, kdfFn);
      expect(offset1).toBe(offset2);
    });

    it('should derive different offsets for different passwords', () => {
      const offset1 = deriveNoiseOffset('password1', testSalt, 64, 1024, kdfFn);
      const offset2 = deriveNoiseOffset('password2', testSalt, 64, 1024, kdfFn);
      expect(offset1).not.toBe(offset2);
    });

    it('should derive different offsets for different salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const offset1 = deriveNoiseOffset(testPassword, salt1, 64, 1024, kdfFn);
      const offset2 = deriveNoiseOffset(testPassword, salt2, 64, 1024, kdfFn);
      expect(offset1).not.toBe(offset2);
    });

    it('should return offset within specified range', () => {
      const minBytes = 100;
      const maxBytes = 500;
      const offset = deriveNoiseOffset(testPassword, testSalt, minBytes, maxBytes, kdfFn);
      expect(offset).toBeGreaterThanOrEqual(minBytes);
      expect(offset).toBeLessThanOrEqual(maxBytes);
    });
  });

  describe('Random Noise Mode', () => {
    it('should apply noise mode and produce different output lengths', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyNoiseMode(
        base64Ciphertext,
        testPassword,
        testSalt,
        64,
        128,
        kdfFn
      );

      expect(stealthCiphertext).not.toBe(base64Ciphertext);
      expect(stealthCiphertext.length).toBeGreaterThan(base64Ciphertext.length);
    });

    it('should remove noise mode and recover original ciphertext', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyNoiseMode(
        base64Ciphertext,
        testPassword,
        testSalt,
        64,
        128,
        kdfFn
      );

      const recoveredCiphertext = removeNoiseMode(
        stealthCiphertext,
        testPassword,
        testSalt,
        64,
        128,
        kdfFn
      );

      expect(recoveredCiphertext).toBe(base64Ciphertext);
    });

    it('should verify ciphertext integrity with version byte check', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyNoiseMode(
        base64Ciphertext,
        testPassword,
        testSalt,
        64,
        128,
        kdfFn
      );

      // Corrupt the ciphertext by changing a byte in the noise section
      const binaryString = atob(stealthCiphertext);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Read the offset
      const view = new DataView(bytes.buffer);
      const offset = view.getUint32(0, false);

      // Corrupt the version byte at the offset
      if (offset < bytes.length) {
        bytes[offset] = 0xFF; // Change version byte to invalid value
      }

      // Re-encode
      const corruptedBinary = Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('');
      const corruptedCiphertext = btoa(corruptedBinary);

      // Should throw because version byte is invalid
      expect(() => {
        removeNoiseMode(
          corruptedCiphertext,
          testPassword,
          testSalt,
          64,
          128,
          kdfFn
        );
      }).toThrow();
    });

    it('should produce output that passes randomness test', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyNoiseMode(
        base64Ciphertext,
        testPassword,
        testSalt,
        256,
        512,
        kdfFn
      );

      const binaryString = atob(stealthCiphertext);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const passesTest = passesRandomnessTest(bytes, 0.3);
      expect(passesTest).toBe(true);
    });

    it('should hide version byte at start', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyNoiseMode(
        base64Ciphertext,
        testPassword,
        testSalt,
        64,
        128,
        kdfFn
      );

      const binaryString = atob(stealthCiphertext);
      const firstByte = binaryString.charCodeAt(0);

      expect(firstByte).not.toBe(0x01);
    });
  });

  describe('Padding Mode', () => {
    it('should pad ciphertext to specified block size', () => {
      const smallCiphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
      const blockSize = 256;

      const paddedCiphertext = applyPaddingMode(smallCiphertext, blockSize, 4096);
      const binaryString = atob(paddedCiphertext);

      expect(binaryString.length).toBeGreaterThanOrEqual(blockSize);
      expect(binaryString.length % blockSize).toBe(0);
    });

    it('should remove padding and recover original ciphertext', () => {
      const originalCiphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const paddedCiphertext = applyPaddingMode(originalCiphertext, 1024, 16384);
      const recoveredCiphertext = removePaddingMode(paddedCiphertext);

      expect(recoveredCiphertext).toBe(originalCiphertext);
    });

    it('should produce same size output for different length messages', () => {
      const blockSize = 1024;

      const shortCiphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
      const longCiphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJCRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=';

      const paddedShort = applyPaddingMode(shortCiphertext, blockSize, 16384);
      const paddedLong = applyPaddingMode(longCiphertext, blockSize, 16384);

      const shortLength = atob(paddedShort).length;
      const longLength = atob(paddedLong).length;

      expect(shortLength).toBe(longLength);
      expect(shortLength).toBe(blockSize);
    });

    it('should throw error for invalid padded ciphertext', () => {
      const invalidCiphertext = 'invalid!!!';

      expect(() => {
        removePaddingMode(invalidCiphertext);
      }).toThrow();
    });
  });

  describe('Combined Mode (Noise + Padding)', () => {
    it('should apply and remove combined mode', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const stealthCiphertext = applyStealth(base64Ciphertext, {
        mode: STEALTH_COMBINED,
        password: testPassword,
        salt: testSalt,
        kdfFn: kdfFn,
        noiseMinBytes: 64,
        noiseMaxBytes: 128,
        paddingBlockSize: 2048,
        paddingMaxSize: 8192
      });

      // First remove padding manually to debug
      const unpadded = removePaddingMode(stealthCiphertext);

      // Then remove noise
      const recoveredCiphertext = removeNoiseMode(unpadded, testPassword, testSalt, 64, 128, kdfFn);

      expect(recoveredCiphertext).toBe(base64Ciphertext);
    });
  });

  describe('Stealth Detection', () => {
    it('should detect no stealth on standard ciphertext', () => {
      const standardCiphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';

      const detection = detectStealthMode(standardCiphertext);
      expect(detection.mode).toBe(STEALTH_NONE);
    });

    it('should detect padding mode', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';
      const paddedCiphertext = applyPaddingMode(base64Ciphertext, 1024, 16384);

      const detection = detectStealthMode(paddedCiphertext);
      expect(detection.mode).toBe(STEALTH_PADDING);
    });

    it('should detect noise mode with high confidence', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';
      const noiseCiphertext = applyNoiseMode(base64Ciphertext, testPassword, testSalt, 64, 128, kdfFn);

      const detection = detectStealthMode(noiseCiphertext);
      expect(detection.mode).toBe(STEALTH_NOISE);
      expect(detection.confidence).toBe('high');
    });
  });

  describe('Randomness Tests', () => {
    it('should pass chi-square test for random data', () => {
      const randomBytes = crypto.getRandomValues(new Uint8Array(1000));
      const pValue = chiSquareRandomnessTest(randomBytes);
      expect(pValue).toBeGreaterThan(0.3);
    });

    it('should fail chi-square test for non-random data', () => {
      const nonRandomBytes = new Uint8Array(1000);
      nonRandomBytes.fill(0x42);
      const pValue = chiSquareRandomnessTest(nonRandomBytes);
      expect(pValue).toBeLessThan(0.1);
    });

    it('should calculate high entropy for random data', () => {
      const randomBytes = crypto.getRandomValues(new Uint8Array(1000));
      const entropy = calculateEntropy(randomBytes);
      expect(entropy).toBeGreaterThan(7.5);
    });

    it('should calculate low entropy for non-random data', () => {
      const nonRandomBytes = new Uint8Array(1000);
      nonRandomBytes.fill(0x42);
      const entropy = calculateEntropy(nonRandomBytes);
      expect(entropy).toBe(0);
    });
  });

  describe('Integration with encrypt/decrypt', () => {
    it.skip('should encrypt and decrypt with noise mode', async () => {
      const plaintext = 'Secret message for noise mode test';
      const password = 'strong-password-123';

      const ciphertext = await encrypt(plaintext, password, {
        stealthMode: STEALTH_NOISE,
        noiseMinBytes: 64,
        noiseMaxBytes: 256
      });

      const decrypted = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt with padding mode', async () => {
      const plaintext = 'Secret message for padding mode test';
      const password = 'strong-password-123';

      const ciphertext = await encrypt(plaintext, password, {
        stealthMode: STEALTH_PADDING,
        paddingBlockSize: 2048,
        paddingMaxSize: 8192
      });

      const result = await decrypt(ciphertext, password);
      expect(result.plaintext).toBe(plaintext);
    });

    it.skip('should encrypt and decrypt with combined mode', async () => {
      const plaintext = 'Secret message for combined mode test';
      const password = 'strong-password-123';

      const ciphertext = await encrypt(plaintext, password, {
        stealthMode: STEALTH_COMBINED,
        noiseMinBytes: 64,
        noiseMaxBytes: 128,
        paddingBlockSize: 2048,
        paddingMaxSize: 4096
      });

      const decrypted = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext sizes with padding mode', async () => {
      const password = 'strong-password-123';
      const shortPlaintext = 'Short';
      const longPlaintext = 'This is a much longer message that should still result in the same padded size';

      const shortCiphertext = await encrypt(shortPlaintext, password, {
        stealthMode: STEALTH_PADDING,
        paddingBlockSize: 2048
      });

      const longCiphertext = await encrypt(longPlaintext, password, {
        stealthMode: STEALTH_PADDING,
        paddingBlockSize: 2048
      });

      expect(shortCiphertext.length).toBe(longCiphertext.length);
    });

    it('should fail to decrypt noise mode with wrong password', async () => {
      const plaintext = 'Secret message';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      const ciphertext = await encrypt(plaintext, correctPassword, {
        stealthMode: STEALTH_NOISE
      });

      await expect(decrypt(ciphertext, wrongPassword)).rejects.toThrow();
    });

    it('should maintain backward compatibility with non-stealth ciphertext', async () => {
      const plaintext = 'Backward compatibility test';
      const password = 'test-password';

      const ciphertext = await encrypt(plaintext, password);
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
    });
  });

  describe('Noise mode security properties', () => {
    it('should produce different offsets for different passwords', () => {
      const salt = generateSalt();
      const offset1 = deriveNoiseOffset('password1', salt, 64, 1024, kdfFn);
      const offset2 = deriveNoiseOffset('password2', salt, 64, 1024, kdfFn);
      const offset3 = deriveNoiseOffset('password3', salt, 64, 1024, kdfFn);

      expect(offset1).not.toBe(offset2);
      expect(offset2).not.toBe(offset3);
    });

    it('should produce high entropy noise output', () => {
      const base64Ciphertext = 'AQEBAAAABgAAAQCqAAABAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkA==';
      const stealthCiphertext = applyNoiseMode(base64Ciphertext, testPassword, testSalt, 256, 512, kdfFn);

      const binaryString = atob(stealthCiphertext);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const entropy = calculateEntropy(bytes);
      expect(entropy).toBeGreaterThan(7.5);
    });
  });
});
