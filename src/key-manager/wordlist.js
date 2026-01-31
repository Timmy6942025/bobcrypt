/**
 * EFF Long List Wordlist Module
 * 
 * Provides access to the EFF Long List wordlist for passphrase generation.
 * The wordlist contains 7776 words (6^5) for use with 5-digit dice rolls.
 * 
 * Source: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
 */

const WORD_COUNT = 7776;

// Lazy-loaded wordlist data
let wordlistData = null;

/**
 * Load wordlist data from JSON file
 * @returns {Promise<string[]>} Array of words
 */
async function loadWordList() {
  if (wordlistData) {
    return wordlistData;
  }
  
  try {
    const response = await fetch('./key-manager/wordlist-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load wordlist: ${response.status} ${response.statusText}`);
    }
    wordlistData = await response.json();
    
    // Validate word count
    if (wordlistData.length !== WORD_COUNT) {
      throw new Error(`Wordlist validation failed: expected ${WORD_COUNT} words, got ${wordlistData.length}`);
    }
    
    return wordlistData;
  } catch (error) {
    console.error('Failed to load wordlist:', error);
    throw error;
  }
}

/**
 * Get the complete wordlist array
 * @returns {Promise<string[]>} Array of all 7776 words
 */
export async function getWordList() {
  return loadWordList();
}

/**
 * Get the total word count
 * @returns {number} 7776
 */
export function getWordCount() {
  return WORD_COUNT;
}

/**
 * Get a word by its index (0-7775)
 * @param {number} index - Index in range 0-7775
 * @returns {Promise<string>} The word at the specified index
 * @throws {Error} If index is out of bounds
 */
export async function getWordByIndex(index) {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    throw new Error('Index must be an integer');
  }
  if (index < 0 || index >= WORD_COUNT) {
    throw new Error(`Index out of bounds: ${index}. Valid range: 0-${WORD_COUNT - 1}`);
  }
  
  const data = await loadWordList();
  return data[index];
}
