import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  initializeVault,
  unlockVault,
  lockVault,
  addKey,
  getKey,
  getAllKeys,
  deleteKey,
  updateKey,
  exportVault,
  importVault,
  isVaultUnlocked,
  getVaultMetadata,
  clearVault,
} from '../../key-manager/storage.js';

const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  },
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  },
  removeItem(key: string): void {
    this.store.delete(key);
  },
  clear(): void {
    this.store.clear();
  },
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Key Storage Service', () => {
  const TEST_PASSWORD = 'correct-horse-battery-staple';
  const WRONG_PASSWORD = 'wrong-password-123';

  beforeEach(() => {
    mockLocalStorage.clear();
    lockVault();
  });

  afterEach(() => {
    mockLocalStorage.clear();
    lockVault();
  });

  describe('initializeVault', () => {
    it('should create encrypted storage in localStorage', async () => {
      await initializeVault(TEST_PASSWORD);

      const stored = mockLocalStorage.getItem('encyphrix_key_vault');
      expect(stored).toBeTruthy();
      expect(typeof stored).toBe('string');
      expect(stored!.length).toBeGreaterThan(0);
    });

    it('should throw error if vault already exists', async () => {
      await initializeVault(TEST_PASSWORD);

      expect(async () => {
        await initializeVault(TEST_PASSWORD);
      }).toThrow('Vault already exists');
    });

    it('should throw error if password is too short', async () => {
      expect(async () => {
        await initializeVault('short');
      }).toThrow('at least 8 characters');
    });

    it('should throw error if password is empty', async () => {
      expect(async () => {
        await initializeVault('');
      }).toThrow('at least 8 characters');
    });

    it('should unlock vault after initialization', async () => {
      await initializeVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);
    });

    it('should store vault metadata', async () => {
      await initializeVault(TEST_PASSWORD);

      const metadata = getVaultMetadata();
      expect(metadata).toBeTruthy();
      expect(metadata!.version).toBe(1);
      expect(metadata!.createdAt).toBeTruthy();
      expect(metadata!.keyCount).toBe(0);
    });
  });

  describe('unlockVault', () => {
    it('should decrypt and load vault with correct password', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(isVaultUnlocked()).toBe(false);

      await unlockVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);
    });

    it('should fail with wrong password', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(async () => {
        await unlockVault(WRONG_PASSWORD);
      }).toThrow('Invalid password');
    });

    it('should throw error if vault does not exist', async () => {
      expect(async () => {
        await unlockVault(TEST_PASSWORD);
      }).toThrow('Vault does not exist');
    });
  });

  describe('lockVault', () => {
    it('should clear decrypted vault from memory', async () => {
      await initializeVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);

      lockVault();
      expect(isVaultUnlocked()).toBe(false);
    });

    it('should not affect localStorage', async () => {
      await initializeVault(TEST_PASSWORD);
      const before = mockLocalStorage.getItem('encyphrix_key_vault');

      lockVault();

      const after = mockLocalStorage.getItem('encyphrix_key_vault');
      expect(after).toBe(before);
    });
  });

  describe('addKey', () => {
    it('should add a passphrase key to vault', async () => {
      await initializeVault(TEST_PASSWORD);

      const keyData = {
        name: 'My Passphrase Key',
        type: 'passphrase' as const,
        value: 'correct-horse-battery-staple',
      };

      const added = await addKey(keyData);

      expect(added.id).toBeTruthy();
      expect(added.name).toBe(keyData.name);
      expect(added.type).toBe(keyData.type);
      expect(added.value).toBe(keyData.value);
      expect(added.createdAt).toBeTruthy();
      expect(added.lastUsed).toBeNull();
    });

    it('should add a 256bit key to vault', async () => {
      await initializeVault(TEST_PASSWORD);

      const keyData = {
        name: 'My 256-bit Key',
        type: '256bit' as const,
        value: 'a1b2c3d4e5f6789012345678901234567890abcdef',
      };

      const added = await addKey(keyData);

      expect(added.type).toBe('256bit');
      expect(added.value).toBe(keyData.value);
    });

    it('should generate unique IDs for each key', async () => {
      await initializeVault(TEST_PASSWORD);

      const key1 = await addKey({
        name: 'Key 1',
        type: 'passphrase' as const,
        value: 'value1',
      });

      const key2 = await addKey({
        name: 'Key 2',
        type: 'passphrase' as const,
        value: 'value2',
      });

      expect(key1.id).not.toBe(key2.id);
    });

    it('should throw error if vault is locked', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(async () => {
        await addKey({
          name: 'Test',
          type: 'passphrase' as const,
          value: 'value',
        });
      }).toThrow('Vault is locked');
    });

    it('should throw error if key data is invalid', async () => {
      await initializeVault(TEST_PASSWORD);

      expect(async () => {
        await addKey({
          name: '',
          type: 'passphrase' as const,
          value: 'value',
        });
      }).toThrow('Key must have name');

      expect(async () => {
        await addKey({
          name: 'Test',
          type: 'invalid' as any,
          value: 'value',
        });
      }).toThrow('Key type must be');
    });

    it('should persist key to encrypted storage', async () => {
      await initializeVault(TEST_PASSWORD);

      await addKey({
        name: 'Persisted Key',
        type: 'passphrase' as const,
        value: 'secret-value',
      });

      lockVault();
      await unlockVault(TEST_PASSWORD);

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Persisted Key');
    });
  });

  describe('getKey', () => {
    it('should retrieve key by ID', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'Test Key',
        type: 'passphrase' as const,
        value: 'secret',
      });

      const retrieved = getKey(added.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(added.id);
      expect(retrieved!.name).toBe(added.name);
      expect(retrieved!.value).toBe(added.value);
    });

    it('should return null for non-existent key', async () => {
      await initializeVault(TEST_PASSWORD);

      const retrieved = getKey('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should throw error if vault is locked', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(() => {
        getKey('any-id');
      }).toThrow('Vault is locked');
    });
  });

  describe('getAllKeys', () => {
    it('should return empty array for new vault', async () => {
      await initializeVault(TEST_PASSWORD);

      const keys = getAllKeys();
      expect(keys).toEqual([]);
    });

    it('should return all keys without values', async () => {
      await initializeVault(TEST_PASSWORD);

      await addKey({
        name: 'Key 1',
        type: 'passphrase' as const,
        value: 'secret1',
      });

      await addKey({
        name: 'Key 2',
        type: '256bit' as const,
        value: 'secret2',
      });

      const keys = getAllKeys();

      expect(keys.length).toBe(2);
      expect(keys[0].name).toBe('Key 1');
      expect(keys[1].name).toBe('Key 2');
      expect(keys[0]).not.toHaveProperty('value');
      expect(keys[1]).not.toHaveProperty('value');
    });

    it('should throw error if vault is locked', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(() => {
        getAllKeys();
      }).toThrow('Vault is locked');
    });
  });

  describe('deleteKey', () => {
    it('should remove key by ID', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'To Delete',
        type: 'passphrase' as const,
        value: 'secret',
      });

      const deleted = await deleteKey(added.id);

      expect(deleted).toBe(true);
      expect(getKey(added.id)).toBeNull();
    });

    it('should return false for non-existent key', async () => {
      await initializeVault(TEST_PASSWORD);

      const deleted = await deleteKey('non-existent');
      expect(deleted).toBe(false);
    });

    it('should persist deletion to storage', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'To Delete',
        type: 'passphrase' as const,
        value: 'secret',
      });

      await deleteKey(added.id);

      lockVault();
      await unlockVault(TEST_PASSWORD);

      expect(getKey(added.id)).toBeNull();
    });
  });

  describe('updateKey', () => {
    it('should update key name', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'Original Name',
        type: 'passphrase' as const,
        value: 'secret',
      });

      const updated = await updateKey(added.id, { name: 'Updated Name' });

      expect(updated).toBeTruthy();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.value).toBe('secret');
    });

    it('should update key value', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'Test Key',
        type: 'passphrase' as const,
        value: 'old-value',
      });

      const updated = await updateKey(added.id, { value: 'new-value' });

      expect(updated).toBeTruthy();
      expect(updated!.value).toBe('new-value');
      expect(updated!.name).toBe('Test Key');
    });

    it('should update both name and value', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'Original',
        type: 'passphrase' as const,
        value: 'old',
      });

      const updated = await updateKey(added.id, {
        name: 'Updated',
        value: 'new',
      });

      expect(updated!.name).toBe('Updated');
      expect(updated!.value).toBe('new');
    });

    it('should return null for non-existent key', async () => {
      await initializeVault(TEST_PASSWORD);

      const updated = await updateKey('non-existent', { name: 'New Name' });
      expect(updated).toBeNull();
    });

    it('should persist updates to storage', async () => {
      await initializeVault(TEST_PASSWORD);

      const added = await addKey({
        name: 'Original',
        type: 'passphrase' as const,
        value: 'old',
      });

      await updateKey(added.id, { name: 'Updated' });

      lockVault();
      await unlockVault(TEST_PASSWORD);

      const retrieved = getKey(added.id);
      expect(retrieved!.name).toBe('Updated');
    });

    it('should throw error if vault is locked', async () => {
      await initializeVault(TEST_PASSWORD);
      lockVault();

      expect(async () => {
        await updateKey('any-id', { name: 'New' });
      }).toThrow('Vault is locked');
    });
  });

  describe('exportVault', () => {
    it('should return encrypted vault as base64 string', async () => {
      await initializeVault(TEST_PASSWORD);

      const exported = exportVault();

      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);

      expect(() => atob(exported)).not.toThrow();
    });

    it('should throw error if no vault exists', () => {
      expect(() => {
        exportVault();
      }).toThrow('No vault to export');
    });

    it('should export vault that can be imported', async () => {
      await initializeVault(TEST_PASSWORD);

      await addKey({
        name: 'Export Test',
        type: 'passphrase' as const,
        value: 'test-value',
      });

      const exported = exportVault();

      mockLocalStorage.clear();
      lockVault();

      await importVault(exported, TEST_PASSWORD);

      expect(isVaultUnlocked()).toBe(true);
      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Export Test');
    });
  });

  describe('importVault', () => {
    it('should import encrypted vault with correct password', async () => {
      await initializeVault(TEST_PASSWORD);
      await addKey({
        name: 'Import Test',
        type: 'passphrase' as const,
        value: 'secret',
      });

      const exported = exportVault();

      mockLocalStorage.clear();
      lockVault();

      await importVault(exported, TEST_PASSWORD);

      expect(isVaultUnlocked()).toBe(true);
      const metadata = getVaultMetadata();
      expect(metadata!.keyCount).toBe(1);
    });

    it('should fail with wrong password', async () => {
      await initializeVault(TEST_PASSWORD);
      const exported = exportVault();

      mockLocalStorage.clear();
      lockVault();

      expect(async () => {
        await importVault(exported, WRONG_PASSWORD);
      }).toThrow('Invalid password');
    });

    it('should save imported vault to localStorage', async () => {
      await initializeVault(TEST_PASSWORD);
      const exported = exportVault();

      mockLocalStorage.clear();
      lockVault();

      await importVault(exported, TEST_PASSWORD);

      const stored = mockLocalStorage.getItem('encyphrix_key_vault');
      expect(stored).toBe(exported);
    });

    it('should throw error for invalid vault format', async () => {
      const invalidVault = btoa('invalid-data');

      expect(async () => {
        await importVault(invalidVault, TEST_PASSWORD);
      }).toThrow();
    });
  });

  describe('integration', () => {
    it('should handle full lifecycle: init -> add -> lock -> unlock -> export -> import', async () => {
      await initializeVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);

      const key1 = await addKey({
        name: 'Key 1',
        type: 'passphrase' as const,
        value: 'value1',
      });

      const key2 = await addKey({
        name: 'Key 2',
        type: '256bit' as const,
        value: 'value2',
      });

      expect(getAllKeys().length).toBe(2);

      lockVault();
      expect(isVaultUnlocked()).toBe(false);

      await unlockVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);
      expect(getAllKeys().length).toBe(2);

      const exported = exportVault();

      mockLocalStorage.clear();
      lockVault();

      await importVault(exported, TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);

      const keys = getAllKeys();
      expect(keys.length).toBe(2);
      expect(keys.some(k => k.name === 'Key 1')).toBe(true);
      expect(keys.some(k => k.name === 'Key 2')).toBe(true);

      const retrieved = getKey(key1.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.value).toBe('value1');
    });

    it('should maintain data integrity through multiple lock/unlock cycles', async () => {
      await initializeVault(TEST_PASSWORD);

      const key = await addKey({
        name: 'Cycle Test',
        type: 'passphrase' as const,
        value: 'original',
      });

      for (let i = 0; i < 3; i++) {
        lockVault();
        await unlockVault(TEST_PASSWORD);
      }

      const retrieved = getKey(key.id);
      expect(retrieved!.name).toBe('Cycle Test');
      expect(retrieved!.value).toBe('original');
    });
  });

  describe('clearVault', () => {
    it('should remove vault from localStorage', async () => {
      await initializeVault(TEST_PASSWORD);

      await clearVault();

      const stored = mockLocalStorage.getItem('encyphrix_key_vault');
      expect(stored).toBeNull();
    });

    it('should lock vault', async () => {
      await initializeVault(TEST_PASSWORD);
      expect(isVaultUnlocked()).toBe(true);

      await clearVault();

      expect(isVaultUnlocked()).toBe(false);
    });
  });
});
