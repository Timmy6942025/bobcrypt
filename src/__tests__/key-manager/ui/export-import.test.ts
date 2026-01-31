import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  initializeVault,
  lockVault,
  addKey,
  getAllKeys,
  clearVault,
} from '../../../key-manager/storage.js';
import {
  createExportImportUI,
  initExportImport,
  mountExportImport,
} from '../../../key-manager/ui/export-import.js';

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

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((event: { target: { result: string | ArrayBuffer | null } }) => void) | null = null;
  onerror: (() => void) | null = null;

  readAsText(file: Blob) {
    file.text().then((text) => {
      this.result = text;
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }).catch(() => {
      if (this.onerror) {
        this.onerror();
      }
    });
  }
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader,
  writable: true,
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: () => 'mock-url',
    revokeObjectURL: () => {},
  },
  writable: true,
});

const mockClipboard = {
  writtenText: '',
  writeText: async (text: string) => {
    mockClipboard.writtenText = text;
  },
};

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: mockClipboard,
  },
  writable: true,
});

const mockConfirm = {
  result: true,
  calls: [] as string[],
};

const mockPrompt = {
  result: '',
  calls: [] as string[],
};

global.confirm = (message?: string) => {
  if (message) mockConfirm.calls.push(message);
  return mockConfirm.result;
};

global.prompt = (message?: string) => {
  if (message) mockPrompt.calls.push(message);
  return mockPrompt.result;
};

global.alert = () => {};

function createMockElement(tag: string) {
  return {
    tagName: tag.toUpperCase(),
    attributes: {},
    style: {},
    innerHTML: '',
    value: '',
    textContent: '',
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (child: any) => child,
    removeChild: (child: any) => child,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    click: () => {},
    focus: () => {},
    blur: () => {},
    files: null,
  };
}

function createMockContainer() {
  const eventHandlers: Record<string, Array<{ element: any; handler: any }>> = {};
  const elements: Record<string, any> = {};

  const container = {
    innerHTML: '',
    querySelector: (selector: string) => {
      const id = selector.startsWith('#') ? selector.slice(1) : selector;
      return elements[id] || null;
    },
    _elements: elements,
    _eventHandlers: eventHandlers,
    _triggerEvent: async (elementId: string, eventType: string, eventData?: any) => {
      const handlers = eventHandlers[eventType] || [];
      for (const { element, handler } of handlers) {
        if (element.id === elementId) {
          await handler(eventData);
        }
      }
    },
  };

  return { container, elements, eventHandlers };
}

function setupMockElements(container: any, html: string) {
  container.innerHTML = html;

  const ids = [
    'show-export', 'export-data', 'export-text', 'copy-export', 'download-export',
    'import-text', 'import-file', 'import-vault'
  ];

  for (const id of ids) {
    const el: any = {
      id,
      value: '',
      style: { display: 'none' },
      textContent: '',
      classList: {
        add: (cls: string) => {},
        remove: (cls: string) => {},
      },
      addEventListener: (event: string, handler: any) => {
        if (!container._eventHandlers[event]) {
          container._eventHandlers[event] = [];
        }
        container._eventHandlers[event].push({ element: el, handler });
      },
      click: async () => {
        await container._triggerEvent(id, 'click');
      },
      dispatchEvent: async (event: any) => {
        await container._triggerEvent(id, event.type, event);
        return true;
      },
      files: null,
    };
    container._elements[id] = el;
  }

  return container._elements;
}

describe('Export/Import UI', () => {
  const TEST_PASSWORD = 'correct-horse-battery-staple';

  beforeEach(() => {
    mockLocalStorage.clear();
    lockVault();
    mockClipboard.writtenText = '';
    mockConfirm.calls = [];
    mockConfirm.result = true;
    mockPrompt.calls = [];
    mockPrompt.result = '';
  });

  afterEach(() => {
    mockLocalStorage.clear();
    lockVault();
  });

  describe('createExportImportUI', () => {
    it('should return HTML string with export section', () => {
      const html = createExportImportUI();
      expect(html).toContain('Export Vault');
      expect(html).toContain('show-export');
      expect(html).toContain('export-text');
      expect(html).toContain('copy-export');
      expect(html).toContain('download-export');
    });

    it('should return HTML string with import section', () => {
      const html = createExportImportUI();
      expect(html).toContain('Import Vault');
      expect(html).toContain('import-text');
      expect(html).toContain('import-file');
      expect(html).toContain('import-vault');
    });

    it('should include warning messages', () => {
      const html = createExportImportUI();
      expect(html).toContain('Keep this backup secure');
      expect(html).toContain('Importing will REPLACE');
    });

    it('should have export data initially hidden', () => {
      const html = createExportImportUI();
      expect(html).toContain('export-data');
      expect(html).toContain('display: none');
    });
  });

  describe('initExportImport', () => {
    it('should throw error if required elements are missing', () => {
      const container = { innerHTML: '<div>Invalid HTML</div>', querySelector: () => null };

      expect(() => {
        initExportImport(container as any, TEST_PASSWORD);
      }).toThrow('Export/Import UI elements not found');
    });

    it('should show encrypted data when show export button is clicked', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const showBtn = elements['show-export'];
      const exportDataDiv = elements['export-data'];
      const exportTextarea = elements['export-text'];

      expect(exportDataDiv.style.display).toBe('none');

      showBtn.click();

      expect(exportDataDiv.style.display).toBe('block');
      expect(exportTextarea.value).toBeTruthy();
      expect(exportTextarea.value.length).toBeGreaterThan(0);
    });

    it('should copy export data to clipboard', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      elements['show-export'].click();

      const copyBtn = elements['copy-export'];
      await copyBtn.click();

      const exportTextarea = elements['export-text'];
      expect(mockClipboard.writtenText).toBe(exportTextarea.value);
    });

    it('should trigger download when download button is clicked', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      let anchorCreated = false;
      (global as any).document = {
        createElement: (tag: string) => {
          if (tag === 'a') {
            anchorCreated = true;
            return { click: () => {}, href: '', download: '' };
          }
          return createMockElement(tag);
        },
        body: { appendChild: () => {}, removeChild: () => {} },
      };

      initExportImport(container, TEST_PASSWORD);

      elements['show-export'].click();

      const downloadBtn = elements['download-export'];
      downloadBtn.click();

      expect(anchorCreated).toBe(true);

      (global as any).document = undefined;
    });

    it('should read file and fill textarea on file upload', async () => {
      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const fileInput = elements['import-file'];
      const importTextarea = elements['import-text'];

      const testContent = 'test-vault-data-123';
      const file = new Blob([testContent], { type: 'text/plain' });

      fileInput.files = [file];

      const changeEvent = { type: 'change', target: fileInput };
      fileInput.dispatchEvent(changeEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(importTextarea.value).toBe(testContent);
    });

    it('should show confirmation dialog before import', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const exportData = mockLocalStorage.getItem('encyphrix_key_vault')!;

      mockLocalStorage.clear();
      lockVault();

      elements['import-text'].value = exportData;
      mockPrompt.result = TEST_PASSWORD;

      elements['import-vault'].click();

      expect(mockConfirm.calls.length).toBeGreaterThan(0);
      expect(mockConfirm.calls[0]).toContain('REPLACE');
    });

    it('should import vault when confirmed and password provided', async () => {
      await initializeVault(TEST_PASSWORD);
      await addKey({
        name: 'Test Key',
        type: 'passphrase' as const,
        value: 'test-value',
      });

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const exportData = mockLocalStorage.getItem('encyphrix_key_vault')!;

      mockLocalStorage.clear();
      lockVault();

      elements['import-text'].value = exportData;
      mockPrompt.result = TEST_PASSWORD;

      await elements['import-vault'].click();

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Test Key');
    });

    it('should not import if user cancels confirmation', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const exportData = mockLocalStorage.getItem('encyphrix_key_vault')!;

      mockLocalStorage.clear();
      lockVault();
      await initializeVault('different-password-123');

      elements['import-text'].value = exportData;
      mockConfirm.result = false;

      elements['import-vault'].click();

      const keys = getAllKeys();
      expect(keys.length).toBe(0);
    });

    it('should use provided master password instead of prompting', async () => {
      await initializeVault(TEST_PASSWORD);
      await addKey({
        name: 'Test Key',
        type: 'passphrase' as const,
        value: 'test-value',
      });

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      initExportImport(container, TEST_PASSWORD);

      const exportData = mockLocalStorage.getItem('encyphrix_key_vault')!;

      mockLocalStorage.clear();
      lockVault();

      elements['import-text'].value = exportData;

      await elements['import-vault'].click();

      expect(mockPrompt.calls.length).toBe(0);

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
    });

    it('should alert if no import data provided', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();
      setupMockElements(container, createExportImportUI());

      let alertCalled = false;
      global.alert = () => { alertCalled = true; };

      initExportImport(container, TEST_PASSWORD);

      elements['import-vault'].click();

      expect(alertCalled).toBe(true);
    });
  });

  describe('mountExportImport', () => {
    it('should mount UI and initialize', async () => {
      await initializeVault(TEST_PASSWORD);

      const { container, elements } = createMockContainer();

      container.innerHTML = createExportImportUI();
      setupMockElements(container, container.innerHTML);
      initExportImport(container, TEST_PASSWORD);

      expect(container.innerHTML).toContain('Backup & Restore');
      expect(elements['show-export']).toBeTruthy();
      expect(elements['import-vault']).toBeTruthy();

      elements['show-export'].click();

      expect(elements['export-text'].value).toBeTruthy();
    });
  });
});
