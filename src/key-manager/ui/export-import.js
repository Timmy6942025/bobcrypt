/**
 * Export/Import UI Component
 * Provides interface for backing up and restoring encrypted vault
 * @module key-manager/ui/export-import
 */

import { exportVault, importVault } from '../storage.js';

/**
 * Create the Export/Import UI HTML
 * @returns {string} HTML string for the export/import component
 */
export function createExportImportUI() {
  return `
    <div class="export-import">
      <h3>Backup & Restore</h3>
      
      <div class="export-section">
        <h4>Export Vault</h4>
        <p class="warning">⚠️ Keep this backup secure! Anyone with this data and your master password can access your keys.</p>
        <button id="show-export">Show Encrypted Vault</button>
        <div id="export-data" style="display: none;">
          <textarea id="export-text" readonly rows="5"></textarea>
          <button id="copy-export">Copy to Clipboard</button>
          <button id="download-export">Download as File</button>
        </div>
      </div>
      
      <hr />
      
      <div class="import-section">
        <h4>Import Vault</h4>
        <p class="warning">⚠️ Importing will REPLACE your current vault!</p>
        
        <label>Paste encrypted vault:</label>
        <textarea id="import-text" rows="5" placeholder="Paste base64-encoded vault data..."></textarea>
        
        <label>Or upload file:</label>
        <input type="file" id="import-file" accept=".json,.txt,.encyphrix-vault" />
        
        <button id="import-vault" class="btn-danger">Import Vault</button>
      </div>
    </div>
  `;
}

/**
 * Initialize the Export/Import UI
 * Sets up event listeners for export and import functionality
 * @param {HTMLElement} container - Container element to attach listeners to
 * @param {string} masterPassword - Master password for import verification
 */
export function initExportImport(container = document, masterPassword = '') {
  const showExportBtn = container.querySelector('#show-export');
  const exportDataDiv = container.querySelector('#export-data');
  const exportTextarea = container.querySelector('#export-text');
  const copyExportBtn = container.querySelector('#copy-export');
  const downloadExportBtn = container.querySelector('#download-export');
  const importTextarea = container.querySelector('#import-text');
  const importFileInput = container.querySelector('#import-file');
  const importVaultBtn = container.querySelector('#import-vault');

  if (!showExportBtn || !exportDataDiv || !exportTextarea || !importVaultBtn) {
    throw new Error('Export/Import UI elements not found');
  }

  // Show export data
  showExportBtn.addEventListener('click', () => {
    try {
      const encryptedData = exportVault();
      exportTextarea.value = encryptedData;
      exportDataDiv.style.display = 'block';
      showExportBtn.style.display = 'none';
    } catch (error) {
      alert('Failed to export vault: ' + error.message);
    }
  });

  // Copy to clipboard
  copyExportBtn?.addEventListener('click', async () => {
    const data = exportTextarea.value;
    if (!data) return;

    try {
      await navigator.clipboard.writeText(data);
      const originalText = copyExportBtn.textContent;
      copyExportBtn.textContent = '✓ Copied!';
      copyExportBtn.classList.add('copied');

      setTimeout(() => {
        copyExportBtn.textContent = originalText;
        copyExportBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  });

  // Download as file
  downloadExportBtn?.addEventListener('click', () => {
    const data = exportTextarea.value;
    if (!data) return;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use random filename to avoid information leakage
    const randomSuffix = crypto.getRandomValues(new Uint8Array(4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    a.download = `vault-${randomSuffix}.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Handle file upload
  importFileInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    // Validate file type (accept text files only)
    if (!file.type.match(/^text\/.*/) && !file.name.endsWith('.enc') && !file.name.endsWith('.txt')) {
      alert('Invalid file type. Please select a text file or .enc file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        importTextarea.value = content.trim();
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsText(file);
  });

  // Import vault
  importVaultBtn.addEventListener('click', async () => {
    const encryptedData = importTextarea.value.trim();
    if (!encryptedData) {
      alert('Please paste encrypted vault data or upload a file');
      return;
    }

    // Backup current vault before importing (if one exists)
    let backupData = null;
    try {
      backupData = exportVault();
    } catch (e) {
      // No existing vault to backup
    }

    // Show confirmation dialog
    const confirmed = confirm(
      '⚠️ WARNING: This will REPLACE your current vault!\n\n' +
      (backupData ? 'A backup of your current vault has been prepared.\n' : '') +
      'Do you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    // Get master password if not provided
    let password = masterPassword;
    if (!password) {
      password = prompt('Enter your master password to verify the vault:');
      if (!password) {
        return;
      }
    }

    try {
      await importVault(encryptedData, password);
      alert('✓ Vault imported successfully!');
      importTextarea.value = '';
      if (importFileInput) {
        importFileInput.value = '';
      }
    } catch (error) {
      alert('Failed to import vault: ' + error.message);
    }
  });
}

/**
 * Mount the export/import UI to a container element
 * @param {HTMLElement} container - Container to mount the component
 * @param {string} masterPassword - Master password for import verification
 */
export function mountExportImport(container, masterPassword = '') {
  container.innerHTML = createExportImportUI();
  initExportImport(container, masterPassword);
}
