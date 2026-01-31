import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt, generateNonce, generateSalt } from '../crypto.js';

describe('AES-256-GCM Encryption/Decryption', () => {
  // Initialize crypto before all tests
  beforeAll(async () => {
    // Ensure window.crypto uses the real Web Crypto API from Bun
    // Bun provides Web Crypto via globalThis.crypto
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and return a base64 string', async () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);
      // Base64 strings only contain valid characters
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should produce different ciphertexts for same plaintext and password (random nonce)', async () => {
      const plaintext = 'Same message';
      const password = 'same-password';
      
      const ciphertext1 = await encrypt(plaintext, password);
      const ciphertext2 = await encrypt(plaintext, password);
      
      expect(ciphertext1).not.toBe(ciphertext2);
    });

    it('should handle empty plaintext', async () => {
      const plaintext = '';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界! 🌍 ñ é ü';
      const password = 'unicode-test';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long plaintext', async () => {
      const plaintext = 'A'.repeat(10000);
      const password = 'long-text-test';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('roundtrip', () => {
    it('should roundtrip simple text', async () => {
      const plaintext = 'Hello, World!';
      const password = 'roundtrip-test';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should roundtrip text with special characters', async () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const password = 'special-chars';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should roundtrip multiline text', async () => {
      const plaintext = `Line 1
Line 2
Line 3
\tIndented line`;
      const password = 'multiline-test';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should roundtrip with strong password', async () => {
      const plaintext = 'Top secret data';
      const password = 'correct-horse-battery-staple-123!@#';
      
      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('different passwords produce different ciphertexts', () => {
    it('should produce different ciphertexts for different passwords', async () => {
      const plaintext = 'Same plaintext';
      const password1 = 'password-one';
      const password2 = 'password-two';
      
      const ciphertext1 = await encrypt(plaintext, password1);
      const ciphertext2 = await encrypt(plaintext, password2);
      
      // Both should decrypt successfully with their respective passwords
      const { plaintext: decrypted1 } = await decrypt(ciphertext1, password1);
      const { plaintext: decrypted2 } = await decrypt(ciphertext2, password2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
      
      // Different passwords should not decrypt each other's ciphertexts
      await expect(decrypt(ciphertext1, password2)).rejects.toThrow('Decryption failed');
      await expect(decrypt(ciphertext2, password1)).rejects.toThrow('Decryption failed');
    });
  });

  describe('generateNonce', () => {
    it('should generate a 12-byte nonce', () => {
      const nonce = generateNonce();
      
      expect(nonce).toBeInstanceOf(Uint8Array);
      expect(nonce.length).toBe(12);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      const nonce3 = generateNonce();
      
      expect(nonce1).not.toEqual(nonce2);
      expect(nonce2).not.toEqual(nonce3);
      expect(nonce1).not.toEqual(nonce3);
    });

    it('should generate random nonces', () => {
      // Generate multiple nonces and verify they're not all zeros
      const nonces = Array.from({ length: 10 }, () => generateNonce());
      
      for (const nonce of nonces) {
        const isAllZeros = nonce.every(byte => byte === 0);
        expect(isAllZeros).toBe(false);
      }
    });
  });

  describe('ciphertext format', () => {
    it('should produce valid base64 output', async () => {
      const plaintext = 'Test message';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      
      // Should be valid base64
      expect(() => atob(ciphertext)).not.toThrow();
      
      // Decode and check minimum length
      const decoded = atob(ciphertext);
      // Minimum: 16 (salt) + 12 (nonce) + 1 (min ciphertext) + 16 (tag) = 45 bytes
      expect(decoded.length).toBeGreaterThanOrEqual(45);
    });

    it('should include salt in first 16 bytes', async () => {
      const plaintext = 'Test';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      const decoded = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
      
      // First 16 bytes should be the salt (non-zero, random)
      const salt = decoded.slice(0, 16);
      const isAllZeros = salt.every(byte => byte === 0);
      expect(isAllZeros).toBe(false);
    });

    it('should include nonce in bytes 16-27', async () => {
      const plaintext = 'Test';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      const decoded = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
      
      // Bytes 16-27 should be the nonce (12 bytes, non-zero, random)
      const nonce = decoded.slice(16, 28);
      expect(nonce.length).toBe(12);
      const isAllZeros = nonce.every(byte => byte === 0);
      expect(isAllZeros).toBe(false);
    });
  });

  describe('authentication', () => {
    it('should detect tampered authentication tag', async () => {
      const plaintext = 'Secret message';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      const decoded = atob(ciphertext);
      
      // Tamper with the last byte (part of auth tag)
      const tampered = decoded.slice(0, -1) + String.fromCharCode(decoded.charCodeAt(decoded.length - 1) ^ 0xFF);
      const tamperedBase64 = btoa(tampered);
      
      await expect(decrypt(tamperedBase64, password)).rejects.toThrow('Decryption failed');
    });

    it('should detect tampered ciphertext body', async () => {
      const plaintext = 'Secret message';
      const password = 'test-password';
      
      const ciphertext = await encrypt(plaintext, password);
      const decodedBytes = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
      
      // Tamper with a byte in the middle (ciphertext body, after salt+nonce, before tag)
      decodedBytes[30] ^= 0xFF;
      
      const tampered = btoa(String.fromCharCode(...decodedBytes));
      
      await expect(decrypt(tampered, password)).rejects.toThrow('Decryption failed');
    });
  });
});
