/**
 * Key List UI Component
 * Displays and manages saved encryption keys
 * @module key-manager/ui/key-list
 */

import { getAllKeys, deleteKey, updateKey, getKey } from '../storage.js';

/**
 * CSS class names for styling (matches the Cyber-Security Noir aesthetic)
 */
const CSS_CLASSES = {
  keyList: 'key-list',
  keyListHeader: 'key-list-header',
  keyListContainer: 'key-list-container',
  noKeysMessage: 'no-keys-message',
  keyItem: 'key-item',
  keyItemSelected: 'key-item--selected',
  keyIcon: 'key-icon',
  keyInfo: 'key-info',
  keyName: 'key-name',
  keyMeta: 'key-meta',
  keyType: 'key-type',
  keyDate: 'key-date',
  keyActions: 'key-actions',
  btnSelect: 'btn-select-key',
  btnRename: 'btn-rename-key',
  btnDelete: 'btn-delete-key',
  emptyState: 'empty-state',
  emptyIcon: 'empty-icon',
  emptyText: 'empty-text'
};

/**
 * Event callback types
 * @typedef {Object} KeyListCallbacks
 * @property {Function} onSelect - Called when a key is selected
 * @property {Function} onDelete - Called when a key is deleted
 * @property {Function} onRename - Called when a key is renamed
 */

/**
 * Create the key list UI HTML structure
 * @returns {string} HTML string for the key list component
 */
export function createKeyListUI() {
  return `
    <div class="${CSS_CLASSES.keyList}">
      <div class="${CSS_CLASSES.keyListHeader}">
        <h3>Saved Keys</h3>
        <span class="key-count" id="key-count">0 keys</span>
      </div>
      
      <div id="key-list-container" class="${CSS_CLASSES.keyListContainer}">
        <!-- Populated dynamically -->
      </div>
      
      <div id="no-keys-message" class="${CSS_CLASSES.noKeysMessage}" style="display: none;">
        <div class="${CSS_CLASSES.emptyState}">
          <span class="${CSS_CLASSES.emptyIcon}" aria-hidden="true">🔐</span>
          <p class="${CSS_CLASSES.emptyText}">No keys saved. Generate or add a key to get started.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes === 0) return 'Just now';
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  }
}

/**
 * Get icon for key type
 * @param {string} type - Key type ('passphrase' or '256bit')
 * @returns {string} Icon character
 */
function getKeyTypeIcon(type) {
  return type === '256bit' ? '🔑' : '📝';
}

/**
 * Get display label for key type
 * @param {string} type - Key type ('passphrase' or '256bit')
 * @returns {string} Display label
 */
function getKeyTypeLabel(type) {
  return type === '256bit' ? '256-bit Key' : 'Passphrase';
}

/**
 * Generate HTML for a single key item
 * @param {Object} key - Key object
 * @param {string} key.id - Key ID
 * @param {string} key.name - Key name
 * @param {string} key.type - Key type
 * @param {string} key.createdAt - Creation date
 * @param {string} [key.lastUsed] - Last used date
 * @param {boolean} [isSelected=false] - Whether this key is selected
 * @returns {string} HTML string for the key item
 */
export function renderKeyItem(key, isSelected = false) {
  const selectedClass = isSelected ? CSS_CLASSES.keyItemSelected : '';
  const typeIcon = getKeyTypeIcon(key.type);
  const typeLabel = getKeyTypeLabel(key.type);
  const createdDate = formatDate(key.createdAt);
  const lastUsedDate = key.lastUsed ? formatDate(key.lastUsed) : 'Never used';
  
  return `
    <div class="${CSS_CLASSES.keyItem} ${selectedClass}" data-key-id="${key.id}" role="listitem">
      <div class="${CSS_CLASSES.keyIcon}" aria-hidden="true" title="${typeLabel}">
        ${typeIcon}
      </div>
      
      <div class="${CSS_CLASSES.keyInfo}">
        <span class="${CSS_CLASSES.keyName}">${escapeHtml(key.name)}</span>
        <div class="${CSS_CLASSES.keyMeta}">
          <span class="${CSS_CLASSES.keyType}">${typeLabel}</span>
          <span class="key-date-separator">•</span>
          <span class="${CSS_CLASSES.keyDate}" title="Created: ${new Date(key.createdAt).toLocaleString()}">
            Created: ${createdDate}
          </span>
          <span class="key-date-separator">•</span>
          <span class="key-last-used" title="Last used: ${key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}">
            Used: ${lastUsedDate}
          </span>
        </div>
      </div>
      
      <div class="${CSS_CLASSES.keyActions}">
        <button 
          class="${CSS_CLASSES.btnSelect}" 
          data-action="select"
          data-key-id="${key.id}"
          title="Use this key for encryption/decryption"
          aria-label="Select key ${escapeHtml(key.name)}"
        >
          <span aria-hidden="true">✓</span> Use
        </button>
        <button 
          class="${CSS_CLASSES.btnRename}" 
          data-action="rename"
          data-key-id="${key.id}"
          title="Rename this key"
          aria-label="Rename key ${escapeHtml(key.name)}"
        >
          <span aria-hidden="true">✎</span>
        </button>
        <button 
          class="${CSS_CLASSES.btnDelete}" 
          data-action="delete"
          data-key-id="${key.id}"
          title="Delete this key permanently"
          aria-label="Delete key ${escapeHtml(key.name)}"
        >
          <span aria-hidden="true">🗑</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render the complete key list
 * @param {Array<Object>} keys - Array of key objects
 * @param {string} [selectedKeyId] - ID of currently selected key
 * @returns {string} HTML string for the key list
 */
export function renderKeyList(keys, selectedKeyId = null) {
  if (!keys || keys.length === 0) {
    return '';
  }
  
  return keys.map(key => renderKeyItem(key, key.id === selectedKeyId)).join('');
}

/**
 * Update the key count display
 * @param {number} count - Number of keys
 */
function updateKeyCount(count) {
  const countElement = document.getElementById('key-count');
  if (countElement) {
    countElement.textContent = `${count} key${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Show or hide the empty state message
 * @param {boolean} show - Whether to show the empty state
 */
function toggleEmptyState(show) {
  const container = document.getElementById('key-list-container');
  const emptyMessage = document.getElementById('no-keys-message');
  
  if (container && emptyMessage) {
    if (show) {
      container.style.display = 'none';
      emptyMessage.style.display = 'block';
    } else {
      container.style.display = 'block';
      emptyMessage.style.display = 'none';
    }
  }
}

/**
 * Refresh the key list display
 * @param {string} [selectedKeyId] - ID of currently selected key
 */
export async function refreshKeyList(selectedKeyId = null) {
  try {
    const keys = getAllKeys();
    const container = document.getElementById('key-list-container');
    
    if (!container) return;
    
    updateKeyCount(keys.length);
    
    if (keys.length === 0) {
      toggleEmptyState(true);
    } else {
      toggleEmptyState(false);
      container.innerHTML = renderKeyList(keys, selectedKeyId);
    }
  } catch (error) {
    // Vault might be locked - show empty state
    toggleEmptyState(true);
    updateKeyCount(0);
  }
}

/**
 * Initialize the key list component
 * @param {Object} options - Configuration options
 * @param {Function} [options.onSelect] - Callback when a key is selected (receives key object)
 * @param {Function} [options.onDelete] - Callback when a key is deleted (receives keyId)
 * @param {Function} [options.onRename] - Callback when a key is renamed (receives keyId, newName)
 * @param {string} [options.passwordFieldId] - ID of password input field to fill when selecting
 * @returns {Object} Controller object with public methods
 */
export function initKeyList(options = {}) {
  const {
    onSelect,
    onDelete,
    onRename,
    passwordFieldId = null
  } = options;
  
  let selectedKeyId = null;
  
  /**
   * Handle click events on the key list container
   * @param {Event} event - Click event
   */
  function handleKeyListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const keyId = button.dataset.keyId;
    
    if (!keyId) return;
    
    switch (action) {
      case 'select':
        handleSelectKey(keyId);
        break;
      case 'rename':
        handleRenameKey(keyId);
        break;
      case 'delete':
        handleDeleteKey(keyId);
        break;
    }
  }
  
  /**
   * Handle key selection
   * @param {string} keyId - Key ID to select
   */
  async function handleSelectKey(keyId) {
    try {
      const key = getKey(keyId);
      if (!key) {
        return;
      }
      
      selectedKeyId = keyId;
      
      // Update visual selection state
      document.querySelectorAll(`.${CSS_CLASSES.keyItem}`).forEach(item => {
        item.classList.remove(CSS_CLASSES.keyItemSelected);
      });
      
      const selectedItem = document.querySelector(`.${CSS_CLASSES.keyItem}[data-key-id="${keyId}"]`);
      if (selectedItem) {
        selectedItem.classList.add(CSS_CLASSES.keyItemSelected);
      }
      
      // Fill password field if specified
      if (passwordFieldId) {
        const passwordField = document.getElementById(passwordFieldId);
        if (passwordField) {
          passwordField.value = key.value;
          // Trigger input event for any listeners
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      // Call callback if provided
      if (onSelect) {
        onSelect(key);
      }
      
      // Update lastUsed timestamp in storage
      await updateKey(keyId, { lastUsed: new Date().toISOString() });
      
    } catch (error) {
      return;
    }
  }
  
  /**
   * Handle key rename
   * @param {string} keyId - Key ID to rename
   */
  async function handleRenameKey(keyId) {
    try {
      const key = getKey(keyId);
      if (!key) {
        return;
      }
      
      const newName = prompt('Enter new name for this key:', key.name);
      
      // User cancelled
      if (newName === null) return;
      
      // Validate new name
      const trimmedName = newName.trim();
      if (!trimmedName) {
        alert('Key name cannot be empty.');
        return;
      }
      
      if (trimmedName === key.name) return; // No change
      
      // Update in storage
      const updated = await updateKey(keyId, { name: trimmedName });
      
      if (updated) {
        // Refresh the list
        await refreshKeyList(selectedKeyId);
        
        // Call callback if provided
        if (onRename) {
          onRename(keyId, trimmedName);
        }
      }
    } catch (error) {
      alert('Failed to rename key: ' + error.message);
    }
  }
  
  /**
   * Handle key deletion
   * @param {string} keyId - Key ID to delete
   */
  async function handleDeleteKey(keyId) {
    try {
      const key = getKey(keyId);
      if (!key) {
        return;
      }
      
      // Confirm deletion
      const confirmed = confirm(
        `Are you sure you want to delete "${key.name}"?\n\n` +
        `Type: ${getKeyTypeLabel(key.type)}\n` +
        `This action cannot be undone.`
      );
      
      if (!confirmed) return;
      
      // Delete from storage
      const deleted = await deleteKey(keyId);
      
      if (deleted) {
        // Clear selection if this was the selected key
        if (selectedKeyId === keyId) {
          selectedKeyId = null;
          
          // Clear password field if specified
          if (passwordFieldId) {
            const passwordField = document.getElementById(passwordFieldId);
            if (passwordField) {
              passwordField.value = '';
              passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
        
        // Refresh the list
        await refreshKeyList(selectedKeyId);
        
        // Call callback if provided
        if (onDelete) {
          onDelete(keyId);
        }
      }
    } catch (error) {
      // Selection failed
    }
  }
  
  // Attach event listener to container
  const container = document.getElementById('key-list-container');
  if (container) {
    container.addEventListener('click', handleKeyListClick);
  }
  
  // Initial render
  refreshKeyList();
  
  // Return controller object
  return {
    /**
     * Refresh the key list display
     */
    refresh: () => refreshKeyList(selectedKeyId),
    
    /**
     * Get the currently selected key ID
     * @returns {string|null} Selected key ID
     */
    getSelectedKeyId: () => selectedKeyId,
    
    /**
     * Select a key by ID
     * @param {string} keyId - Key ID to select
     */
    selectKey: handleSelectKey,
    
    /**
     * Clean up event listeners
     */
    destroy: () => {
      if (container) {
        container.removeEventListener('click', handleKeyListClick);
      }
    }
  };
}

/**
 * Mount the key list component into a container
 * @param {HTMLElement} container - Container element to mount into
 * @param {Object} options - Options passed to initKeyList
 * @returns {Object} Controller object from initKeyList
 */
export function mountKeyList(container, options = {}) {
  if (!container) {
    throw new Error('Container element is required');
  }
  
  container.innerHTML = createKeyListUI();
  return initKeyList(options);
}
