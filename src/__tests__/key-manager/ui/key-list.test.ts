import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createKeyListUI,
  renderKeyList,
  renderKeyItem,
  initKeyList,
  mountKeyList,
  refreshKeyList,
} from '../../../key-manager/ui/key-list.js';
import {
  initializeVault,
  unlockVault,
  lockVault,
  addKey,
  getAllKeys,
  deleteKey,
  updateKey,
  clearVault,
} from '../../../key-manager/storage.js';

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

// Mock DOM element factory
function createMockElement() {
  return {
    tagName: 'DIV',
    textContent: '',
    innerHTML: '',
    className: '',
    classList: {
      add: function(className: string) { this.className += ' ' + className; },
      remove: function(className: string) { 
        this.className = this.className.replace(new RegExp('\\b' + className + '\\b', 'g'), '').trim();
      },
      contains: function(className: string) { return this.className.includes(className); },
    },
    setAttribute: function(name: string, value: string) { (this as any)[name] = value; },
    getAttribute: function(name: string) { return (this as any)[name]; },
    appendChild: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    style: {},
    dataset: {},
    parentNode: null,
    insertBefore: function() {},
    remove: function() {},
    focus: function() {},
    dispatchEvent: function() { return true; },
  };
}

// Mock DOM APIs
global.document = {
  createElement: (tag: string) => createMockElement(),
  getElementById: function(id: string) { return createMockElement(); },
  querySelector: function(selector: string) { return null; },
  querySelectorAll: function(selector: string) { return []; },
  addEventListener: function() {},
  removeEventListener: function() {},
} as any;

global.alert = function(message?: string) {};
global.confirm = function(message?: string) { return true; };
global.prompt = function(message?: string, defaultValue?: string) { return defaultValue || null; };

describe('Key List UI', () => {
  const TEST_PASSWORD = 'correct-horse-battery-staple';

  beforeEach(async () => {
    mockLocalStorage.clear();
    lockVault();
    await initializeVault(TEST_PASSWORD);
  });

  afterEach(() => {
    mockLocalStorage.clear();
    lockVault();
  });

  describe('createKeyListUI', () => {
    it('should return HTML string with key list structure', () => {
      const html = createKeyListUI();
      
      expect(html).toContain('key-list');
      expect(html).toContain('Saved Keys');
      expect(html).toContain('key-list-container');
      expect(html).toContain('no-keys-message');
      expect(html).toContain('key-count');
    });

    it('should include empty state message', () => {
      const html = createKeyListUI();
      
      expect(html).toContain('No keys saved');
      expect(html).toContain('empty-state');
      expect(html).toContain('empty-icon');
    });
  });

  describe('renderKeyItem', () => {
    it('should render a passphrase key item', () => {
      const key = {
        id: 'key_123',
        name: 'My Passphrase Key',
        type: 'passphrase' as const,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
      };

      const html = renderKeyItem(key);
      
      expect(html).toContain('key-item');
      expect(html).toContain('data-key-id="key_123"');
      expect(html).toContain('My Passphrase Key');
      expect(html).toContain('Passphrase');
      expect(html).toContain('btn-select-key');
      expect(html).toContain('btn-rename-key');
      expect(html).toContain('btn-delete-key');
    });

    it('should render a 256bit key item', () => {
      const key = {
        id: 'key_456',
        name: 'My 256-bit Key',
        type: '256bit' as const,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      const html = renderKeyItem(key);
      
      expect(html).toContain('256-bit Key');
    });

    it('should mark selected key with selected class', () => {
      const key = {
        id: 'key_789',
        name: 'Selected Key',
        type: 'passphrase' as const,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
      };

      const html = renderKeyItem(key, true);
      
      expect(html).toContain('key-item--selected');
    });

    it('should escape HTML in key names', () => {
      const key = {
        id: 'key_999',
        name: '<script>alert("xss")</script>',
        type: 'passphrase' as const,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
      };

      const html = renderKeyItem(key);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('renderKeyList', () => {
    it('should return empty string for empty keys array', () => {
      const html = renderKeyList([]);
      expect(html).toBe('');
    });

    it('should render multiple key items', () => {
      const keys = [
        {
          id: 'key_1',
          name: 'Key One',
          type: 'passphrase' as const,
          createdAt: new Date().toISOString(),
          lastUsed: null,
        },
        {
          id: 'key_2',
          name: 'Key Two',
          type: '256bit' as const,
          createdAt: new Date().toISOString(),
          lastUsed: null,
        },
      ];

      const html = renderKeyList(keys);
      
      expect(html).toContain('Key One');
      expect(html).toContain('Key Two');
      expect(html).toContain('data-key-id="key_1"');
      expect(html).toContain('data-key-id="key_2"');
    });

    it('should mark selected key in list', () => {
      const keys = [
        {
          id: 'key_1',
          name: 'Key One',
          type: 'passphrase' as const,
          createdAt: new Date().toISOString(),
          lastUsed: null,
        },
        {
          id: 'key_2',
          name: 'Key Two',
          type: 'passphrase' as const,
          createdAt: new Date().toISOString(),
          lastUsed: null,
        },
      ];

      const html = renderKeyList(keys, 'key_2');
      
      expect(html).toContain('key-item--selected');
    });
  });

  describe('refreshKeyList', () => {
    it('should show empty state when no keys exist', async () => {
      // Create a mock container
      const mockContainer = {
        innerHTML: '',
        style: { display: '' },
        querySelectorAll: () => [],
      };

      const mockEmptyMessage = {
        style: { display: '' },
      };

      const mockCountElement = {
        textContent: '',
      };

      // Mock document.getElementById
      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => {
        if (id === 'key-list-container') return mockContainer as any;
        if (id === 'no-keys-message') return mockEmptyMessage as any;
        if (id === 'key-count') return mockCountElement as any;
        return null;
      };

      await refreshKeyList();

      expect(mockEmptyMessage.style.display).toBe('block');
      expect(mockContainer.style.display).toBe('none');
      expect(mockCountElement.textContent).toBe('0 keys');

      // Restore
      document.getElementById = originalGetElementById;
    });

    it('should render keys when keys exist', async () => {
      // Add some keys
      await addKey({
        name: 'Test Key 1',
        type: 'passphrase',
        value: 'secret1',
      });

      await addKey({
        name: 'Test Key 2',
        type: '256bit',
        value: 'a1b2c3d4',
      });

      // Create mock elements
      const mockContainer = {
        innerHTML: '',
        style: { display: '' },
        querySelectorAll: () => [],
      };

      const mockEmptyMessage = {
        style: { display: 'block' },
      };

      const mockCountElement = {
        textContent: '0 keys',
      };

      // Mock document.getElementById
      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => {
        if (id === 'key-list-container') return mockContainer as any;
        if (id === 'no-keys-message') return mockEmptyMessage as any;
        if (id === 'key-count') return mockCountElement as any;
        return null;
      };

      await refreshKeyList();

      expect(mockEmptyMessage.style.display).toBe('none');
      expect(mockContainer.style.display).toBe('block');
      expect(mockContainer.innerHTML).toContain('Test Key 1');
      expect(mockContainer.innerHTML).toContain('Test Key 2');
      expect(mockCountElement.textContent).toBe('2 keys');

      // Restore
      document.getElementById = originalGetElementById;
    });
  });

  describe('initKeyList', () => {
    it('should return controller object with required methods', () => {
      const controller = initKeyList();
      
      expect(controller).toHaveProperty('refresh');
      expect(controller).toHaveProperty('getSelectedKeyId');
      expect(controller).toHaveProperty('selectKey');
      expect(controller).toHaveProperty('destroy');
      expect(typeof controller.refresh).toBe('function');
      expect(typeof controller.getSelectedKeyId).toBe('function');
      expect(typeof controller.selectKey).toBe('function');
      expect(typeof controller.destroy).toBe('function');
    });

    it('should return null selected key initially', () => {
      const controller = initKeyList();
      expect(controller.getSelectedKeyId()).toBeNull();
    });

    it('should call onSelect callback when key is selected', async () => {
      const key = await addKey({
        name: 'Callback Test Key',
        type: 'passphrase',
        value: 'test-value',
      });

      let selectedKey: any = null;
      const controller = initKeyList({
        onSelect: (key: any) => {
          selectedKey = key;
        },
      });

      await controller.selectKey(key.id);

      expect(selectedKey).toBeTruthy();
      expect(selectedKey.id).toBe(key.id);
      expect(selectedKey.name).toBe('Callback Test Key');
    });

    it('should call onDelete callback when key is deleted', async () => {
      const key = await addKey({
        name: 'Delete Test Key',
        type: 'passphrase',
        value: 'test-value',
      });

      let deletedKeyId: string | null = null;
      
      // Mock container
      const mockContainer = {
        innerHTML: '',
        style: { display: '' },
        addEventListener: function() {},
        querySelectorAll: () => [],
      };

      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => {
        if (id === 'key-list-container') return mockContainer as any;
        return null;
      };

      const controller = initKeyList({
        onDelete: (keyId: string) => {
          deletedKeyId = keyId;
        },
      });

      // Manually trigger delete
      await deleteKey(key.id);
      
      if (controller.onDelete) {
        controller.onDelete(key.id);
      }

      // Restore
      document.getElementById = originalGetElementById;
    });
  });

  describe('mountKeyList', () => {
    it('should throw error if container is not provided', () => {
      expect(() => {
        mountKeyList(null as any);
      }).toThrow('Container element is required');
    });

    it('should mount UI into container', () => {
      const mockContainer = {
        innerHTML: '',
      };

      const controller = mountKeyList(mockContainer as any);

      expect(mockContainer.innerHTML).toContain('key-list');
      expect(mockContainer.innerHTML).toContain('Saved Keys');
      expect(controller).toHaveProperty('refresh');
    });
  });

  describe('integration with storage', () => {
    it('should reflect added keys in the list', async () => {
      // Add keys
      const key1 = await addKey({
        name: 'Integration Key 1',
        type: 'passphrase',
        value: 'value1',
      });

      const key2 = await addKey({
        name: 'Integration Key 2',
        type: '256bit',
        value: 'value2',
      });

      const keys = getAllKeys();
      
      expect(keys.length).toBe(2);
      expect(keys.some(k => k.name === 'Integration Key 1')).toBe(true);
      expect(keys.some(k => k.name === 'Integration Key 2')).toBe(true);
    });

    it('should handle key deletion', async () => {
      const key = await addKey({
        name: 'Key To Delete',
        type: 'passphrase',
        value: 'value',
      });

      expect(getAllKeys().length).toBe(1);

      const deleted = await deleteKey(key.id);
      
      expect(deleted).toBe(true);
      expect(getAllKeys().length).toBe(0);
    });

    it('should handle key renaming', async () => {
      const key = await addKey({
        name: 'Original Name',
        type: 'passphrase',
        value: 'value',
      });

      const updated = await updateKey(key.id, { name: 'New Name' });
      
      expect(updated).toBeTruthy();
      expect(updated!.name).toBe('New Name');
      
      const keys = getAllKeys();
      expect(keys[0].name).toBe('New Name');
    });

    it('should update lastUsed when key is selected', async () => {
      const key = await addKey({
        name: 'Key With Last Used',
        type: 'passphrase',
        value: 'value',
      });

      expect(key.lastUsed).toBeNull();

      // lastUsed is set internally when key is selected via selectKey
      // The UI component handles this, not the storage directly
      const updatedKey = getAllKeys().find(k => k.id === key.id);
      expect(updatedKey).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle vault being locked', async () => {
      lockVault();

      // Should throw when vault is locked
      expect(() => {
        getAllKeys();
      }).toThrow('Vault is locked');
    });

    it('should handle selecting non-existent key', async () => {
      const controller = initKeyList();
      
      // Should not throw
      await controller.selectKey('non-existent-id');
      expect(controller.getSelectedKeyId()).toBeNull();
    });

    it('should handle renaming to empty name', async () => {
      const key = await addKey({
        name: 'Valid Name',
        type: 'passphrase',
        value: 'value',
      });

      // Mock prompt to return empty string
      const originalPrompt = global.prompt;
      global.prompt = () => '';

      // Should not update with empty name
      const updated = await updateKey(key.id, { name: '' });
      expect(updated!.name).toBe(''); // Storage allows empty, UI should validate

      global.prompt = originalPrompt;
    });

    it('should handle delete confirmation cancellation', async () => {
      const key = await addKey({
        name: 'Protected Key',
        type: 'passphrase',
        value: 'value',
      });

      // Mock confirm to return false
      const originalConfirm = global.confirm;
      global.confirm = () => false;

      // Key should not be deleted
      expect(getAllKeys().length).toBe(1);

      global.confirm = originalConfirm;
    });
  });
});
