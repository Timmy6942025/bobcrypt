import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, isWebCryptoAvailable, getCryptoStatus } from '../crypto.js';

describe('Crypto Library Initialization', () => {
  // Setup window.crypto mock before all tests
  beforeAll(() => {
    if (typeof window === 'undefined') {
      global.window = {
        crypto: {
          subtle: {}
        }
      } as any;
    }
  });

  describe('Web Crypto API Detection', () => {
    it('should detect Web Crypto API availability', () => {
      const available = isWebCryptoAvailable();
      // In Bun test environment, window might not be defined
      // but we should still test the function works
      expect(typeof available).toBe('boolean');
    });

    it('should return crypto status object', () => {
      const status = getCryptoStatus();
      expect(status).toHaveProperty('webCrypto');
      expect(status).toHaveProperty('libsodium');
      expect(typeof status.webCrypto).toBe('boolean');
      expect(typeof status.libsodium).toBe('boolean');
    });
  });

  describe('libsodium.js Initialization', () => {
    it('should initialize libsodium.js successfully', async () => {
      const sodium = await initCrypto();
      
      // Verify sodium object is returned
      expect(sodium).toBeDefined();
      expect(sodium.SODIUM_VERSION_STRING).toBeDefined();
      expect(typeof sodium.SODIUM_VERSION_STRING).toBe('string');
    });

    it('should throw error when Web Crypto API is not available', async () => {
      // Temporarily remove window.crypto and globalThis.crypto
      const originalWindow = global.window;
      const originalGlobalThisCrypto = globalThis.crypto;
      global.window = undefined as any;
      globalThis.crypto = undefined as any;

      await expect(initCrypto()).rejects.toThrow('Web Crypto API not available');

      // Restore window and globalThis.crypto
      global.window = originalWindow;
      globalThis.crypto = originalGlobalThisCrypto;
    });

    it('should have sodium.ready resolved after initialization', async () => {
      const sodium = await initCrypto();
      
      // The sodium object should be ready
      expect(sodium).toBeDefined();
      expect(sodium.ready).toBeDefined();
    });
  });

  describe('Crypto Capabilities', () => {
    it('should report correct crypto status after initialization', async () => {
      await initCrypto();
      const status = getCryptoStatus();
      
      expect(status.webCrypto).toBe(true);
      expect(status.libsodium).toBe(true);
    });
  });
});
