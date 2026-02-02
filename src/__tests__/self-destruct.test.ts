/**
 * Self-Destruct Mode Tests
 *
 * Tests for the optional self-destruct (one-time decryption) feature.
 * Self-destruct mode adds a flag to ciphertext metadata to indicate
 * that the message is intended for one-time viewing.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt } from '../crypto.js';

describe('Self-Destruct Mode', () => {
  beforeAll(async () => {
    await initCrypto();
  });

  describe('Encryption with self-destruct', () => {
    it('should encrypt without self-destruct by default', async () => {
      const plaintext = 'This is a test message';
      const password = 'securePassword123!';

      const ciphertext = await encrypt(plaintext, password);

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);

      // Verify via decryption result
      const result = await decrypt(ciphertext, password);
      expect(result.selfDestruct).toBe(false);
    });

    it('should encrypt with self-destruct when enabled', async () => {
      const plaintext = 'This is a secret message';
      const password = 'securePassword123!';

      const ciphertext = await encrypt(plaintext, password, { selfDestruct: true });

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);

      // Verify via decryption result
      const result = await decrypt(ciphertext, password);
      expect(result.selfDestruct).toBe(true);
    });

    it('should encrypt with both duress and self-destruct', async () => {
      const plaintext = 'Real secret message';
      const password = 'securePassword123!';
      const duressPassword = 'duressPassword456!';
      const fakePlaintext = 'Fake decoy message';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext,
        selfDestruct: true
      });

      expect(ciphertext).toBeDefined();
      const result = await decrypt(ciphertext, password);
      expect(result.selfDestruct).toBe(true);
    });
  });

  describe('Decryption with self-destruct', () => {
    it('should decrypt and return selfDestruct=false when flag not set', async () => {
      const plaintext = 'This is a test message';
      const password = 'securePassword123!';

      const ciphertext = await encrypt(plaintext, password);
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
      expect(result.selfDestruct).toBe(false);
    });

    it('should decrypt and return selfDestruct=true when flag is set', async () => {
      const plaintext = 'This is a secret message';
      const password = 'securePassword123!';

      const ciphertext = await encrypt(plaintext, password, { selfDestruct: true });
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
      expect(result.selfDestruct).toBe(true);
    });

    it('should return selfDestruct=true when decrypting duress with self-destruct', async () => {
      const plaintext = 'Real secret message';
      const password = 'securePassword123!';
      const duressPassword = 'duressPassword456!';
      const fakePlaintext = 'Fake decoy message';

      const ciphertext = await encrypt(plaintext, password, {
        duressPassword,
        fakePlaintext,
        selfDestruct: true
      });

      // Decrypt with duress password
      const result = await decrypt(ciphertext, duressPassword);

      expect(result.plaintext).toBe(fakePlaintext);
      expect(result.selfDestruct).toBe(true);
    });
  });

  describe('Round-trip tests', () => {
    it('should handle empty message with self-destruct', async () => {
      const plaintext = '';
      const password = 'password123!';

      const ciphertext = await encrypt(plaintext, password, { selfDestruct: true });
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
      expect(result.selfDestruct).toBe(true);
    });

    it('should handle unicode message with self-destruct', async () => {
      const plaintext = 'Hello 世界! 🌍 ñ émojis: 🔐🔓';
      const password = 'unicodePassword123!';

      const ciphertext = await encrypt(plaintext, password, { selfDestruct: true });
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
      expect(result.selfDestruct).toBe(true);
    });

    it('should handle long message with self-destruct', async () => {
      const plaintext = 'A'.repeat(10000);
      const password = 'longMessagePassword123!';

      const ciphertext = await encrypt(plaintext, password, { selfDestruct: true });
      const result = await decrypt(ciphertext, password);

      expect(result.plaintext).toBe(plaintext);
      expect(result.selfDestruct).toBe(true);
    });
  });
});
