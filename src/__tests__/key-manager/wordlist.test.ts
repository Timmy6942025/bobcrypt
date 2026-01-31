import { describe, it, expect } from 'bun:test';
import { getWordList, getWordCount, getWordByIndex } from '../../key-manager/wordlist.js';

describe('EFF Long List Wordlist', () => {
  describe('getWordCount', () => {
    it('should return 7776', () => {
      expect(getWordCount()).toBe(7776);
    });
  });

  describe('getWordList', () => {
    it('should return an array', () => {
      const wordlist = getWordList();
      expect(Array.isArray(wordlist)).toBe(true);
    });

    it('should return exactly 7776 words', () => {
      const wordlist = getWordList();
      expect(wordlist.length).toBe(7776);
    });

    it('should contain only strings', () => {
      const wordlist = getWordList();
      expect(wordlist.every(word => typeof word === 'string')).toBe(true);
    });

    it('should contain non-empty words', () => {
      const wordlist = getWordList();
      expect(wordlist.every(word => word.length > 0)).toBe(true);
    });
  });

  describe('getWordByIndex', () => {
    it('should return the first word at index 0', () => {
      expect(getWordByIndex(0)).toBe('abacus');
    });

    it('should return the last word at index 7775', () => {
      expect(getWordByIndex(7775)).toBe('zoom');
    });

    it('should return correct words at various indices', () => {
      expect(getWordByIndex(1)).toBe('abdomen');
      expect(getWordByIndex(2)).toBe('abdominal');
      expect(getWordByIndex(100)).toBe('aground');
      expect(getWordByIndex(1000)).toBe('cherub');
      expect(getWordByIndex(5000)).toBe('pyromania');
    });

    it('should throw error for negative index', () => {
      expect(() => getWordByIndex(-1)).toThrow('Index out of bounds');
    });

    it('should throw error for index >= 7776', () => {
      expect(() => getWordByIndex(7776)).toThrow('Index out of bounds');
    });

    it('should throw error for non-integer index', () => {
      expect(() => getWordByIndex(1.5)).toThrow('Index must be an integer');
    });

    it('should throw error for non-number index', () => {
      expect(() => getWordByIndex('0' as unknown as number)).toThrow('Index must be an integer');
    });
  });
});
