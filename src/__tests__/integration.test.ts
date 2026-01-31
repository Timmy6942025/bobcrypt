import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt, generateSalt, deriveKey } from '../crypto.js';

describe('Integration Tests - Full Encrypt/Decrypt Flow', () => {
  beforeAll(async () => {
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
  });

  describe('Complete Encryption/Decryption Workflow', () => {
    it('should encrypt and decrypt a simple message', async () => {
      const plaintext = 'Hello, World!';
      const password = 'correct-horse-battery-staple';

      const ciphertext = await encrypt(plaintext, password);
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);

      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle the full workflow with strong passwords', async () => {
      const testCases = [
        { plaintext: 'Secret message', password: 'MyP@ssw0rd!2024' },
        { plaintext: 'Another secret', password: 'correct-horse-battery-staple-123' },
        { plaintext: 'Top secret data', password: 'Tr0ub4dor&3' }
      ];

      for (const { plaintext, password } of testCases) {
        const ciphertext = await encrypt(plaintext, password);
        const { plaintext: decrypted } = await decrypt(ciphertext, password);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should produce different ciphertexts for same plaintext with different passwords', async () => {
      const plaintext = 'Same message';
      const password1 = 'password-one-123';
      const password2 = 'password-two-456';

      const ciphertext1 = await encrypt(plaintext, password1);
      const ciphertext2 = await encrypt(plaintext, password2);

      expect(ciphertext1).not.toBe(ciphertext2);

      const { plaintext: decrypted1 } = await decrypt(ciphertext1, password1);
      const { plaintext: decrypted2 } = await decrypt(ciphertext2, password2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);

      await expect(decrypt(ciphertext1, password2)).rejects.toThrow('Decryption failed');
      await expect(decrypt(ciphertext2, password1)).rejects.toThrow('Decryption failed');
    });

    it('should handle multiple consecutive encryptions', async () => {
      const password = 'test-password-123';
      const messages = [
        'First message',
        'Second message',
        'Third message',
        'Fourth message',
        'Fifth message'
      ];

      const ciphertexts: string[] = [];

      for (const message of messages) {
        const ciphertext = await encrypt(message, password);
        ciphertexts.push(ciphertext);
      }

      const uniqueCiphertexts = new Set(ciphertexts);
      expect(uniqueCiphertexts.size).toBe(messages.length);

      for (let i = 0; i < messages.length; i++) {
        const { plaintext: decrypted } = await decrypt(ciphertexts[i], password);
        expect(decrypted).toBe(messages[i]);
      }
    });

    it('should handle encryption followed by decryption with same derived key', async () => {
      const plaintext = 'Test message for key derivation';
      const password = 'integration-test-password';

      const ciphertext = await encrypt(plaintext, password);

      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Cross-Format Compatibility', () => {
    it('should produce ciphertext that can be deserialized', async () => {
      const plaintext = 'Test for format compatibility';
      const password = 'format-test-password';

      const ciphertext = await encrypt(plaintext, password);

      expect(() => atob(ciphertext)).not.toThrow();

      const decoded = atob(ciphertext);
      expect(decoded.length).toBeGreaterThanOrEqual(39 + 17);

      expect(decoded.charCodeAt(0)).toBe(0x01);
      expect(decoded.charCodeAt(1)).toBe(0x01);
      expect(decoded.charCodeAt(26)).toBe(0x01);
    });

    it('should maintain format consistency across multiple operations', async () => {
      const password = 'consistency-test';

      for (let i = 0; i < 5; i++) {
        const plaintext = `Test message ${i}`;
        const ciphertext = await encrypt(plaintext, password);

        const decoded = atob(ciphertext);
        expect(decoded.charCodeAt(0)).toBe(0x01);
        expect(decoded.charCodeAt(1)).toBe(0x01);
        expect(decoded.charCodeAt(26)).toBe(0x01);

        const { plaintext: decrypted } = await decrypt(ciphertext, password);
        expect(decrypted).toBe(plaintext);
      }
    });
  });

  describe('Error Handling in Full Flow', () => {
    it('should fail decryption with wrong password after successful encryption', async () => {
      const plaintext = 'Secret data';
      const correctPassword = 'correct-password-123';
      const wrongPassword = 'wrong-password-456';

      const ciphertext = await encrypt(plaintext, correctPassword);

      await expect(decrypt(ciphertext, wrongPassword)).rejects.toThrow('Decryption failed');

      const { plaintext: decrypted } = await decrypt(ciphertext, correctPassword);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle corrupted ciphertext gracefully', async () => {
      const plaintext = 'Important message';
      const password = 'secure-password-789';

      const ciphertext = await encrypt(plaintext, password);

      const corruptedCiphertext = ciphertext.slice(0, -10) + 'XXXXXXXXXX';

      await expect(decrypt(corruptedCiphertext, password)).rejects.toThrow();
    });

    it('should handle truncated ciphertext gracefully', async () => {
      const plaintext = 'Important message';
      const password = 'secure-password-789';

      const ciphertext = await encrypt(plaintext, password);

      const truncatedCiphertext = ciphertext.slice(0, 50);

      await expect(decrypt(truncatedCiphertext, password)).rejects.toThrow();
    });

    it('should handle empty ciphertext', async () => {
      const password = 'test-password';

      await expect(decrypt('', password)).rejects.toThrow();
    });

    it('should handle invalid base64 ciphertext', async () => {
      const password = 'test-password';
      const invalidCiphertext = '!!!not-valid-base64!!!';

      await expect(decrypt(invalidCiphertext, password)).rejects.toThrow();
    });
  });

  describe('Key Derivation Integration', () => {
    it('should derive consistent keys in encrypt and decrypt operations', async () => {
      const password = 'key-derivation-test';
      const salt = generateSalt();

      const manualKey = deriveKey(password, salt);

      const plaintext = 'Key derivation test';
      const ciphertext = await encrypt(plaintext, password);

      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);

      expect(manualKey.length).toBe(32);
    });

    it('should use different salts for each encryption', async () => {
      const password = 'salt-uniqueness-test';
      const plaintext = 'Test message';

      const ciphertext1 = await encrypt(plaintext, password);
      const ciphertext2 = await encrypt(plaintext, password);

      const decoded1 = atob(ciphertext1);
      const decoded2 = atob(ciphertext2);

      const salt1 = decoded1.slice(10, 26);
      const salt2 = decoded2.slice(10, 26);

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle a typical secure message workflow', async () => {
      const aliceMessage = 'Meet me at the usual place at midnight. Come alone.';
      const sharedPassword = 'secret-meeting-password-2024';

      const encryptedMessage = await encrypt(aliceMessage, sharedPassword);

      const { plaintext: bobDecrypted } = await decrypt(encryptedMessage, sharedPassword);

      expect(bobDecrypted).toBe(aliceMessage);
    });

    it('should handle password with special characters', async () => {
      const plaintext = 'Secret with special password';
      const password = 'P@$$w0rd!#$%^&*()_+-=[]{}|;:,.<>?';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long passphrase', async () => {
      const plaintext = 'Secret message';
      const password = 'The quick brown fox jumps over the lazy dog and then runs away into the forest where it finds a hidden treasure chest filled with gold coins and precious gems';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle multi-line messages', async () => {
      const plaintext = `Dear Friend,

This is a secret message spanning multiple lines.
Please keep it confidential.

Best regards,
Secret Agent`;
      const password = 'multi-line-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });
});
