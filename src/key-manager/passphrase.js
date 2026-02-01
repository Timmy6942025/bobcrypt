import { getWordByIndex, getWordCount } from './wordlist.js';
import { getSodium } from '../crypto.js';

/**
 * Generate a random passphrase using the EFF Long List wordlist
 * 
 * Uses cryptographically secure random number generation (CSPRNG) via libsodium.
 * Each word provides ~12.9 bits of entropy (log2(7776)).
 * 
 * Default 6-word passphrase provides ~77.5 bits of entropy.
 * 
 * @param {number} wordCount - Number of words to generate (default: 6)
 * @returns {Promise<string>} Hyphen-separated passphrase
 * @throws {Error} If crypto not initialized or wordCount is invalid
 */
export async function generatePassphrase(wordCount = 6) {
  const sodium = getSodium();
  const words = [];
  const maxIndex = getWordCount();
  
  // Use rejection sampling to eliminate modulo bias
  // This ensures uniform distribution across all words
  const getUnbiasedIndex = () => {
    const randomBytes = sodium.randombytes_buf(4);
    const index = new DataView(randomBytes.buffer).getUint32(0, false);
    // Reject values that would cause bias (values in the top range)
    const minValid = (2 ** 32) % maxIndex;
    if (index < minValid) {
      return getUnbiasedIndex(); // Recurse for rejected values
    }
    return index % maxIndex;
  };
  
  for (let i = 0; i < wordCount; i++) {
    const index = getUnbiasedIndex();
    words.push(await getWordByIndex(index));
  }
  
  return words.join('-');
}
