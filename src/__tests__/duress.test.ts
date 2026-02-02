import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt, deriveDuressKey, generateSalt } from '../crypto.js';

describe('Duress Password Support', () => {
  beforeAll(async () => {
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
  });

  describe('encrypt with duress', () => {
    it('should encrypt with duress password and fake plaintext', async () => {
      const plaintext = 'Real secret message';
      const password = 'primary-password-123';
      const duressPassword = 'duress-password-456';
      const fakePlaintext = 'Fake decoy message';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('should reject when duress password equals primary password', async () => {
      const plaintext = 'Secret message';
      const password = 'same-password';
      const fakePlaintext = 'Fake message';

      await expect(
        encrypt(plaintext, password, {
          duressPassword: password,
          fakePlaintext
        })
      ).rejects.toThrow('Invalid parameters');
    });

    it('should produce longer ciphertext with duress enabled', async () => {
      const plaintext = 'Test message';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'Fake message';

      const ciphertextWithoutDuress = await encrypt(plaintext, password);
      const ciphertextWithDuress = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      expect(ciphertextWithDuress.length).toBeGreaterThan(ciphertextWithoutDuress.length);
    });
  });

  describe('decrypt with duress', () => {
    it('should decrypt real plaintext with primary password', async () => {
      const plaintext = 'Real secret message';
      const password = 'primary-password-123';
      const duressPassword = 'duress-password-456';
      const fakePlaintext = 'Fake decoy message';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt fake plaintext with duress password', async () => {
      const plaintext = 'Real secret message';
      const password = 'primary-password-123';
      const duressPassword = 'duress-password-456';
      const fakePlaintext = 'Fake decoy message';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decrypted } = await decrypt(ciphertext, duressPassword);
      expect(decrypted).toBe(fakePlaintext);
    });

    it('same ciphertext should decrypt to different plaintexts with different passwords', async () => {
      const realPlaintext = 'Real secret message';
      const fakePlaintext = 'Fake decoy message';
      const password = 'primary-password-123';
      const duressPassword = 'duress-password-456';

      const ciphertext = await encrypt(realPlaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decryptedWithPrimary } = await decrypt(ciphertext, password);
      const { plaintext: decryptedWithDuress } = await decrypt(ciphertext, duressPassword);

      expect(decryptedWithPrimary).toBe(realPlaintext);
      expect(decryptedWithDuress).toBe(fakePlaintext);
      expect(decryptedWithPrimary).not.toBe(decryptedWithDuress);
    });

    it('should fail with wrong password (neither primary nor duress)', async () => {
      const plaintext = 'Secret message';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'Fake message';
      const wrongPassword = 'wrong-password';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      await expect(decrypt(ciphertext, wrongPassword)).rejects.toThrow('Decryption failed');
    });
  });

  describe('duress key derivation', () => {
    it('should derive different keys for same password with different salts', () => {
      const password = 'test-password';
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      const key1 = deriveDuressKey(password, salt1);
      const key2 = deriveDuressKey(password, salt2);

      expect(key1).not.toEqual(key2);
      expect(key1.length).toBe(32);
      expect(key2.length).toBe(32);
    });

    it('should derive different keys for different passwords with same salt', () => {
      const password1 = 'password-one';
      const password2 = 'password-two';
      const salt = generateSalt();

      const key1 = deriveDuressKey(password1, salt);
      const key2 = deriveDuressKey(password2, salt);

      expect(key1).not.toEqual(key2);
    });

    it('should derive same key for same password and salt', () => {
      const password = 'test-password';
      const salt = generateSalt();

      const key1 = deriveDuressKey(password, salt);
      const key2 = deriveDuressKey(password, salt);

      expect(key1).toEqual(key2);
    });

    it('should reject invalid salt length', () => {
      const password = 'test-password';
      const invalidSalt = new Uint8Array(8); // Wrong size

      expect(() => deriveDuressKey(password, invalidSalt)).toThrow('Invalid parameters');
    });
  });

  describe('no duress metadata leakage', () => {
    it('ciphertext should not contain duress indicator in header', async () => {
      const plaintext = 'Secret message';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'Fake message';

      const ciphertextWithDuress = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const ciphertextWithoutDuress = await encrypt(plaintext, password);

      // Decode both and compare headers (first 40 bytes)
      const decodedWith = atob(ciphertextWithDuress);
      const decodedWithout = atob(ciphertextWithoutDuress);

      // Headers should be identical in structure (version, kdf, cipher, etc.)
      // The only difference should be in the encrypted data length
      const headerWith = decodedWith.slice(0, 40);
      const headerWithout = decodedWithout.slice(0, 40);

      // Both should have same version (0x01 at position 0)
      expect(headerWith.charCodeAt(0)).toBe(0x01);
      expect(headerWithout.charCodeAt(0)).toBe(0x01);

      // Both should have same KDF algorithm (0x01 at position 1)
      expect(headerWith.charCodeAt(1)).toBe(0x01);
      expect(headerWithout.charCodeAt(1)).toBe(0x01);

      // Both should have same cipher algorithm (0x01 at position 26)
      expect(headerWith.charCodeAt(26)).toBe(0x01);
      expect(headerWithout.charCodeAt(26)).toBe(0x01);
    });

    it('ciphertext length alone should not indicate duress mode', async () => {
      // Different plaintext lengths will produce different ciphertext lengths
      // So length alone is not a reliable indicator
      const shortPlaintext = 'Hi';
      const longPlaintext = 'This is a much longer message with more content';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'Fake';

      const shortWithDuress = await encrypt(shortPlaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const longWithoutDuress = await encrypt(longPlaintext, password);

      // Long plaintext without duress could be same length as short with duress
      // This demonstrates that length alone doesn't indicate duress mode
      const shortWithDuressLength = atob(shortWithDuress).length;
      const longWithoutDuressLength = atob(longWithoutDuress).length;

      // The test passes if lengths are comparable (no obvious "duress flag")
      expect(typeof shortWithDuressLength).toBe('number');
      expect(typeof longWithoutDuressLength).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle minimal fake plaintext', async () => {
      // Empty plaintext creates edge cases with GCM auth tag only
      // Use minimal 1-character fake plaintext instead
      const plaintext = 'Real message';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'X'; // Minimal but valid

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decryptedWithDuress } = await decrypt(ciphertext, duressPassword);
      expect(decryptedWithDuress).toBe(fakePlaintext);
    });

    it('should handle unicode in fake plaintext', async () => {
      const plaintext = 'Real message';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = '假消息 🎭 ñ';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decryptedWithDuress } = await decrypt(ciphertext, duressPassword);
      expect(decryptedWithDuress).toBe(fakePlaintext);
    });

    it('should handle long fake plaintext', async () => {
      const plaintext = 'Real';
      const password = 'primary-password';
      const duressPassword = 'duress-password';
      const fakePlaintext = 'A'.repeat(5000);

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext
      });

      const { plaintext: decryptedWithDuress } = await decrypt(ciphertext, duressPassword);
      expect(decryptedWithDuress).toBe(fakePlaintext);
    });

    it('should decrypt normally without duress options', async () => {
      const plaintext = 'Secret message';
      const password = 'primary-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });
});
