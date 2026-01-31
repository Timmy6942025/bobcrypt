import { addKey } from '../storage.js';

/**
 * Create the manual key entry UI HTML
 * @returns {string} HTML string for the manual entry component
 */
export function createManualEntryUI() {
  return `
    <div class="manual-entry">
      <h3>Enter Your Own Key</h3>
      
      <div class="key-type-selector">
        <button id="manual-passphrase" class="active">Passphrase</button>
        <button id="manual-256bit">256-bit Key</button>
      </div>
      
      <div id="manual-passphrase-input">
        <label>Enter Passphrase:</label>
        <textarea id="manual-passphrase-field" placeholder="correct-horse-battery-staple..." rows="3"></textarea>
        <span class="help-text">Words separated by hyphens or spaces (min 8 characters)</span>
        <div id="passphrase-validation-msg" class="validation-msg"></div>
      </div>
      
      <div id="manual-256bit-input" style="display: none;">
        <label>Enter 256-bit Key (hex):</label>
        <input type="text" id="manual-256bit-field" placeholder="64 character hex string..." maxlength="64" />
        <span class="help-text">Exactly 64 hexadecimal characters (0-9, A-F)</span>
        <div id="hex-validation-msg" class="validation-msg"></div>
      </div>
      
      <div class="key-name-input">
        <label>Key Name:</label>
        <input type="text" id="manual-key-name" placeholder="My Custom Key" />
        <div id="name-validation-msg" class="validation-msg"></div>
      </div>
      
      <button id="save-manual-key" class="btn-primary">Save Key to Vault</button>
      <div id="save-status-msg" class="status-msg"></div>
    </div>
  `;
}

/**
 * Validate hex string for 256-bit key
 * @param {string} value - The hex string to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateHexKey(value) {
  if (!value || value.length === 0) {
    return { valid: false, error: 'Key is required' };
  }
  
  if (value.length !== 64) {
    return { valid: false, error: `Key must be exactly 64 characters (currently ${value.length})` };
  }
  
  const hexRegex = /^[0-9A-Fa-f]{64}$/;
  if (!hexRegex.test(value)) {
    return { valid: false, error: 'Key must contain only hexadecimal characters (0-9, A-F)' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate passphrase
 * @param {string} value - The passphrase to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validatePassphrase(value) {
  if (!value || value.length === 0) {
    return { valid: false, error: 'Passphrase is required' };
  }
  
  if (value.length < 8) {
    return { valid: false, error: 'Passphrase must be at least 8 characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate key name
 * @param {string} value - The key name to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateKeyName(value) {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: 'Key name is required' };
  }
  
  if (value.trim().length < 1) {
    return { valid: false, error: 'Key name cannot be empty' };
  }
  
  return { valid: true, error: null };
}

/**
 * Get current key type based on active button
 * @returns {'passphrase'|'256bit'} The selected key type
 */
function getSelectedKeyType() {
  const passphraseBtn = document.getElementById('manual-passphrase');
  return passphraseBtn && passphraseBtn.classList.contains('active') ? 'passphrase' : '256bit';
}

/**
 * Show validation message for an element
 * @param {string} elementId - The ID of the validation message element
 * @param {string|null} message - The message to show, or null to clear
 * @param {'error'|'success'} type - The type of message
 */
function showValidationMessage(elementId, message, type = 'error') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (message) {
    element.textContent = message;
    element.className = `validation-msg ${type}`;
    element.style.display = 'block';
  } else {
    element.textContent = '';
    element.className = 'validation-msg';
    element.style.display = 'none';
  }
}

/**
 * Show status message
 * @param {string} message - The message to show
 * @param {'error'|'success'} type - The type of message
 */
function showStatusMessage(message, type = 'error') {
  const element = document.getElementById('save-status-msg');
  if (!element) return;
  
  element.textContent = message;
  element.className = `status-msg ${type}`;
  element.style.display = 'block';
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
}

/**
 * Clear all validation messages
 */
function clearAllValidationMessages() {
  showValidationMessage('passphrase-validation-msg', null);
  showValidationMessage('hex-validation-msg', null);
  showValidationMessage('name-validation-msg', null);
  const statusElement = document.getElementById('save-status-msg');
  if (statusElement) {
    statusElement.style.display = 'none';
  }
}

/**
 * Switch between passphrase and 256-bit input modes
 * @param {'passphrase'|'256bit'} mode - The mode to switch to
 */
function switchInputMode(mode) {
  const passphraseBtn = document.getElementById('manual-passphrase');
  const hexBtn = document.getElementById('manual-256bit');
  const passphraseInput = document.getElementById('manual-passphrase-input');
  const hexInput = document.getElementById('manual-256bit-input');
  
  if (!passphraseBtn || !hexBtn || !passphraseInput || !hexInput) return;
  
  if (mode === 'passphrase') {
    passphraseBtn.classList.add('active');
    hexBtn.classList.remove('active');
    passphraseInput.style.display = 'block';
    hexInput.style.display = 'none';
  } else {
    passphraseBtn.classList.remove('active');
    hexBtn.classList.add('active');
    passphraseInput.style.display = 'none';
    hexInput.style.display = 'block';
  }
  
  clearAllValidationMessages();
}

/**
 * Validate current input based on selected mode
 * @returns {{valid: boolean, type: 'passphrase'|'256bit', value: string, name: string, error: string|null}} Validation result
 */
function validateCurrentInput() {
  const keyType = getSelectedKeyType();
  const nameInput = document.getElementById('manual-key-name');
  const name = nameInput ? nameInput.value.trim() : '';
  
  // Validate name first
  const nameValidation = validateKeyName(name);
  if (!nameValidation.valid) {
    showValidationMessage('name-validation-msg', nameValidation.error, 'error');
    return { valid: false, type: keyType, value: '', name, error: nameValidation.error };
  } else {
    showValidationMessage('name-validation-msg', null);
  }
  
  // Validate key value based on type
  if (keyType === 'passphrase') {
    const passphraseField = document.getElementById('manual-passphrase-field');
    const value = passphraseField ? passphraseField.value : '';
    const validation = validatePassphrase(value);
    
    if (!validation.valid) {
      showValidationMessage('passphrase-validation-msg', validation.error, 'error');
      return { valid: false, type: keyType, value, name, error: validation.error };
    } else {
      showValidationMessage('passphrase-validation-msg', null);
    }
    
    return { valid: true, type: keyType, value, name, error: null };
  } else {
    const hexField = document.getElementById('manual-256bit-field');
    const value = hexField ? hexField.value.trim() : '';
    const validation = validateHexKey(value);
    
    if (!validation.valid) {
      showValidationMessage('hex-validation-msg', validation.error, 'error');
      return { valid: false, type: keyType, value, name, error: validation.error };
    } else {
      showValidationMessage('hex-validation-msg', null);
    }
    
    return { valid: true, type: keyType, value, name, error: null };
  }
}

/**
 * Save the manually entered key to the vault
 * @returns {Promise<{success: boolean, key: Object|null, error: string|null}>} Save result
 */
export async function saveManualKey() {
  const validation = validateCurrentInput();
  
  if (!validation.valid) {
    showStatusMessage(validation.error || 'Invalid input', 'error');
    return { success: false, key: null, error: validation.error };
  }
  
  try {
    const keyData = {
      name: validation.name,
      type: validation.type,
      value: validation.value,
    };
    
    const savedKey = await addKey(keyData);
    
    // Clear inputs after successful save
    const nameInput = document.getElementById('manual-key-name');
    const passphraseField = document.getElementById('manual-passphrase-field');
    const hexField = document.getElementById('manual-256bit-field');
    
    if (nameInput) nameInput.value = '';
    if (passphraseField) passphraseField.value = '';
    if (hexField) hexField.value = '';
    
    clearAllValidationMessages();
    showStatusMessage(`Key "${savedKey.name}" saved successfully!`, 'success');
    
    return { success: true, key: savedKey, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save key';
    showStatusMessage(errorMessage, 'error');
    return { success: false, key: null, error: errorMessage };
  }
}

/**
 * Initialize manual entry UI event listeners
 * @param {HTMLElement} [container] - Optional container element (defaults to document)
 */
export function initManualEntry(container = document) {
  // Type selector buttons
  const passphraseBtn = container.getElementById ? container.getElementById('manual-passphrase') : document.getElementById('manual-passphrase');
  const hexBtn = container.getElementById ? container.getElementById('manual-256bit') : document.getElementById('manual-256bit');
  
  if (passphraseBtn) {
    passphraseBtn.addEventListener('click', () => switchInputMode('passphrase'));
  }
  
  if (hexBtn) {
    hexBtn.addEventListener('click', () => switchInputMode('256bit'));
  }
  
  // Real-time validation for hex input
  const hexField = container.getElementById ? container.getElementById('manual-256bit-field') : document.getElementById('manual-256bit-field');
  if (hexField) {
    hexField.addEventListener('input', (e) => {
      const target = e.target;
      // Convert to uppercase for consistency
      target.value = target.value.toUpperCase();
      
      // Clear validation message while typing
      if (target.value.length > 0) {
        const validation = validateHexKey(target.value);
        if (validation.valid) {
          showValidationMessage('hex-validation-msg', 'Valid hex key', 'success');
        } else {
          showValidationMessage('hex-validation-msg', null);
        }
      } else {
        showValidationMessage('hex-validation-msg', null);
      }
    });
    
    hexField.addEventListener('blur', (e) => {
      const target = e.target;
      if (target.value.length > 0) {
        const validation = validateHexKey(target.value);
        if (!validation.valid) {
          showValidationMessage('hex-validation-msg', validation.error, 'error');
        }
      }
    });
  }
  
  // Real-time validation for passphrase input
  const passphraseField = container.getElementById ? container.getElementById('manual-passphrase-field') : document.getElementById('manual-passphrase-field');
  if (passphraseField) {
    passphraseField.addEventListener('input', (e) => {
      const target = e.target;
      if (target.value.length > 0) {
        const validation = validatePassphrase(target.value);
        if (validation.valid) {
          showValidationMessage('passphrase-validation-msg', 'Valid passphrase', 'success');
        } else {
          showValidationMessage('passphrase-validation-msg', null);
        }
      } else {
        showValidationMessage('passphrase-validation-msg', null);
      }
    });
    
    passphraseField.addEventListener('blur', (e) => {
      const target = e.target;
      if (target.value.length > 0) {
        const validation = validatePassphrase(target.value);
        if (!validation.valid) {
          showValidationMessage('passphrase-validation-msg', validation.error, 'error');
        }
      }
    });
  }
  
  // Real-time validation for name input
  const nameInput = container.getElementById ? container.getElementById('manual-key-name') : document.getElementById('manual-key-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      showValidationMessage('name-validation-msg', null);
    });
    
    nameInput.addEventListener('blur', (e) => {
      const target = e.target;
      if (target.value.trim().length > 0) {
        const validation = validateKeyName(target.value.trim());
        if (!validation.valid) {
          showValidationMessage('name-validation-msg', validation.error, 'error');
        }
      }
    });
  }
  
  // Save button
  const saveBtn = container.getElementById ? container.getElementById('save-manual-key') : document.getElementById('save-manual-key');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveManualKey);
  }
}
