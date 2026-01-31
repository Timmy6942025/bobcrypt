import { describe, it, expect, beforeAll } from 'bun:test';
import { initCrypto, encrypt, decrypt, deriveKey, generateSalt } from '../crypto.js';

describe('Edge Case Tests', () => {
  beforeAll(async () => {
    if (typeof window === 'undefined' || !window.crypto?.subtle?.importKey) {
      (global as any).window = {
        crypto: globalThis.crypto
      };
    }
    await initCrypto();
  });

  describe('Empty and Minimal Input', () => {
    it('should handle empty plaintext', async () => {
      const plaintext = '';
      const password = 'test-password';

      const ciphertext = await encrypt(plaintext, password);
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);

      const { plaintext: decrypted } = await decrypt(ciphertext, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle single character plaintext', async () => {
      const plaintext = 'A';
      const password = 'test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty password', async () => {
      const plaintext = 'Test message';
      const password = '';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle single character password', async () => {
      const plaintext = 'Test message';
      const password = 'X';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle emoji characters', async () => {
      const plaintext = '🎉🎊🎁🎄🎅🤶🧑‍🎄';
      const password = 'emoji-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle CJK characters', async () => {
      const plaintext = '你好世界！这是一段测试文本。';
      const password = 'cjk-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle Arabic characters', async () => {
      const plaintext = 'مرحبا بالعالم! هذا نص تجريبي.';
      const password = 'arabic-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle Cyrillic characters', async () => {
      const plaintext = 'Привет, мир! Это тестовый текст.';
      const password = 'cyrillic-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle mixed Unicode scripts', async () => {
      const plaintext = 'Hello 世界! 🌍 Привет мир! مرحبا بالعالم!';
      const password = 'mixed-unicode-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle zero-width characters', async () => {
      const plaintext = 'Hello\u200BWorld\u200C!\u200D';
      const password = 'zero-width-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle combining characters', async () => {
      const plaintext = 'café with combining: cafe\u0301';
      const password = 'combining-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle right-to-left text', async () => {
      const plaintext = 'English עברית English';
      const password = 'rtl-test-password';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Special Characters in Passwords', () => {
    it('should handle password with all ASCII special characters', async () => {
      const plaintext = 'Secret message';
      const password = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle password with Unicode characters', async () => {
      const plaintext = 'Secret message';
      const password = 'пароль-密码-パスワード';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle password with emoji', async () => {
      const plaintext = 'Secret message';
      const password = '🔐🔑🔒🗝️';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle password with newlines and tabs', async () => {
      const plaintext = 'Secret message';
      const password = 'line1\nline2\t tabbed';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle password with null bytes', async () => {
      const plaintext = 'Secret message';
      const password = 'pass\0word';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long password', async () => {
      const plaintext = 'Secret message';
      const password = 'A'.repeat(10000);

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Large Files and Data', () => {
    it('should handle 1MB plaintext', async () => {
      const plaintext = 'X'.repeat(1048576);
      const password = 'large-file-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    }, 15000);

    it('should handle 5MB plaintext', async () => {
      const plaintext = 'Y'.repeat(5242880);
      const password = 'very-large-file-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    }, 30000);

    it('should handle plaintext with repeated patterns', async () => {
      const pattern = 'ABC';
      const plaintext = pattern.repeat(100000);
      const password = 'pattern-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    }, 15000);

    it('should handle plaintext with random valid unicode', async () => {
      const validRanges = [
        [0x0020, 0x007E],
        [0x00A0, 0x00FF],
        [0x0100, 0x017F],
        [0x0400, 0x04FF],
        [0x3040, 0x309F],
        [0x4E00, 0x4FFF]
      ];

      const plaintext = Array.from({ length: 10000 }, () => {
        const range = validRanges[Math.floor(Math.random() * validRanges.length)];
        return String.fromCharCode(range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1)));
      }).join('');
      const password = 'random-data-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    }, 15000);
  });

  describe('Whitespace and Control Characters', () => {
    it('should handle plaintext with only whitespace', async () => {
      const plaintext = '   \t\n\r   ';
      const password = 'whitespace-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle plaintext with leading/trailing whitespace', async () => {
      const plaintext = '   Hello World   ';
      const password = 'padding-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle plaintext with control characters', async () => {
      const plaintext = 'Hello\x00World\x01\x02\x03';
      const password = 'control-char-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle plaintext with all ASCII control characters', async () => {
      const plaintext = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join('');
      const password = 'all-control-chars';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Binary-like Data', () => {
    it('should handle high-byte characters', async () => {
      const plaintext = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i + 128)).join('');
      const password = 'high-byte-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle all byte values', async () => {
      const plaintext = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join('');
      const password = 'all-bytes-test';

      const ciphertext = await encrypt(plaintext, password);
      const { plaintext: decrypted } = await decrypt(ciphertext, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Malformed and Invalid Input', () => {
    it('should handle ciphertext with invalid characters', async () => {
      const password = 'test-password';
      const invalidCiphertext = '!!!@@@###$$$';

      await expect(decrypt(invalidCiphertext, password)).rejects.toThrow();
    });

    it('should handle truncated ciphertext', async () => {
      const plaintext = 'Test message';
      const password = 'test-password';

      const ciphertext = await encrypt(plaintext, password);
      const truncated = ciphertext.slice(0, 20);

      await expect(decrypt(truncated, password)).rejects.toThrow();
    });

    it('should handle ciphertext with modified header', async () => {
      const plaintext = 'Test message';
      const password = 'test-password';

      const ciphertext = await encrypt(plaintext, password);
      const decoded = atob(ciphertext);

      const modified = btoa(String.fromCharCode(0x02) + decoded.slice(1));

      await expect(decrypt(modified, password)).rejects.toThrow();
    });

    it('should handle empty ciphertext string', async () => {
      const password = 'test-password';

      await expect(decrypt('', password)).rejects.toThrow();
    });

    it('should handle ciphertext that is valid base64 but wrong format', async () => {
      const password = 'test-password';
      const wrongFormatCiphertext = btoa('this is not valid encrypted data');

      await expect(decrypt(wrongFormatCiphertext, password)).rejects.toThrow();
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle plaintext at exact block boundaries', async () => {
      const password = 'boundary-test';

      for (const length of [15, 16, 17, 31, 32, 33, 63, 64, 65]) {
        const plaintext = 'A'.repeat(length);
        const ciphertext = await encrypt(plaintext, password);
        const { plaintext: decrypted } = await decrypt(ciphertext, password);

        expect(decrypted).toBe(plaintext);
      }
    });

    it('should handle password at various lengths', async () => {
      const plaintext = 'Test message';

      for (const length of [1, 8, 16, 32, 64, 128, 256]) {
        const password = 'P'.repeat(length);
        const ciphertext = await encrypt(plaintext, password);
        const { plaintext: decrypted } = await decrypt(ciphertext, password);

        expect(decrypted).toBe(plaintext);
      }
    });
  });

  describe('Repeated Operations', () => {
    it('should handle 100 consecutive encryptions', async () => {
      const password = 'repeated-test';
      const plaintext = 'Test message';

      for (let i = 0; i < 100; i++) {
        const ciphertext = await encrypt(plaintext, password);
        const { plaintext: decrypted } = await decrypt(ciphertext, password);
        expect(decrypted).toBe(plaintext);
      }
    }, 30000);

    it('should handle alternating encrypt/decrypt operations', async () => {
      let currentText = 'Initial message';
      const password = 'alternating-test';

      for (let i = 0; i < 20; i++) {
        const ciphertext = await encrypt(currentText, password);
        const result = await decrypt(ciphertext, password);
        currentText = result.plaintext;
      }

      expect(currentText).toBe('Initial message');
    }, 30000);
  });
});
