import { describe, it, expect, beforeAll } from 'bun:test';
import { generatePassphrase } from '../../key-manager/passphrase.js';
import { initCrypto } from '../../crypto.js';
import { getWordList, getWordByIndex, getWordCount } from '../../key-manager/wordlist.js';

describe('Passphrase Generator', () => {
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

  describe('generatePassphrase()', () => {
    it('should generate 6 words by default', () => {
      const passphrase = generatePassphrase();
      const words = passphrase.split('-');
      expect(words.length).toBe(6);
    });

    it('should generate specified number of words', () => {
      const passphrase4 = generatePassphrase(4);
      const passphrase8 = generatePassphrase(8);
      
      expect(passphrase4.split('-').length).toBe(4);
      expect(passphrase8.split('-').length).toBe(8);
    });

    it('should use words from the EFF wordlist', () => {
      const wordlist = getWordList();
      const wordSet = new Set(wordlist);
      
      const passphrase = generatePassphrase();
      const words = passphrase.split('-');
      
      for (const word of words) {
        expect(wordSet.has(word)).toBe(true);
      }
    });

    it('should format as hyphen-separated words', () => {
      const passphrase = generatePassphrase();
      expect(passphrase).toMatch(/^[a-z]+(-[a-z]+){5}$/);
    });

    it('should produce different passphrases on multiple calls', () => {
      const passphrases = new Set();
      
      for (let i = 0; i < 100; i++) {
        passphrases.add(generatePassphrase());
      }
      
      expect(passphrases.size).toBeGreaterThan(90);
    });

    it('should generate unique words within a passphrase', () => {
      const allWords = new Set();
      
      for (let i = 0; i < 50; i++) {
        const passphrase = generatePassphrase();
        const words = passphrase.split('-');
        words.forEach(word => allWords.add(word));
      }
      
      expect(allWords.size).toBeGreaterThan(100);
    });

    it('should handle minimum word count of 1', () => {
      const passphrase = generatePassphrase(1);
      const words = passphrase.split('-');
      expect(words.length).toBe(1);
      
      const wordlist = getWordList();
      expect(wordlist.includes(words[0])).toBe(true);
    });

    it('should generate consistent format for larger word counts', () => {
      const passphrase = generatePassphrase(12);
      const words = passphrase.split('-');
      
      expect(words.length).toBe(12);
      
      for (const word of words) {
        expect(word).toMatch(/^[a-z]+$/);
      }
    });
  });
});
