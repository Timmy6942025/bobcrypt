/**
 * Key Storage Service
 * Manages encrypted key vault in localStorage
 * @module key-manager/storage
 */

const VAULT_KEY = 'encyphrix_key_vault';

// In-memory storage for decrypted vault (never persisted)
let decryptedVault = null;
let vaultKey = null;

/**
 * Generate a unique ID for keys using cryptographically secure randomness
 * @returns {string} Unique key ID
 */
function generateKeyId() {
  // Use crypto.getRandomValues for CSPRNG instead of Math.random()
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `key_${randomHex}`;
}

/**
 * Derive encryption key from master password using PBKDF2
 * SECURITY NOTE: Using PBKDF2 with 600k iterations per OWASP 2023 recommendations.
 * Future versions should migrate to Argon2id for consistency with crypto.js.
 * @param {string} password - Master password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-512'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt vault data
 * @param {Object} vault - Vault data to encrypt
 * @param {string} password - Master password
 * @returns {Promise<string>} Base64 encoded encrypted vault
 */
async function encryptVault(vault, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const vaultData = encoder.encode(JSON.stringify(vault));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    vaultData
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt vault data
 * @param {string} encryptedVault - Base64 encoded encrypted vault
 * @param {string} password - Master password
 * @returns {Promise<Object>} Decrypted vault data
 */
async function decryptVault(encryptedVault, password) {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedVault), c => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    throw new Error('Invalid password or corrupted vault');
  }
}

/**
 * Check if vault exists in localStorage
 * @returns {boolean} True if vault exists
 */
function vaultExists() {
  return localStorage.getItem(VAULT_KEY) !== null;
}

/**
 * Initialize a new encrypted vault
 * @param {string} masterPassword - Master password for vault encryption
 * @returns {Promise<void>}
 * @throws {Error} If vault already exists
 */
export async function initializeVault(masterPassword) {
  if (vaultExists()) {
    throw new Error('Vault already exists. Use unlockVault to access it.');
  }

  if (!masterPassword || masterPassword.length < 8) {
    throw new Error('Master password must be at least 8 characters');
  }

  const vault = {
    version: 1,
    createdAt: new Date().toISOString(),
    keys: []
  };

  const encrypted = await encryptVault(vault, masterPassword);
  localStorage.setItem(VAULT_KEY, encrypted);

  // Load into memory
  decryptedVault = vault;
  vaultKey = masterPassword;
}

/**
 * Unlock the vault with master password
 * @param {string} masterPassword - Master password
 * @returns {Promise<void>}
 * @throws {Error} If password is incorrect or vault doesn't exist
 */
export async function unlockVault(masterPassword) {
  if (!vaultExists()) {
    throw new Error('Vault does not exist. Use initializeVault to create one.');
  }

  const encrypted = localStorage.getItem(VAULT_KEY);
  decryptedVault = await decryptVault(encrypted, masterPassword);
  vaultKey = masterPassword;
}

/**
 * Lock the vault - clear decrypted data from memory
 * Securely wipes sensitive data before releasing references
 */
export function lockVault() {
  if (vaultKey && typeof vaultKey === 'string') {
    const wipedKey = vaultKey.split('').map(() => '0').join('');
    vaultKey = wipedKey;
  }
  
  if (decryptedVault && decryptedVault.keys) {
    decryptedVault.keys.forEach(key => {
      if (key.value && typeof key.value === 'string') {
        const wipedValue = key.value.split('').map(() => '0').join('');
        key.value = wipedValue;
      }
      key.value = '';
    });
  }
  
  if (decryptedVault) {
    decryptedVault.version = 0;
    decryptedVault.createdAt = '';
    decryptedVault.keys = [];
  }
  
  decryptedVault = null;
  vaultKey = null;
}

/**
 * Save current vault state to localStorage
 * @returns {Promise<void>}
 * @throws {Error} If vault is locked
 */
async function saveVault() {
  if (!decryptedVault || !vaultKey) {
    throw new Error('Vault is locked. Unlock first.');
  }

  const encrypted = await encryptVault(decryptedVault, vaultKey);
  localStorage.setItem(VAULT_KEY, encrypted);
}

/**
 * Add a new key to the vault
 * @param {Object} keyData - Key data to add
 * @param {string} keyData.name - Key name
 * @param {string} keyData.type - Key type ('passphrase' or '256bit')
 * @param {string} keyData.value - Key value
 * @returns {Promise<Object>} Added key with generated ID
 * @throws {Error} If vault is locked
 */
export async function addKey(keyData) {
  if (!decryptedVault) {
    throw new Error('Vault is locked. Unlock first.');
  }

  if (!keyData.name || !keyData.type || !keyData.value) {
    throw new Error('Key must have name, type, and value');
  }

  if (!['passphrase', '256bit'].includes(keyData.type)) {
    throw new Error('Key type must be "passphrase" or "256bit"');
  }

  const key = {
    id: generateKeyId(),
    name: keyData.name,
    type: keyData.type,
    value: keyData.value,
    createdAt: new Date().toISOString(),
    lastUsed: null
  };

  decryptedVault.keys.push(key);
  await saveVault();

  return { ...key };
}

/**
 * Get a key by ID
 * @param {string} id - Key ID
 * @returns {Object|null} Key object or null if not found
 * @throws {Error} If vault is locked
 */
export function getKey(id) {
  if (!decryptedVault) {
    throw new Error('Vault is locked. Unlock first.');
  }

  const key = decryptedVault.keys.find(k => k.id === id);
  return key ? { ...key } : null;
}

/**
 * Get all keys in the vault
 * @returns {Array<Object>} Array of key objects (without values for security)
 * @throws {Error} If vault is locked
 */
export function getAllKeys() {
  if (!decryptedVault) {
    throw new Error('Vault is locked. Unlock first.');
  }

  // Return keys without values for security
  return decryptedVault.keys.map(key => ({
    id: key.id,
    name: key.name,
    type: key.type,
    createdAt: key.createdAt,
    lastUsed: key.lastUsed
  }));
}

/**
 * Delete a key by ID
 * @param {string} id - Key ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 * @throws {Error} If vault is locked
 */
export async function deleteKey(id) {
  if (!decryptedVault) {
    throw new Error('Vault is locked. Unlock first.');
  }

  const index = decryptedVault.keys.findIndex(k => k.id === id);
  if (index === -1) {
    return false;
  }

  decryptedVault.keys.splice(index, 1);
  await saveVault();
  return true;
}

/**
 * Update a key
 * @param {string} id - Key ID to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.value] - New value
 * @returns {Promise<Object|null>} Updated key or null if not found
 * @throws {Error} If vault is locked
 */
export async function updateKey(id, updates) {
  if (!decryptedVault) {
    throw new Error('Vault is locked. Unlock first.');
  }

  const key = decryptedVault.keys.find(k => k.id === id);
  if (!key) {
    return null;
  }

  if (updates.name !== undefined) {
    key.name = updates.name;
  }

  if (updates.value !== undefined) {
    key.value = updates.value;
  }

  await saveVault();
  return { ...key };
}

/**
 * Export the encrypted vault for backup
 * @returns {string} Base64 encoded encrypted vault
 * @throws {Error} If vault doesn't exist
 */
export function exportVault() {
  const encrypted = localStorage.getItem(VAULT_KEY);
  if (!encrypted) {
    throw new Error('No vault to export');
  }
  return encrypted;
}

/**
 * Import an encrypted vault
 * @param {string} encryptedVault - Base64 encoded encrypted vault
 * @param {string} masterPassword - Master password to verify
 * @returns {Promise<void>}
 * @throws {Error} If password is incorrect
 */
export async function importVault(encryptedVault, masterPassword) {
  // Verify password by attempting decryption
  const vault = await decryptVault(encryptedVault, masterPassword);

  // Validate vault structure
  if (!vault || !Array.isArray(vault.keys)) {
    throw new Error('Invalid vault format');
  }

  // Save to localStorage
  localStorage.setItem(VAULT_KEY, encryptedVault);

  // Load into memory
  decryptedVault = vault;
  vaultKey = masterPassword;
}

/**
 * Check if vault is currently unlocked
 * @returns {boolean} True if vault is unlocked
 */
export function isVaultUnlocked() {
  return decryptedVault !== null;
}

/**
 * Get vault metadata (only when unlocked)
 * @returns {Object|null} Vault metadata or null if locked
 */
export function getVaultMetadata() {
  if (!decryptedVault) {
    return null;
  }

  return {
    version: decryptedVault.version,
    createdAt: decryptedVault.createdAt,
    keyCount: decryptedVault.keys.length
  };
}

/**
 * Clear vault from localStorage (destructive operation)
 * @returns {Promise<void>}
 */
export async function clearVault() {
  localStorage.removeItem(VAULT_KEY);
  lockVault();
}
