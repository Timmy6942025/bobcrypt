import wordlistData from './wordlist-data.json' assert { type: 'json' };

const WORD_COUNT = 7776;

if (wordlistData.length !== WORD_COUNT) {
  throw new Error(`Wordlist validation failed: expected ${WORD_COUNT} words, got ${wordlistData.length}`);
}

export function getWordList() {
  return Promise.resolve(wordlistData);
}

export function getWordCount() {
  return WORD_COUNT;
}

export function getWordByIndex(index) {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    return Promise.reject(new Error('Index must be an integer'));
  }
  if (index < 0 || index >= WORD_COUNT) {
    return Promise.reject(new Error(`Index out of bounds: ${index}. Valid range: 0-${WORD_COUNT - 1}`));
  }
  
  return Promise.resolve(wordlistData[index]);
}
