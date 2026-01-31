import { describe, it, expect } from 'bun:test';
import type {
  KeyEntry,
  KeyVault,
  EncryptedVault,
  KeyType,
  KeyManagerState,
} from '../../key-manager/types';

describe('Key Manager Types', () => {
  describe('KeyType', () => {
    it('should accept valid key types', () => {
      const passphrase: KeyType = 'passphrase';
      const bit256: KeyType = '256bit';

      expect(passphrase).toBe('passphrase');
      expect(bit256).toBe('256bit');
    });
  });

  describe('KeyEntry', () => {
    it('should have correct interface shape', () => {
      const entry: KeyEntry = {
        id: 'test-id',
        name: 'Test Key',
        type: 'passphrase',
        value: 'my-secret-passphrase',
        createdAt: '2024-01-15T10:30:00Z',
        lastUsed: '2024-01-15T12:00:00Z',
      };

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('lastUsed');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.value).toBe('string');
      expect(typeof entry.createdAt).toBe('string');
    });

    it('should allow optional lastUsed field', () => {
      const entry: KeyEntry = {
        id: 'test-id',
        name: 'Test Key',
        type: '256bit',
        value: 'a1b2c3d4e5f6',
        createdAt: '2024-01-15T10:30:00Z',
      };

      expect(entry.lastUsed).toBeUndefined();
    });
  });

  describe('KeyVault', () => {
    it('should have correct interface shape', () => {
      const vault: KeyVault = {
        version: 1,
        keys: [],
        defaultKeyId: 'default-id',
      };

      expect(vault).toHaveProperty('version');
      expect(vault).toHaveProperty('keys');
      expect(vault).toHaveProperty('defaultKeyId');
      expect(typeof vault.version).toBe('number');
      expect(Array.isArray(vault.keys)).toBe(true);
    });

    it('should allow optional defaultKeyId', () => {
      const vault: KeyVault = {
        version: 1,
        keys: [],
      };

      expect(vault.defaultKeyId).toBeUndefined();
    });
  });

  describe('EncryptedVault', () => {
    it('should have correct interface shape', () => {
      const encrypted: EncryptedVault = {
        salt: new Uint8Array(16),
        ciphertext: 'base64encodedstring',
      };

      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted.salt).toBeInstanceOf(Uint8Array);
      expect(typeof encrypted.ciphertext).toBe('string');
    });
  });

  describe('KeyManagerState', () => {
    it('should have correct interface shape', () => {
      const state: KeyManagerState = {
        isUnlocked: true,
        keys: [],
        selectedKeyId: 'selected-id',
        defaultKeyId: 'default-id',
      };

      expect(state).toHaveProperty('isUnlocked');
      expect(state).toHaveProperty('keys');
      expect(state).toHaveProperty('selectedKeyId');
      expect(state).toHaveProperty('defaultKeyId');
      expect(typeof state.isUnlocked).toBe('boolean');
      expect(Array.isArray(state.keys)).toBe(true);
    });

    it('should allow optional selectedKeyId and defaultKeyId', () => {
      const state: KeyManagerState = {
        isUnlocked: false,
        keys: [],
      };

      expect(state.selectedKeyId).toBeUndefined();
      expect(state.defaultKeyId).toBeUndefined();
    });
  });
});
