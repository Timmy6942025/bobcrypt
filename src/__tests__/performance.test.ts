import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt, deriveKey, generateSalt } from '../crypto.js';

const DEBUG = process.env.DEBUG_TESTS === 'true';

describe('Performance Tests', () => {
  beforeAll(async () => {
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
  });

  describe('Argon2id Key Derivation Performance', () => {
    it('should complete Argon2id KDF in under 2000ms', () => {
      const password = 'performance-test-password';
      const salt = generateSalt();

      const startTime = performance.now();
      deriveKey(password, salt);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Argon2id KDF duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(2000);
    });

    it('should complete multiple KDF operations consistently', () => {
      const password = 'test-password';
      const iterations = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const salt = generateSalt();
        const startTime = performance.now();
        deriveKey(password, salt);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log(`Argon2id KDF average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`Argon2id KDF max duration: ${maxDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(2000);
      expect(maxDuration).toBeLessThan(2000);
    });

    it('should show consistent performance across different passwords', () => {
      const passwords = [
        'short',
        'medium-length-password',
        'this-is-a-very-long-password-with-many-characters-in-it',
        'P@$$w0rd!#$%^&*()'
      ];

      const durations: number[] = [];

      for (const password of passwords) {
        const salt = generateSalt();
        const startTime = performance.now();
        deriveKey(password, salt);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`Argon2id KDF average across password lengths: ${avgDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(2000);
    });
  });

  describe('Encryption Performance', () => {
    it('should encrypt 1KB text in under 100ms', async () => {
      const plaintext = 'A'.repeat(1024);
      const password = 'performance-test-password';

      const startTime = performance.now();
      await encrypt(plaintext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`1KB encryption duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);
    });

    it('should encrypt small text in under 100ms', async () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password';

      const startTime = performance.now();
      await encrypt(plaintext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Small text encryption duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);
    });

    it('should encrypt 10KB text efficiently', async () => {
      const plaintext = 'B'.repeat(10240);
      const password = 'test-password';

      const startTime = performance.now();
      await encrypt(plaintext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`10KB encryption duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Decryption Performance', () => {
    it('should decrypt 1KB ciphertext in under 100ms', async () => {
      const plaintext = 'C'.repeat(1024);
      const password = 'performance-test-password';
      const ciphertext = await encrypt(plaintext, password);

      const startTime = performance.now();
      await decrypt(ciphertext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`1KB decryption duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);
    });

    it('should decrypt small ciphertext in under 100ms', async () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password';
      const ciphertext = await encrypt(plaintext, password);

      const startTime = performance.now();
      await decrypt(ciphertext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Small text decryption duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Full Roundtrip Performance', () => {
    it('should complete encrypt/decrypt roundtrip for 1KB in under 200ms', async () => {
      const plaintext = 'D'.repeat(1024);
      const password = 'roundtrip-test-password';

      const startTime = performance.now();
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`1KB roundtrip duration: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(200);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle multiple consecutive operations efficiently', async () => {
      const password = 'batch-test-password';
      const messages = [
        'A'.repeat(100),
        'B'.repeat(500),
        'C'.repeat(1024),
        'D'.repeat(2048)
      ];

      const startTime = performance.now();

      for (const message of messages) {
        const ciphertext = await encrypt(message, password);
        await decrypt(ciphertext, password);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`Batch operations (4 messages) total duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`Average per message: ${(totalDuration / messages.length).toFixed(2)}ms`);

      expect(totalDuration).toBeLessThan(1000);
    });
  });

  describe('Memory and Scalability', () => {
    it('should handle 100KB plaintext efficiently', async () => {
      const plaintext = 'E'.repeat(102400);
      const password = 'large-file-test';

      const encryptStart = performance.now();
      const ciphertext = await encrypt(plaintext, password);
      const encryptEnd = performance.now();

      const decryptStart = performance.now();
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      const decryptEnd = performance.now();

      const encryptDuration = encryptEnd - encryptStart;
      const decryptDuration = decryptEnd - decryptStart;

      console.log(`100KB encryption: ${encryptDuration.toFixed(2)}ms`);
      console.log(`100KB decryption: ${decryptDuration.toFixed(2)}ms`);

      expect(encryptDuration).toBeLessThan(500);
      expect(decryptDuration).toBeLessThan(500);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle 1MB plaintext', async () => {
      const plaintext = 'F'.repeat(1048576);
      const password = 'very-large-file-test';

      const encryptStart = performance.now();
      const ciphertext = await encrypt(plaintext, password);
      const encryptEnd = performance.now();

      const decryptStart = performance.now();
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      const decryptEnd = performance.now();

      const encryptDuration = encryptEnd - encryptStart;
      const decryptDuration = decryptEnd - decryptStart;

      console.log(`1MB encryption: ${encryptDuration.toFixed(2)}ms`);
      console.log(`1MB decryption: ${decryptDuration.toFixed(2)}ms`);

      expect(encryptDuration).toBeLessThan(2000);
      expect(decryptDuration).toBeLessThan(2000);
      expect(decrypted).toBe(plaintext);
    }, 10000);
  });

  describe('Performance Benchmarks', () => {
    it('should provide benchmark summary', async () => {
      const results: Record<string, number> = {};

      const password = 'benchmark-password';

      const salt = generateSalt();
      const kdfStart = performance.now();
      deriveKey(password, salt);
      const kdfEnd = performance.now();
      results['Argon2id KDF'] = kdfEnd - kdfStart;

      const smallText = 'Hello, World!';
      const smallEncryptStart = performance.now();
      const smallCiphertext = await encrypt(smallText, password);
      const smallEncryptEnd = performance.now();
      results['Small text encrypt'] = smallEncryptEnd - smallEncryptStart;

      const smallDecryptStart = performance.now();
      await decrypt(smallCiphertext, password);
      const smallDecryptEnd = performance.now();
      results['Small text decrypt'] = smallDecryptEnd - smallDecryptStart;

      const kb1Text = 'A'.repeat(1024);
      const kb1EncryptStart = performance.now();
      const kb1Ciphertext = await encrypt(kb1Text, password);
      const kb1EncryptEnd = performance.now();
      results['1KB encrypt'] = kb1EncryptEnd - kb1EncryptStart;

      const kb1DecryptStart = performance.now();
      await decrypt(kb1Ciphertext, password);
      const kb1DecryptEnd = performance.now();
      results['1KB decrypt'] = kb1DecryptEnd - kb1DecryptStart;

      console.log('\n=== Performance Benchmark Summary ===');
      for (const [name, duration] of Object.entries(results)) {
        const status = duration < 100 ? '✓' : duration < 500 ? '~' : '!';
        console.log(`${status} ${name}: ${duration.toFixed(2)}ms`);
      }
      console.log('=====================================\n');

      expect(results['Argon2id KDF']).toBeLessThan(2000);
      expect(results['1KB encrypt']).toBeLessThan(100);
      expect(results['1KB decrypt']).toBeLessThan(100);
    });
  });
});
