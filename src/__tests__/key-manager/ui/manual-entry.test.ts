import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createManualEntryUI,
  validateHexKey,
  validatePassphrase,
  validateKeyName,
  saveManualKey,
  initManualEntry,
} from '../../../key-manager/ui/manual-entry.js';
import {
  initializeVault,
  lockVault,
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

function createMockElement(id: string, value: string = ''): HTMLElement {
  const element = {
    id,
    value,
    textContent: '',
    className: '',
    style: { display: '' },
    addEventListener: () => {},
    classList: {
      contains: (className: string) => false,
      add: () => {},
      remove: () => {},
    },
  } as unknown as HTMLElement;
  return element;
}

describe('Manual Entry UI', () => {
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

  describe('createManualEntryUI', () => {
    it('should return HTML string with manual entry structure', () => {
      const html = createManualEntryUI();

      expect(html).toContain('manual-entry');
      expect(html).toContain('Enter Your Own Key');
      expect(html).toContain('manual-passphrase');
      expect(html).toContain('manual-256bit');
      expect(html).toContain('manual-passphrase-field');
      expect(html).toContain('manual-256bit-field');
      expect(html).toContain('manual-key-name');
      expect(html).toContain('save-manual-key');
    });

    it('should include passphrase input section', () => {
      const html = createManualEntryUI();

      expect(html).toContain('manual-passphrase-input');
      expect(html).toContain('Enter Passphrase:');
      expect(html).toContain('textarea');
      expect(html).toContain('correct-horse-battery-staple');
    });

    it('should include 256-bit input section', () => {
      const html = createManualEntryUI();

      expect(html).toContain('manual-256bit-input');
      expect(html).toContain('Enter 256-bit Key (hex):');
      expect(html).toContain('64 character hex string');
      expect(html).toContain('maxlength="64"');
    });

    it('should include key name input', () => {
      const html = createManualEntryUI();

      expect(html).toContain('key-name-input');
      expect(html).toContain('Key Name:');
      expect(html).toContain('My Custom Key');
    });

    it('should include validation message containers', () => {
      const html = createManualEntryUI();

      expect(html).toContain('passphrase-validation-msg');
      expect(html).toContain('hex-validation-msg');
      expect(html).toContain('name-validation-msg');
      expect(html).toContain('save-status-msg');
    });
  });

  describe('validateHexKey', () => {
    it('should validate correct 64-character hex string', () => {
      const validHex = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456';
      const result = validateHexKey(validHex);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate lowercase hex', () => {
      const validHex = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      const result = validateHexKey(validHex);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty string', () => {
      const result = validateHexKey('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key is required');
    });

    it('should reject null/undefined', () => {
      const result = validateHexKey(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key is required');
    });

    it('should reject hex shorter than 64 characters', () => {
      const shortHex = 'A1B2C3D4';
      const result = validateHexKey(shortHex);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('64 characters');
      expect(result.error).toContain('8');
    });

    it('should reject hex longer than 64 characters', () => {
      const longHex = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF1234567890';
      const result = validateHexKey(longHex);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('64 characters');
    });

    it('should reject non-hex characters', () => {
      const invalidHex = 'G1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456';
      const result = validateHexKey(invalidHex);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('hexadecimal');
    });

    it('should reject hex with special characters', () => {
      const invalidHex = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF12345!';
      const result = validateHexKey(invalidHex);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('hexadecimal');
    });

    it('should reject hex with spaces', () => {
      const invalidHex = 'A1B2C3D4 E5F6789012345678901234567890ABCDEF1234567890ABCDEF12345';
      const result = validateHexKey(invalidHex);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('hexadecimal');
    });
  });

  describe('validatePassphrase', () => {
    it('should validate passphrase with 8+ characters', () => {
      const result = validatePassphrase('correct-horse');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate long passphrase', () => {
      const result = validatePassphrase('correct-horse-battery-staple');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty string', () => {
      const result = validatePassphrase('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Passphrase is required');
    });

    it('should reject null/undefined', () => {
      const result = validatePassphrase(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Passphrase is required');
    });

    it('should reject passphrase shorter than 8 characters', () => {
      const result = validatePassphrase('short');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Passphrase must be at least 8 characters');
    });

    it('should reject 7-character passphrase', () => {
      const result = validatePassphrase('1234567');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Passphrase must be at least 8 characters');
    });

    it('should accept exactly 8 characters', () => {
      const result = validatePassphrase('12345678');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('validateKeyName', () => {
    it('should validate non-empty name', () => {
      const result = validateKeyName('My Key');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate single character name', () => {
      const result = validateKeyName('A');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty string', () => {
      const result = validateKeyName('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key name is required');
    });

    it('should reject whitespace-only string', () => {
      const result = validateKeyName('   ');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key name is required');
    });

    it('should reject null/undefined', () => {
      const result = validateKeyName(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key name is required');
    });

    it('should accept name with leading/trailing whitespace', () => {
      const result = validateKeyName('  My Key  ');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('saveManualKey', () => {
    it('should save passphrase key when validation passes', async () => {
      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => true;
      mockElements['manual-passphrase'] = passphraseBtn;

      const nameInput = createMockElement('manual-key-name', 'My Passphrase Key');
      const passphraseField = createMockElement('manual-passphrase-field', 'correct-horse-battery-staple');
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-passphrase-field'] = passphraseField;

      const result = await saveManualKey();

      expect(result.success).toBe(true);
      expect(result.key).toBeTruthy();
      expect(result.key!.name).toBe('My Passphrase Key');
      expect(result.key!.type).toBe('passphrase');
      expect(result.key!.value).toBe('correct-horse-battery-staple');
      expect(result.error).toBeNull();
    });

    it('should save 256-bit key when validation passes', async () => {
      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => false;
      mockElements['manual-passphrase'] = passphraseBtn;

      const validHex = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456';
      const nameInput = createMockElement('manual-key-name', 'My Hex Key');
      const hexField = createMockElement('manual-256bit-field', validHex);
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-256bit-field'] = hexField;

      const result = await saveManualKey();

      expect(result.success).toBe(true);
      expect(result.key).toBeTruthy();
      expect(result.key!.name).toBe('My Hex Key');
      expect(result.key!.type).toBe('256bit');
      expect(result.key!.value).toBe(validHex);
    });

    it('should fail when name is empty', async () => {
      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => true;
      mockElements['manual-passphrase'] = passphraseBtn;

      const nameInput = createMockElement('manual-key-name', '');
      const passphraseField = createMockElement('manual-passphrase-field', 'valid-passphrase');
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-passphrase-field'] = passphraseField;

      const result = await saveManualKey();

      expect(result.success).toBe(false);
      expect(result.key).toBeNull();
      expect(result.error).toBe('Key name is required');
    });

    it('should fail when passphrase is too short', async () => {
      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => true;
      mockElements['manual-passphrase'] = passphraseBtn;

      const nameInput = createMockElement('manual-key-name', 'My Key');
      const passphraseField = createMockElement('manual-passphrase-field', 'short');
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-passphrase-field'] = passphraseField;

      const result = await saveManualKey();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Passphrase must be at least 8 characters');
    });

    it('should fail when hex key is invalid', async () => {
      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => false;
      mockElements['manual-passphrase'] = passphraseBtn;

      const nameInput = createMockElement('manual-key-name', 'My Key');
      const hexField = createMockElement('manual-256bit-field', 'invalid-hex');
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-256bit-field'] = hexField;

      const result = await saveManualKey();

      expect(result.success).toBe(false);
      expect(result.error).toContain('64 characters');
    });

    it('should fail when vault is locked', async () => {
      lockVault();

      const mockElements: Record<string, HTMLElement> = {};
      
      global.document = {
        getElementById: (id: string) => {
          if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
          }
          return mockElements[id];
        },
      } as any;

      const passphraseBtn = createMockElement('manual-passphrase');
      passphraseBtn.classList.contains = () => true;
      mockElements['manual-passphrase'] = passphraseBtn;

      const nameInput = createMockElement('manual-key-name', 'My Key');
      const passphraseField = createMockElement('manual-passphrase-field', 'valid-passphrase-here');
      mockElements['manual-key-name'] = nameInput;
      mockElements['manual-passphrase-field'] = passphraseField;

      const result = await saveManualKey();

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });
  });

  describe('initManualEntry', () => {
    it('should attach event listeners to buttons', () => {
      const events: Record<string, Function[]> = {};
      
      const mockElement = (id: string): HTMLElement => ({
        id,
        value: '',
        addEventListener: (event: string, handler: Function) => {
          if (!events[id]) events[id] = [];
          events[id].push(handler);
        },
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
        },
      } as any);

      const mockContainer = {
        getElementById: (id: string) => mockElement(id),
      };

      initManualEntry(mockContainer as any);

      expect(events['manual-passphrase']).toBeTruthy();
      expect(events['manual-256bit']).toBeTruthy();
      expect(events['save-manual-key']).toBeTruthy();
    });

    it('should attach input event listeners to fields', () => {
      const events: Record<string, string[]> = {};
      
      const mockElement = (id: string): HTMLElement => ({
        id,
        value: '',
        addEventListener: (event: string, handler: Function) => {
          if (!events[id]) events[id] = [];
          events[id].push(event);
        },
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
        },
      } as any);

      const mockContainer = {
        getElementById: (id: string) => mockElement(id),
      };

      initManualEntry(mockContainer as any);

      expect(events['manual-256bit-field']).toContain('input');
      expect(events['manual-256bit-field']).toContain('blur');
      expect(events['manual-passphrase-field']).toContain('input');
      expect(events['manual-passphrase-field']).toContain('blur');
      expect(events['manual-key-name']).toContain('input');
      expect(events['manual-key-name']).toContain('blur');
    });
  });
});
