import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, generateSalt } from '../../crypto.js';
import { deriveMasterKey, encryptVault, decryptVault } from '../../key-manager/master-crypto.js';

describe('Master Password Encryption', () => {
  beforeAll(async () => {
    if (typeof window === 'undefined') {
      (global as any).window = {
        crypto: {
          subtle: {}
        }
      };
    }
    await initCrypto();
  });

  describe('deriveMasterKey', () => {
    it('should return 32 bytes', () => {
      const password = 'master-password';
      const salt = generateSalt();
      
      const key = deriveMasterKey(password, salt);
      
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should produce the same key for same password and salt', () => {
      const password = 'my-secure-master-password';
      const salt = generateSalt();
      
      const key1 = deriveMasterKey(password, salt);
      const key2 = deriveMasterKey(password, salt);
      
      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different salts', () => {
      const password = 'my-secure-master-password';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      const key1 = deriveMasterKey(password, salt1);
      const key2 = deriveMasterKey(password, salt2);
      
      expect(key1).not.toEqual(key2);
    });

    it('should produce different keys for different passwords', () => {
      const password1 = 'master-password-one';
      const password2 = 'master-password-two';
      const salt = generateSalt();
      
      const key1 = deriveMasterKey(password1, salt);
      const key2 = deriveMasterKey(password2, salt);
      
      expect(key1).not.toEqual(key2);
    });

    it('should throw error for invalid salt length', () => {
      const password = 'master-password';
      const shortSalt = new Uint8Array(8);
      const longSalt = new Uint8Array(32);
      
      expect(() => deriveMasterKey(password, shortSalt)).toThrow('Salt must be exactly 16 bytes');
      expect(() => deriveMasterKey(password, longSalt)).toThrow('Salt must be exactly 16 bytes');
    });
  });

  describe('encryptVault/decryptVault roundtrip', () => {
    it('should encrypt and decrypt vault data successfully', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = {
        keys: [
          { id: 'key1', name: 'Test Key', value: 'secret-value-1' },
          { id: 'key2', name: 'Another Key', value: 'secret-value-2' }
        ],
        metadata: {
          created: Date.now(),
          version: '1.0'
        }
      };
      
      const encrypted = encryptVault(vaultData, masterKey);
      const decrypted = decryptVault(encrypted, masterKey);
      
      expect(decrypted).toEqual(vaultData);
    });

    it('should handle empty vault', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = {};
      
      const encrypted = encryptVault(vaultData, masterKey);
      const decrypted = decryptVault(encrypted, masterKey);
      
      expect(decrypted).toEqual(vaultData);
    });

    it('should handle nested objects', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = {
        user: {
          profile: {
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        data: [1, 2, 3, { nested: 'value' }]
      };
      
      const encrypted = encryptVault(vaultData, masterKey);
      const decrypted = decryptVault(encrypted, masterKey);
      
      expect(decrypted).toEqual(vaultData);
    });

    it('should produce different ciphertexts for same data (random nonce)', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = { test: 'data' };
      
      const encrypted1 = encryptVault(vaultData, masterKey);
      const encrypted2 = encryptVault(vaultData, masterKey);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same data
      expect(decryptVault(encrypted1, masterKey)).toEqual(vaultData);
      expect(decryptVault(encrypted2, masterKey)).toEqual(vaultData);
    });
  });

  describe('wrong password rejection', () => {
    it('should fail decryption with wrong password', () => {
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      const salt = generateSalt();
      
      const correctKey = deriveMasterKey(correctPassword, salt);
      const wrongKey = deriveMasterKey(wrongPassword, salt);
      
      const vaultData = { secret: 'data' };
      const encrypted = encryptVault(vaultData, correctKey);
      
      expect(() => decryptVault(encrypted, wrongKey)).toThrow();
    });

    it('should fail decryption with different salt-derived key', () => {
      const password = 'master-password';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      const key1 = deriveMasterKey(password, salt1);
      const key2 = deriveMasterKey(password, salt2);
      
      const vaultData = { secret: 'data' };
      const encrypted = encryptVault(vaultData, key1);
      
      expect(() => decryptVault(encrypted, key2)).toThrow();
    });
  });

  describe('tampered vault detection', () => {
    it('should detect tampered ciphertext', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = { secret: 'data' };
      const encrypted = encryptVault(vaultData, masterKey);
      
      // Tamper with the ciphertext by changing a character
      const tampered = encrypted.slice(0, -5) + 'X' + encrypted.slice(-4);
      
      expect(() => decryptVault(tampered, masterKey)).toThrow();
    });

    it('should detect truncated ciphertext', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = { secret: 'data' };
      const encrypted = encryptVault(vaultData, masterKey);
      
      // Truncate the ciphertext
      const truncated = encrypted.slice(0, 50);
      
      expect(() => decryptVault(truncated, masterKey)).toThrow();
    });

    it('should detect extended ciphertext', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = { secret: 'data' };
      const encrypted = encryptVault(vaultData, masterKey);
      
      // Extend the ciphertext
      const extended = encrypted + 'AAAA';
      
      expect(() => decryptVault(extended, masterKey)).toThrow();
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid master key length in encryptVault', () => {
      const shortKey = new Uint8Array(16);
      const longKey = new Uint8Array(64);
      
      const vaultData = { test: 'data' };
      
      expect(() => encryptVault(vaultData, shortKey)).toThrow('Master key must be exactly 32 bytes');
      expect(() => encryptVault(vaultData, longKey)).toThrow('Master key must be exactly 32 bytes');
    });

    it('should throw error for invalid master key length in decryptVault', () => {
      const password = 'master-password';
      const salt = generateSalt();
      const masterKey = deriveMasterKey(password, salt);
      
      const vaultData = { test: 'data' };
      const encrypted = encryptVault(vaultData, masterKey);
      
      const shortKey = new Uint8Array(16);
      const longKey = new Uint8Array(64);
      
      expect(() => decryptVault(encrypted, shortKey)).toThrow('Master key must be exactly 32 bytes');
      expect(() => decryptVault(encrypted, longKey)).toThrow('Master key must be exactly 32 bytes');
    });
  });

  describe('performance', () => {
    it('should complete key derivation in under 3000ms', async () => {
      const password = 'performance-test-password';
      const salt = generateSalt();
      
      const startTime = performance.now();
      deriveMasterKey(password, salt);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000);
    });
  });
});
