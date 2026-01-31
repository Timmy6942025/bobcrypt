import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, deriveKey, generateSalt, deriveKeyWithSalt } from '../crypto.js';

describe('Argon2id Key Derivation Function', () => {
  // Initialize crypto before all tests
  beforeAll(async () => {
    // Mock window.crypto for Bun environment
    if (typeof window === 'undefined') {
      (global as any).window = {
        crypto: {
          subtle: {}
        }
      };
    }
    await initCrypto();
  });

  describe('deriveKey', () => {
    it('should derive a 32-byte key from password and salt', () => {
      const password = 'test-password';
      const salt = generateSalt();
      
      const key = deriveKey(password, salt);
      
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should produce the same key for same password and salt', () => {
      const password = 'my-secure-password';
      const salt = generateSalt();
      
      const key1 = deriveKey(password, salt);
      const key2 = deriveKey(password, salt);
      
      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different salts', () => {
      const password = 'my-secure-password';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      const key1 = deriveKey(password, salt1);
      const key2 = deriveKey(password, salt2);
      
      expect(key1).not.toEqual(key2);
    });

    it('should produce different keys for different passwords', () => {
      const password1 = 'password-one';
      const password2 = 'password-two';
      const salt = generateSalt();
      
      const key1 = deriveKey(password1, salt);
      const key2 = deriveKey(password2, salt);
      
      expect(key1).not.toEqual(key2);
    });

    it('should throw error for invalid salt length', () => {
      const password = 'test-password';
      const shortSalt = new Uint8Array(8);  // 8 bytes instead of 16
      const longSalt = new Uint8Array(32);  // 32 bytes instead of 16
      
      expect(() => deriveKey(password, shortSalt)).toThrow('Salt must be exactly 16 bytes');
      expect(() => deriveKey(password, longSalt)).toThrow('Salt must be exactly 16 bytes');
    });
  });

  describe('generateSalt', () => {
    it('should generate a 16-byte salt', () => {
      const salt = generateSalt();
      
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const salt3 = generateSalt();
      
      expect(salt1).not.toEqual(salt2);
      expect(salt2).not.toEqual(salt3);
      expect(salt1).not.toEqual(salt3);
    });

    it('should generate random salts', () => {
      // Generate multiple salts and verify they're not all zeros
      const salts = Array.from({ length: 10 }, () => generateSalt());
      
      for (const salt of salts) {
        const isAllZeros = salt.every(byte => byte === 0);
        expect(isAllZeros).toBe(false);
      }
    });
  });

  describe('deriveKeyWithSalt', () => {
    it('should derive key and return salt', () => {
      const password = 'test-password';
      
      const result = deriveKeyWithSalt(password);
      
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('salt');
      expect(result.key).toBeInstanceOf(Uint8Array);
      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.key.length).toBe(32);
      expect(result.salt.length).toBe(16);
    });

    it('should derive correct key from returned salt', () => {
      const password = 'test-password';
      
      const { key, salt } = deriveKeyWithSalt(password);
      const derivedKey = deriveKey(password, salt);
      
      expect(key).toEqual(derivedKey);
    });
  });

  describe('Performance', () => {
    it('should complete in under 2000ms', async () => {
      const password = 'performance-test-password';
      const salt = generateSalt();
      
      const startTime = performance.now();
      deriveKey(password, salt);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      console.log(`Argon2id KDF duration: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(2000);
    });
  });
});
