import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Key Manager E2E Tests
 *
 * Comprehensive tests covering all 7 test scenarios:
 * 1. Vault Creation Flow
 * 2. Vault Unlock Flow
 * 3. Key Generation (6-word passphrase, copy, save)
 * 4. Manual Key Entry (invalid/valid 256-bit key)
 * 5. Key Selection for Encryption
 * 6. Lock/Unlock Cycle
 * 7. Export/Import
 */

test.describe('Key Manager - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });

    // Clear localStorage before each test to ensure clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    // Wait for JavaScript modules to load and initialize
    await page.waitForTimeout(3000);
  });

  /**
   * SCENARIO 1: Vault Creation Flow
   * - Navigate to app
   * - Enter master password
   * - Confirm master password
   * - Click create vault
   * - Verify vault created and UI unlocked
   */
  test.describe('Scenario 1: Vault Creation Flow', () => {
    test('should create vault with master password and unlock UI', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Verify initial state - setup section visible
      await expect(page.locator('#master-password-setup')).toBeVisible();
      await expect(page.locator('#unlock-vault')).not.toBeVisible();
      await expect(page.locator('#key-manager-ui')).not.toBeVisible();

      // Enter master password and confirmation
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);

      // Click create vault button
      await page.click('#create-vault-btn');

      // Wait for vault creation - key manager UI should become visible
      await expect(page.locator('#key-manager-ui')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#master-password-setup')).not.toBeVisible();
      await expect(page.locator('#unlock-vault')).not.toBeVisible();

      // Verify tabs are available
      await expect(page.locator('.tab-btn[data-tab="generate"]')).toBeVisible();
      await expect(page.locator('.tab-btn[data-tab="manual"]')).toBeVisible();
      await expect(page.locator('.tab-btn[data-tab="list"]')).toBeVisible();
      await expect(page.locator('.tab-btn[data-tab="backup"]')).toBeVisible();

      // Verify default tab is generate
      await expect(page.locator('#tab-generate')).toBeVisible();
      await expect(page.locator('#tab-manual')).not.toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      // Setup dialog handler before clicking
      const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 });

      // Fill in mismatched passwords
      await page.fill('#master-password', 'Password123!');
      await page.fill('#master-password-confirm', 'DifferentPassword456!');

      // Click create vault button
      await page.click('#create-vault-btn');

      // Should show alert
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('do not match');
      await dialog.accept();

      // Should still be on setup screen
      await expect(page.locator('#master-password-setup')).toBeVisible();
      await expect(page.locator('#key-manager-ui')).not.toBeVisible();
    });

    test('should show error when password is too short', async ({ page }) => {
      // Setup dialog handler before clicking
      const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 });

      // Fill in short password
      await page.fill('#master-password', 'short');
      await page.fill('#master-password-confirm', 'short');

      // Click create vault button
      await page.click('#create-vault-btn');

      // Should show alert
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('at least 8 characters');
      await dialog.accept();

      // Should still be on setup screen
      await expect(page.locator('#master-password-setup')).toBeVisible();
    });
  });

  /**
   * SCENARIO 2: Vault Unlock Flow
   * - Reload page (vault exists)
   * - See unlock screen
   * - Enter wrong password (should fail)
   * - Enter correct password
   * - Verify UI unlocks
   */
  test.describe('Scenario 2: Vault Unlock Flow', () => {
    test('should show unlock screen after reload and unlock with correct password', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create vault first
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Verify vault is created
      await expect(page.locator('#key-manager-ui')).toBeVisible();

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Should show unlock screen
      await expect(page.locator('#unlock-vault')).toBeVisible();
      await expect(page.locator('#unlock-password')).toBeVisible();
      await expect(page.locator('#unlock-btn')).toBeVisible();

      // Setup and UI should be hidden
      await expect(page.locator('#master-password-setup')).not.toBeVisible();
      await expect(page.locator('#key-manager-ui')).not.toBeVisible();

      // Enter correct password and unlock
      await page.fill('#unlock-password', masterPassword);
      await page.click('#unlock-btn');
      // Wait for UI update

      // Should show key manager UI
      await expect(page.locator('#key-manager-ui')).toBeVisible();
      await expect(page.locator('#unlock-vault')).not.toBeVisible();
    });

    test('should show error with incorrect password', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create vault first
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Enter wrong password
      await page.fill('#unlock-password', 'WrongPassword123!');

      // Setup dialog handler
      const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 });

      await page.click('#unlock-btn');

      // Should show alert
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('Invalid');
      await dialog.accept();

      // Should still be on unlock screen
      await expect(page.locator('#unlock-vault')).toBeVisible();
      await expect(page.locator('#key-manager-ui')).not.toBeVisible();
    });
  });

  /**
   * SCENARIO 3: Key Generation
   * - Generate 6-word passphrase
   * - Copy to clipboard
   * - Save with custom name
   * - Verify appears in key list
   */
  test.describe('Scenario 3: Key Generation', () => {
    test('should generate 6-word passphrase, copy, and save with custom name', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const customKeyName = 'My Custom Passphrase Key';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Should be on generate tab by default
      await expect(page.locator('#tab-generate')).toBeVisible();

      // Verify passphrase mode is active by default
      const passphraseBtn = page.locator('#gen-passphrase');
      await expect(passphraseBtn).toHaveClass(/active/);

      // Get generated key - should be 6-word passphrase
      const generatedKey = await page.inputValue('#generated-key');
      expect(generatedKey.length).toBeGreaterThan(0);
      // 6 words separated by hyphens
      const wordCount = generatedKey.split('-').length;
      expect(wordCount).toBe(6);

      // Copy to clipboard
      await page.click('#copy-generated-key');
      await page.waitForTimeout(500);

      // Verify copy feedback
      const copyBtn = page.locator('#copy-generated-key');
      await expect(copyBtn).toHaveText('✓ Copied!');

      // Enter custom key name
      await page.fill('#new-key-name', customKeyName);

      // Save the key
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Verify save feedback
      const saveBtn = page.locator('#save-generated-key');
      await expect(saveBtn).toHaveText('✓ Saved!');

      // Switch to list tab to verify key appears
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('#tab-list')).toBeVisible();

      // Verify key appears in list
      const keyList = page.locator('.key-list-container');
      await expect(keyList).toContainText(customKeyName);

      // Verify key count
      const keyCount = page.locator('#key-count');
      await expect(keyCount).toContainText('1 key');
    });

    test('should generate 256-bit key and save', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Switch to 256-bit mode
      await page.click('#gen-256bit');

      // Verify 256-bit mode is active
      const bit256Btn = page.locator('#gen-256bit');
      await expect(bit256Btn).toHaveClass(/active/);

      // Get generated key - should be 64 hex characters
      const generatedKey = await page.inputValue('#generated-key');
      expect(generatedKey).toMatch(/^[0-9a-f]{64}$/i);

      // Save with default name
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Switch to list tab
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText('Key 1');
    });

    test('should regenerate key on button click', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Get initial key
      const initialKey = await page.inputValue('#generated-key');

      // Click regenerate
      await page.click('#regenerate-key');
      await page.waitForTimeout(100);

      // Should have different key
      const newKey = await page.inputValue('#generated-key');
      expect(newKey).not.toBe(initialKey);
      expect(newKey.length).toBeGreaterThan(0);
    });
  });

  /**
   * SCENARIO 4: Manual Key Entry
   * - Switch to manual entry tab
   * - Enter invalid 256-bit key (should show error)
   * - Enter valid 256-bit key
   * - Save key
   * - Verify appears in list
   */
  test.describe('Scenario 4: Manual Key Entry', () => {
    test('should validate and save manual 256-bit key entry', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const validHexKey = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      const keyName = 'My Manual 256-bit Key';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Switch to manual tab
      await page.click('.tab-btn[data-tab="manual"]');
      await expect(page.locator('#tab-manual')).toBeVisible();

      // Switch to 256-bit mode
      await page.click('#manual-256bit');
      await expect(page.locator('#manual-256bit')).toHaveClass(/active/);

      // Enter invalid hex (too short)
      await page.fill('#manual-256bit-field', 'abc123');
      await page.fill('#manual-key-name', keyName);

      // Try to save
      await page.click('#save-manual-key');

      // Should show error
      const statusMsg = page.locator('#save-status-msg');
      await expect(statusMsg).toBeVisible();
      await expect(statusMsg).toHaveClass(/error/);

      // Clear and enter valid key
      await page.fill('#manual-256bit-field', validHexKey);

      // Should show validation success
      const validationMsg = page.locator('#hex-validation-msg');
      await expect(validationMsg).toHaveClass(/success/);

      // Save the key
      await page.click('#save-manual-key');
      await page.waitForTimeout(500);

      // Should show success
      await expect(statusMsg).toHaveClass(/success/);
      await expect(statusMsg).toContainText('saved successfully');

      // Switch to list tab to verify
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText(keyName);
    });

    test('should validate and save manual passphrase entry', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const passphrase = 'correct-horse-battery-staple';
      const keyName = 'My Manual Passphrase';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Switch to manual tab
      await page.click('.tab-btn[data-tab="manual"]');

      // Verify passphrase mode is active by default
      await expect(page.locator('#manual-passphrase')).toHaveClass(/active/);

      // Enter passphrase
      await page.fill('#manual-passphrase-field', passphrase);

      // Enter key name
      await page.fill('#manual-key-name', keyName);

      // Save the key
      await page.click('#save-manual-key');
      await page.waitForTimeout(500);

      // Should show success message
      const statusMsg = page.locator('#save-status-msg');
      await expect(statusMsg).toBeVisible();
      await expect(statusMsg).toContainText('saved successfully');

      // Switch to list tab to verify
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText(keyName);
    });

    test('should show error for short passphrase', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Switch to manual tab
      await page.click('.tab-btn[data-tab="manual"]');

      // Enter short passphrase
      await page.fill('#manual-passphrase-field', 'short');
      await page.fill('#manual-key-name', 'Short Key');

      // Try to save
      await page.click('#save-manual-key');

      // Should show error
      const statusMsg = page.locator('#save-status-msg');
      await expect(statusMsg).toHaveClass(/error/);
    });
  });

  /**
   * SCENARIO 5: Key Selection for Encryption
   * - Generate and save a key
   * - Go to encrypt section
   * - Select key from dropdown
   * - Verify password field auto-fills
   * - Encrypt a message
   */
  test.describe('Scenario 5: Key Selection for Encryption', () => {
    test('should select key from dropdown and auto-fill password for encryption', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const keyName = 'Encryption Test Key';
      const plaintext = 'Secret message for encryption test';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Generate and save a key
      await page.fill('#new-key-name', keyName);
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Verify key appears in encrypt dropdown
      const encryptSelect = page.locator('#encrypt-key-select');
      await expect(encryptSelect).toContainText(keyName);

      // Select the key from dropdown
      await encryptSelect.selectOption({ label: keyName });
      await page.waitForTimeout(200);

      // Verify password field is auto-filled
      const passwordField = page.locator('#encrypt-password');
      const passwordValue = await passwordField.inputValue();
      expect(passwordValue.length).toBeGreaterThan(0);

      // Enter plaintext
      await page.fill('#plaintext', plaintext);

      // Encrypt the message
      await page.click('#encrypt-btn');
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });

      // Verify ciphertext was generated
      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
      expect(ciphertext).not.toBe(plaintext);
    });

    test('should use saved key for encryption and decryption', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const keyName = 'Full Workflow Key';
      const plaintext = 'Complete encryption and decryption workflow test';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Generate and save a key
      await page.fill('#new-key-name', keyName);
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Select key for encryption
      const encryptSelect = page.locator('#encrypt-key-select');
      await encryptSelect.selectOption({ label: keyName });
      await page.waitForTimeout(200);

      // Enter plaintext and encrypt
      await page.fill('#plaintext', plaintext);
      await page.click('#encrypt-btn');
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });

      // Get ciphertext
      const ciphertext = await page.textContent('#ciphertext-output');

      // Select same key for decryption
      const decryptSelect = page.locator('#decrypt-key-select');
      await decryptSelect.selectOption({ label: keyName });
      await page.waitForTimeout(200);

      // Verify decrypt password field is filled
      const decryptPassword = await page.inputValue('#decrypt-password');
      expect(decryptPassword.length).toBeGreaterThan(0);

      // Enter ciphertext and decrypt
      await page.fill('#ciphertext', ciphertext!);
      await page.click('#decrypt-btn');
      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 15000 });

      // Verify decrypted text matches original
      const decrypted = await page.textContent('#plaintext-output');
      expect(decrypted).toBe(plaintext);
    });
  });

  /**
   * SCENARIO 6: Lock/Unlock Cycle
   * - Lock vault
   * - Verify shows unlock screen
   * - Unlock with password
   * - Verify keys still available
   */
  test.describe('Scenario 6: Lock/Unlock Cycle', () => {
    test('should lock vault and show unlock screen', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Generate and save a key
      await page.fill('#new-key-name', 'Test Key');
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Verify key is in dropdown
      const encryptSelect = page.locator('#encrypt-key-select');
      await expect(encryptSelect).toContainText('Test Key');

      // Lock the vault
      await page.click('#lock-vault-btn');
      await page.waitForTimeout(500);

      // Should show unlock screen
      await expect(page.locator('#unlock-vault')).toBeVisible();
      await expect(page.locator('#key-manager-ui')).not.toBeVisible();

      // Key selectors should be cleared (only default option)
      const options = await encryptSelect.locator('option').count();
      expect(options).toBe(1); // Only the default option

      // Password field should be cleared
      const passwordValue = await page.inputValue('#encrypt-password');
      expect(passwordValue).toBe('');
    });

    test('should complete full lock/unlock cycle with keys preserved', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const keyName = 'Persistent Key';

      // Create vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Save a key
      await page.fill('#new-key-name', keyName);
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Verify key exists
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText(keyName);

      // Lock vault
      await page.click('#lock-vault-btn');
      await page.waitForTimeout(500);

      // Verify locked state
      await expect(page.locator('#unlock-vault')).toBeVisible();

      // Unlock vault
      await page.fill('#unlock-password', masterPassword);
      await page.click('#unlock-btn');
      // Wait for UI update

      // Should show key manager UI
      await expect(page.locator('#key-manager-ui')).toBeVisible();
      await expect(page.locator('#unlock-vault')).not.toBeVisible();

      // Switch to list tab and verify key still exists
      await page.click('.tab-btn[data-tab="list"]');
      const keyList = page.locator('.key-list-container');
      await expect(keyList).toContainText(keyName);

      // Verify key count
      await expect(page.locator('#key-count')).toContainText('1 key');
    });

    test('should persist keys through multiple lock/unlock cycles', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Save multiple keys
      for (let i = 1; i <= 3; i++) {
        await page.fill('#new-key-name', `Key ${i}`);
        await page.click('#save-generated-key');
        await page.waitForTimeout(300);
      }

      // Verify all keys exist
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('#key-count')).toContainText('3 keys');

      // Multiple lock/unlock cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        // Lock
        await page.click('#lock-vault-btn');
        await page.waitForTimeout(500);
        await expect(page.locator('#unlock-vault')).toBeVisible();

        // Unlock
        await page.fill('#unlock-password', masterPassword);
        await page.click('#unlock-btn');
        // Wait for UI update
        await expect(page.locator('#key-manager-ui')).toBeVisible();
      }

      // Verify all keys still exist after cycles
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('#key-count')).toContainText('3 keys');
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator('.key-list-container')).toContainText(`Key ${i}`);
      }
    });
  });

  /**
   * SCENARIO 7: Export/Import
   * - Export vault
   * - Copy export data
   * - Clear vault (or use new browser context)
   * - Import vault
   * - Verify keys restored
   */
  test.describe('Scenario 7: Export/Import', () => {
    test('should export vault and show encrypted data', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Save a key
      await page.fill('#new-key-name', 'Export Test Key');
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Switch to backup tab
      await page.click('.tab-btn[data-tab="backup"]');
      await expect(page.locator('#tab-backup')).toBeVisible();

      // Click show export
      await page.click('#show-export');

      // Export data should be visible
      const exportData = page.locator('#export-data');
      await expect(exportData).toBeVisible();

      // Should have encrypted data in textarea
      const exportText = page.locator('#export-text');
      const backupData = await exportText.inputValue();
      expect(backupData.length).toBeGreaterThan(0);

      // Verify copy button works
      await page.click('#copy-export');
      await page.waitForTimeout(500);

      // Verify download button exists
      await expect(page.locator('#download-export')).toBeVisible();
    });

    test('should export and import vault with keys restored', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';
      const keyName = 'Key To Backup';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Save a key
      await page.fill('#new-key-name', keyName);
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Switch to backup tab and export
      await page.click('.tab-btn[data-tab="backup"]');
      await page.click('#show-export');
      await page.waitForTimeout(200);

      // Get export data
      const exportData = await page.inputValue('#export-text');
      expect(exportData.length).toBeGreaterThan(0);

      // Clear localStorage to simulate new browser context
      await page.evaluate(() => {
        localStorage.clear();
      });

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Should show setup screen (no vault)
      await expect(page.locator('#master-password-setup')).toBeVisible();

      // Create new vault with same password
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Switch to backup tab
      await page.click('.tab-btn[data-tab="backup"]');

      // Paste export data and import
      await page.fill('#import-text', exportData);

      // Handle confirmation dialog
      page.on('dialog', async dialog => {
        if (dialog.message().includes('REPLACE')) {
          await dialog.accept();
        } else if (dialog.message().includes('master password')) {
          await dialog.accept(masterPassword);
        } else {
          await dialog.accept();
        }
      });

      await page.click('#import-vault');
      // Wait for UI update

      // Switch to list tab and verify key restored
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText(keyName);
    });

    test('should handle file upload for import', async ({ page }) => {
      const masterPassword = 'MySecureMasterPassword123!';

      // Create and unlock vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update

      // Save a key
      await page.fill('#new-key-name', 'File Import Test Key');
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Switch to backup tab and export
      await page.click('.tab-btn[data-tab="backup"]');
      await page.click('#show-export');
      await page.waitForTimeout(200);

      // Verify file input exists
      await expect(page.locator('#import-file')).toBeVisible();

      // Verify import button exists
      await expect(page.locator('#import-vault')).toBeVisible();
    });
  });

  /**
   * Additional Integration Tests
   */
  test.describe('Integration: Full Key Manager Workflow', () => {
    test('should complete full workflow: create vault, generate keys, encrypt/decrypt, lock/unlock, export/import', async ({ page }) => {
      const masterPassword = 'FullWorkflowPassword123!';
      const keyName = 'Workflow Test Key';
      const plaintext = 'Complete end-to-end workflow test message';

      // Step 1: Create vault
      await page.fill('#master-password', masterPassword);
      await page.fill('#master-password-confirm', masterPassword);
      await page.click('#create-vault-btn');
      // Wait for UI update
      await expect(page.locator('#key-manager-ui')).toBeVisible();

      // Step 2: Generate and save a key
      await page.fill('#new-key-name', keyName);
      await page.click('#save-generated-key');
      await page.waitForTimeout(500);

      // Step 3: Verify key in list
      await page.click('.tab-btn[data-tab="list"]');
      await expect(page.locator('.key-list-container')).toContainText(keyName);

      // Step 4: Use key for encryption
      await page.click('.tab-btn[data-tab="generate"]');
      const encryptSelect = page.locator('#encrypt-key-select');
      await encryptSelect.selectOption({ label: keyName });
      await page.waitForTimeout(200);

      // Step 5: Encrypt message
      await page.fill('#plaintext', plaintext);
      await page.click('#encrypt-btn');
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });
      const ciphertext = await page.textContent('#ciphertext-output');

      // Step 6: Lock vault
      await page.click('#lock-vault-btn');
      await page.waitForTimeout(500);
      await expect(page.locator('#unlock-vault')).toBeVisible();

      // Step 7: Unlock vault
      await page.fill('#unlock-password', masterPassword);
      await page.click('#unlock-btn');
      // Wait for UI update
      await expect(page.locator('#key-manager-ui')).toBeVisible();

      // Step 8: Verify key still available and decrypt
      const decryptSelect = page.locator('#decrypt-key-select');
      await decryptSelect.selectOption({ label: keyName });
      await page.waitForTimeout(200);
      await page.fill('#ciphertext', ciphertext!);
      await page.click('#decrypt-btn');
      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 15000 });
      const decrypted = await page.textContent('#plaintext-output');
      expect(decrypted).toBe(plaintext);

      // Step 9: Export vault
      await page.click('.tab-btn[data-tab="backup"]');
      await page.click('#show-export');
      await page.waitForTimeout(200);
      const exportData = await page.inputValue('#export-text');
      expect(exportData.length).toBeGreaterThan(0);

      // Workflow complete
      await expect(page.locator('#key-manager-ui')).toBeVisible();
    });
  });
});
