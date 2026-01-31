/**
 * Key Generator UI Component
 * Provides interface for generating 6-word passphrases and 256-bit keys
 * @module key-manager/ui/key-generator
 */

import { generatePassphrase } from '../passphrase.js';
import { addKey, getAllKeys } from '../storage.js';

/**
 * Generate a 256-bit key as 64-character hex string
 * @returns {string} 64-character hexadecimal string
 */
function generate256BitKey() {
  const bytes = new Uint8Array(32); // 256 bits = 32 bytes
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate default key name based on existing keys
 * @returns {string} Default key name like "Key 1", "Key 2", etc.
 */
function generateDefaultKeyName() {
  try {
    const existingKeys = getAllKeys();
    const keyNumber = existingKeys.length + 1;
    return `Key ${keyNumber}`;
  } catch {
    // Vault might be locked, return default
    return 'Key 1';
  }
}

/**
 * Create the Key Generator UI HTML
 * @returns {string} HTML string for the key generator component
 */
export function createKeyGeneratorUI() {
  return `
    <div class="key-generator">
      <h3>Generate New Key</h3>
      
      <div class="key-type-selector">
        <button id="gen-passphrase" class="active">6-Word Passphrase</button>
        <button id="gen-256bit">256-bit Key</button>
      </div>
      
      <div class="generated-key-display">
        <input type="text" id="generated-key" readonly />
        <button id="copy-generated-key">Copy</button>
        <button id="regenerate-key">↻ Regenerate</button>
      </div>
      
      <div class="key-name-input">
        <label>Key Name:</label>
        <input type="text" id="new-key-name" placeholder="Key 1" />
      </div>
      
      <button id="save-generated-key" class="btn-primary">Save Key to Vault</button>
    </div>
  `;
}

/**
 * Initialize the Key Generator UI
 * Sets up event listeners and initial state
 * @param {HTMLElement} container - Container element to attach listeners to
 */
export async function initKeyGenerator(container = document) {
  let currentKeyType = 'passphrase';
  let currentKeyValue = '';

  const passphraseBtn = container.querySelector('#gen-passphrase');
  const bit256Btn = container.querySelector('#gen-256bit');
  const generatedKeyInput = container.querySelector('#generated-key');
  const copyBtn = container.querySelector('#copy-generated-key');
  const regenerateBtn = container.querySelector('#regenerate-key');
  const keyNameInput = container.querySelector('#new-key-name');
  const saveBtn = container.querySelector('#save-generated-key');

  if (!passphraseBtn || !bit256Btn || !generatedKeyInput || !saveBtn) {
    throw new Error('Key generator UI elements not found');
  }

  // Generate initial key
  async function generateKey() {
    if (currentKeyType === 'passphrase') {
      currentKeyValue = await generatePassphrase(6);
    } else {
      currentKeyValue = generate256BitKey();
    }
    generatedKeyInput.value = currentKeyValue;
  }

  // Set default key name
  function setDefaultKeyName() {
    if (!keyNameInput.value) {
      keyNameInput.placeholder = generateDefaultKeyName();
    }
  }

  // Handle key type selection
  passphraseBtn.addEventListener('click', async () => {
    currentKeyType = 'passphrase';
    passphraseBtn.classList.add('active');
    bit256Btn.classList.remove('active');
    await generateKey();
  });

  bit256Btn.addEventListener('click', async () => {
    currentKeyType = '256bit';
    bit256Btn.classList.add('active');
    passphraseBtn.classList.remove('active');
    await generateKey();
  });

  // Handle regenerate
  regenerateBtn?.addEventListener('click', async () => {
    await generateKey();
  });

  // Handle copy
  copyBtn?.addEventListener('click', async () => {
    if (!currentKeyValue) return;
    
    try {
      await navigator.clipboard.writeText(currentKeyValue);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      copyBtn.classList.add('copied');
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  // Handle save
  saveBtn.addEventListener('click', async () => {
    if (!currentKeyValue) {
      alert('Please generate a key first');
      return;
    }

    const keyName = keyNameInput.value.trim() || keyNameInput.placeholder || generateDefaultKeyName();

    try {
      const keyData = {
        name: keyName,
        type: currentKeyType,
        value: currentKeyValue
      };

      await addKey(keyData);
      
      // Show success feedback
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      saveBtn.classList.add('saved');
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.classList.remove('saved');
      }, 2000);

      // Clear input and generate new key
      keyNameInput.value = '';
      setDefaultKeyName();
      generateKey();
    } catch (error) {
      console.error('Failed to save key:', error);
      alert('Failed to save key: ' + error.message);
    }
  });

  // Initialize
  setDefaultKeyName();
  await generateKey();
}

/**
 * Mount the key generator to a container element
 * @param {HTMLElement} container - Container to mount the component
 */
export async function mountKeyGenerator(container) {
  container.innerHTML = createKeyGeneratorUI();
  await initKeyGenerator(container);
}
