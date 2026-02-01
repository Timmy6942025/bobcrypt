import wordlistData from './wordlist-data.json' assert { type: 'json' };

const WORD_COUNT = 7776;

// Expected SHA-256 hash of the wordlist data
const WORDLIST_HASH = 'b1efbd7f22d9cef3d84acd96a3e4ae803e67f4e7f60c371368c0cd53e37ac1a7';

/**
 * Calculate SHA-256 hash of a string
 * @param {string} data - Data to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
async function calculateHash(data) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify wordlist integrity at runtime
 * @returns {Promise<boolean>} - True if valid
 */
async function verifyWordlistIntegrity() {
  const wordlistString = JSON.stringify(wordlistData);
  const actualHash = await calculateHash(wordlistString);
  return actualHash === WORDLIST_HASH;
}

if (wordlistData.length !== WORD_COUNT) {
  throw new Error(`Wordlist validation failed: expected ${WORD_COUNT} words, got ${wordlistData.length}`);
}

verifyWordlistIntegrity().then(isValid => {
  if (!isValid) {
    console.error('CRITICAL: Wordlist integrity check failed. The wordlist may have been tampered with.');
  }
});

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
