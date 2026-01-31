import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import {
  createKeyGeneratorUI,
  initKeyGenerator,
  mountKeyGenerator,
} from '../../../key-manager/ui/key-generator.js';
import {
  initializeVault,
  lockVault,
  clearVault,
  getAllKeys,
} from '../../../key-manager/storage.js';
import { initCrypto } from '../../../crypto.js';

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

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: async (text: string) => text,
    },
  },
  writable: true,
});

global.alert = () => {};

function createMockElement(tag: string) {
  const element: any = {
    tagName: tag.toUpperCase(),
    attributes: {},
    style: {},
    innerHTML: '',
    value: '',
    textContent: '',
    placeholder: '',
    classList: {
      classes: new Set<string>(),
      add(cls: string) { this.classes.add(cls); },
      remove(cls: string) { this.classes.delete(cls); },
      contains(cls: string) { return this.classes.has(cls); },
    },
    querySelector: (selector: string) => null,
    querySelectorAll: (selector: string) => [],
    appendChild: (child: any) => child,
    removeChild: (child: any) => child,
    remove: () => {},
    click: () => {
      if (element.onclick) element.onclick();
    },
    addEventListener: (event: string, handler: Function) => {
      element[`on${event}`] = handler;
    },
    dispatchEvent: (event: any) => {
      const handler = element[`on${event.type}`];
      if (handler) handler(event);
    },
    focus: () => {},
    setAttribute: (name: string, value: string) => {
      element.attributes[name] = value;
    },
    getAttribute: (name: string) => element.attributes[name],
  };
  return element;
}

function createMockContainer() {
  const elements: Record<string, any> = {};

  const container: any = {
    innerHTML: '',
    children: [],
    querySelector: (selector: string) => {
      const id = selector.replace('#', '');
      return elements[id] || null;
    },
    querySelectorAll: (selector: string) => {
      const tag = selector.replace('.', '');
      return Object.values(elements).filter((el: any) =>
        el.classList.classes.has(tag)
      );
    },
    appendChild: (child: any) => {
      container.children.push(child);
      return child;
    },
    removeChild: (child: any) => {
      const index = container.children.indexOf(child);
      if (index > -1) container.children.splice(index, 1);
      return child;
    },
    remove: () => {
      container.children = [];
    },
  };

  return { container, elements };
}

describe('Key Generator UI', () => {
  const TEST_PASSWORD = 'correct-horse-battery-staple';

  beforeAll(async () => {
    if (typeof window === 'undefined') {
      global.window = {
        crypto: {
          subtle: {}
        }
      } as any;
    }
    await initCrypto();
  });

  beforeEach(async () => {
    mockLocalStorage.clear();
    lockVault();
    await initializeVault(TEST_PASSWORD);
  });

  afterEach(() => {
    mockLocalStorage.clear();
    lockVault();
  });

  describe('createKeyGeneratorUI', () => {
    it('should return HTML string with required elements', () => {
      const html = createKeyGeneratorUI();

      expect(html).toContain('key-generator');
      expect(html).toContain('gen-passphrase');
      expect(html).toContain('gen-256bit');
      expect(html).toContain('generated-key');
      expect(html).toContain('copy-generated-key');
      expect(html).toContain('regenerate-key');
      expect(html).toContain('new-key-name');
      expect(html).toContain('save-generated-key');
    });

    it('should have passphrase button marked as active by default', () => {
      const html = createKeyGeneratorUI();

      expect(html).toContain('gen-passphrase" class="active"');
    });
  });

  describe('initKeyGenerator', () => {
    it('should initialize with passphrase button active', () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      expect(elements['gen-passphrase'].classList.contains('active')).toBe(true);
      expect(elements['generated-key'].value).toBeTruthy();
    });

    it('should generate 6-word passphrase by default', () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      const value = elements['generated-key'].value;
      const wordCount = value.split('-').length;

      expect(wordCount).toBe(6);
    });

    it('should switch to 256-bit key when 256-bit button clicked', () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      elements['gen-256bit'].click();

      const value = elements['generated-key'].value;
      expect(value).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should regenerate key when regenerate button clicked', () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      const firstValue = elements['generated-key'].value;
      elements['regenerate-key'].click();
      const secondValue = elements['generated-key'].value;

      expect(firstValue).not.toBe(secondValue);
    });

    it('should save key with custom name', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      elements['new-key-name'].value = 'My Custom Key';
      elements['save-generated-key'].click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('My Custom Key');
      expect(keys[0].type).toBe('passphrase');
    });

    it('should save key with default name when name not provided', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['new-key-name'].placeholder = 'Key 1';
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      elements['save-generated-key'].click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Key 1');
    });

    it('should save 256-bit key when 256-bit mode selected', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      elements['gen-256bit'].click();
      elements['save-generated-key'].click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const keys = getAllKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].type).toBe('256bit');
    });

    it('should generate new key after saving', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      const firstKey = elements['generated-key'].value;
      elements['save-generated-key'].click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const secondKey = elements['generated-key'].value;
      expect(firstKey).not.toBe(secondKey);
    });

    it('should clear key name input after saving', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      initKeyGenerator(container);

      elements['new-key-name'].value = 'Test Key';
      elements['save-generated-key'].click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(elements['new-key-name'].value).toBe('');
    });

    it('should throw error if UI elements not found', () => {
      const emptyContainer = createMockContainer().container;

      expect(() => {
        initKeyGenerator(emptyContainer);
      }).toThrow('Key generator UI elements not found');
    });
  });

  describe('mountKeyGenerator', () => {
    it('should mount component to container', () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      container.querySelector = (selector: string) => {
        const id = selector.replace('#', '');
        if (!elements[id]) {
          elements[id] = createMockElement('div');
        }
        return elements[id];
      };

      mountKeyGenerator(container);

      expect(container.innerHTML).toContain('key-generator');
    });
  });

  describe('key naming', () => {
    it('should increment key number for subsequent keys', async () => {
      const { container, elements } = createMockContainer();

      elements['gen-passphrase'] = createMockElement('button');
      elements['gen-passphrase'].classList.add('active');
      elements['gen-256bit'] = createMockElement('button');
      elements['generated-key'] = createMockElement('input');
      elements['copy-generated-key'] = createMockElement('button');
      elements['regenerate-key'] = createMockElement('button');
      elements['new-key-name'] = createMockElement('input');
      elements['save-generated-key'] = createMockElement('button');

      let keyCount = 0;
      container.querySelector = (selector: string) => {
        const id = selector.replace('#', '');
        if (id === 'new-key-name') {
          elements[id].placeholder = `Key ${keyCount + 1}`;
        }
        return elements[id];
      };

      initKeyGenerator(container);

      elements['save-generated-key'].click();
      await new Promise(resolve => setTimeout(resolve, 100));
      keyCount = 1;

      elements['save-generated-key'].click();
      await new Promise(resolve => setTimeout(resolve, 100));

      const keys = getAllKeys();
      expect(keys.length).toBe(2);
      expect(keys[0].name).toBe('Key 1');
      expect(keys[1].name).toBe('Key 2');
    });
  });
});
