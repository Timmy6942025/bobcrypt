# Key Manager Feature - Complete Implementation Plan

## TL;DR

**Goal**: Implement a full-featured Key Manager for Encyphrix with EFF Long List passphrase generation, master password encryption, and integrated UI.

**Deliverables**:
- EFF Long List wordlist module with 6-word passphrase generation (~77.5 bits entropy)
- Master password encryption using Argon2id (256 MiB, 3 iterations)
- Key storage service with encrypted key vault
- Key Manager UI integrated into existing Encyphrix interface
- Manual key entry alternative
- Encrypted JSON export/import functionality
- Comprehensive test coverage

**Estimated Effort**: Large (~40-50 hours)
**Parallel Execution**: 4 waves with ~60% parallelizable
**Critical Path**: Wave 1 → Wave 2 (sequential dependencies)

---

## Context

### Existing Codebase
- **Project**: Encyphrix - paranoid-grade encryption web app
- **Stack**: Vanilla JS/TypeScript, libsodium-wrappers-sumo, Bun testing
- **Crypto**: AES-256-GCM + Argon2id (already implemented in `crypto.js`)
- **UI**: Single-page HTML with CSS-in-JS (1500+ lines in `index.html`)
- **Tests**: Bun test framework with TypeScript, Playwright for E2E

### Key Manager Requirements (Confirmed)

| Requirement | Status | Details |
|-------------|--------|---------|
| EFF Long List wordlist | MUST | 7,776 words, ~12.92 bits/word, 6 words = ~77.5 bits entropy |
| Master password encryption | MUST | Argon2id with 256 MiB memory, 3 iterations (MODERATE preset) |
| Key manager option | MUST | Generate and store encryption keys |
| Manual entry option | MUST | User can still type their own keys |
| Integrated UI | MUST | Seamless integration with existing Encyphrix UI |
| Encrypted exports | MUST | Only encrypted vault exports, no plaintext |
| Full version | MUST | Complete feature set, not MVP |

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1.1 EFF Wordlist Module | None | Self-contained, no dependencies |
| 1.2 Passphrase Generator | 1.1 | Uses wordlist for generation |
| 1.3 Master Password Crypto | None | Extends existing crypto patterns |
| 1.4 Key Storage Service | 1.3 | Needs encryption from master password |
| 1.5 Key Model/Types | None | Type definitions, independent |
| 2.1 Key Manager UI Components | 1.2, 1.4, 1.5 | Needs generation and storage working |
| 2.2 Manual Entry UI | 1.5 | Only needs types |
| 2.3 Key List/Manager View | 1.4, 1.5 | Needs storage service and types |
| 2.4 Export/Import UI | 1.4 | Needs storage for encrypted export |
| 2.5 Main UI Integration | 2.1, 2.2, 2.3, 2.4 | Combines all UI components |
| 3.1 Unit Tests - Crypto | 1.1, 1.2, 1.3 | Tests wordlist, passphrase, encryption |
| 3.2 Unit Tests - Storage | 1.4 | Tests key storage operations |
| 3.3 Unit Tests - UI | 2.1, 2.2, 2.3 | Tests UI component logic |
| 3.4 E2E Tests | 2.5 | Tests full user workflows |
| 4.1 Developer Documentation | All | Documents all implementation |
| 4.2 User Documentation | 2.5 | Documents UI usage |
| 4.3 Security Documentation | 1.3, 1.4 | Documents encryption architecture |

---

## Parallel Execution Graph

### Wave 1: Foundation (Parallel - 5 tasks)
**Can all start immediately, no dependencies**

```
Wave 1 (Start immediately - all parallel):
├── Task 1.1: EFF Wordlist Module
│   └── Files: src/key-manager/wordlist.js
├── Task 1.2: Passphrase Generator
│   └── Files: src/key-manager/passphrase.js
├── Task 1.3: Master Password Crypto
│   └── Files: src/key-manager/master-crypto.js
├── Task 1.4: Key Storage Service (starts with 1.3)
│   └── Files: src/key-manager/storage.js
└── Task 1.5: Key Model/Types
    └── Files: src/key-manager/types.ts

Critical Path within Wave 1: 1.3 → 1.4 (storage needs crypto)
Estimated Wave 1 time: 8-10 hours (parallel)
```

### Wave 2: Integration (Depends on Wave 1)
**Starts after Wave 1 completes, partial parallelism**

```
Wave 2 (After Wave 1 completes):
├── Task 2.1: Key Manager UI Components (depends: 1.2, 1.4, 1.5)
│   └── Files: src/key-manager/ui/generator.js
├── Task 2.2: Manual Entry UI (depends: 1.5 - can parallel with 2.1)
│   └── Files: src/key-manager/ui/manual-entry.js
├── Task 2.3: Key List/Manager View (depends: 1.4, 1.5 - can parallel with 2.1)
│   └── Files: src/key-manager/ui/key-list.js
├── Task 2.4: Export/Import UI (depends: 1.4 - can parallel with 2.1)
│   └── Files: src/key-manager/ui/export-import.js
└── Task 2.5: Main UI Integration (depends: 2.1, 2.2, 2.3, 2.4 - FINAL)
    └── Files: src/index.html (modifications)

Parallel groups within Wave 2:
- Group A (parallel): 2.1, 2.2, 2.3, 2.4
- Group B (sequential): 2.5 (waits for Group A)

Estimated Wave 2 time: 12-15 hours (40% parallel speedup)
```

### Wave 3: Testing (Depends on Wave 2)
**Starts after Wave 2, mostly sequential**

```
Wave 3 (After Wave 2 completes):
├── Task 3.1: Unit Tests - Crypto (depends: 1.1, 1.2, 1.3)
│   └── Files: src/__tests__/key-manager/crypto.test.ts
├── Task 3.2: Unit Tests - Storage (depends: 1.4)
│   └── Files: src/__tests__/key-manager/storage.test.ts
├── Task 3.3: Unit Tests - UI Logic (depends: 2.1, 2.2)
│   └── Files: src/__tests__/key-manager/ui.test.ts
└── Task 3.4: E2E Tests - Full Workflows (depends: 2.5 - FINAL)
    └── Files: e2e/key-manager.spec.ts

Parallel groups within Wave 3:
- Group A (parallel): 3.1, 3.2, 3.3
- Group B (sequential): 3.4 (needs full UI)

Estimated Wave 3 time: 10-12 hours (30% parallel speedup)
```

### Wave 4: Documentation (Can parallel with Wave 3)
**Can start after Wave 2, parallel with Wave 3**

```
Wave 4 (After Wave 2, parallel with Wave 3):
├── Task 4.1: Developer Documentation (depends: all implementation)
│   └── Files: docs/key-manager/implementation.md
├── Task 4.2: User Documentation (depends: 2.5)
│   └── Files: docs/key-manager/user-guide.md
└── Task 4.3: Security Documentation (depends: 1.3, 1.4)
    └── Files: docs/key-manager/security.md

All 3 tasks can run in parallel
Estimated Wave 4 time: 6-8 hours (100% parallel)
```

### Summary

| Wave | Tasks | Parallel Groups | Estimated Time |
|------|-------|-----------------|----------------|
| 1 | 5 | 1 group (all parallel) | 8-10 hours |
| 2 | 5 | 2 groups (40% parallel) | 12-15 hours |
| 3 | 4 | 2 groups (30% parallel) | 10-12 hours |
| 4 | 3 | 1 group (100% parallel) | 6-8 hours |
| **Total** | **17** | **~60% parallelizable** | **36-45 hours** |

---

## Detailed Task Specifications

---

### WAVE 1: FOUNDATION

---

#### Task 1.1: EFF Long List Wordlist Module

**What to do**:
1. Download the official EFF Long List from https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
2. Create `src/key-manager/wordlist.js` module
3. Parse the tab-separated format (dice_number\tword)
4. Store words in efficient lookup structure (Array for index access)
5. Provide word count validation (must be exactly 7776 words)
6. Export functions: `getWordList()`, `getWordCount()`, `getWordByIndex(index)`

**Must NOT do**:
- Do NOT include the full wordlist as inline text in JS (too large, ~50KB)
- Do NOT use external CDN or network requests (violates zero-network policy)
- Do NOT modify the wordlist content (must remain authentic)
- Do NOT add any network I/O (must work offline)

**Recommended Agent Profile**:
- **Category**: `quick` - Simple data parsing and module creation
- **Skills**: None needed (straightforward file processing)

**Skills Evaluation**:
- INCLUDED: None (task is straightforward file operations)
- OMITTED: All skills - not needed for this task

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 - Group A
- **Blocks**: Task 1.2 (passphrase generator)
- **Blocked By**: None (can start immediately)

**References**:
- EFF Long List format: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
- Existing crypto patterns: `src/crypto.js:117-144` (Argon2id usage)
- Test patterns: `src/__tests__/encryption.test.ts:1-30`

**Acceptance Criteria**:
- [ ] Wordlist file downloaded and stored at `src/key-manager/eff_large_wordlist.txt`
- [ ] Module created at `src/key-manager/wordlist.js`
- [ ] `getWordList()` returns Array of 7776 strings
- [ ] `getWordCount()` returns 7776
- [ ] `getWordByIndex(0)` returns first word, `getWordByIndex(7775)` returns last word
- [ ] Unit test: `bun test src/__tests__/key-manager/wordlist.test.ts` passes

**Commit**: YES (Task 1.1)
- Message: `feat(key-manager): add EFF Long List wordlist module`
- Files: `src/key-manager/wordlist.js`, `src/key-manager/eff_large_wordlist.txt`
- Pre-commit: `bun test src/__tests__/key-manager/wordlist.test.ts`

---

#### Task 1.2: Passphrase Generator

**What to do**:
1. Create `src/key-manager/passphrase.js` module
2. Import wordlist module from Task 1.1
3. Implement cryptographically secure random selection:
   - Use `crypto.getRandomValues()` for CSPRNG (NOT Math.random())
   - Generate 6 random indices (0-7775)
   - Map indices to words
4. Implement passphrase formatting options:
   - Space-separated (default): "word1 word2 word3 word4 word5 word6"
   - Hyphen-separated: "word1-word2-word3-word4-word5-word6"
   - No separator: "word1word2word3word4word5word6"
5. Calculate and expose entropy: 6 × log₂(7776) ≈ 77.5 bits
6. Export functions: `generatePassphrase(options)`, `calculateEntropy(wordCount)`, `getDefaultWordCount()`

**Must NOT do**:
- Do NOT use Math.random() (insecure, predictable)
- Do NOT use Date-based randomness (predictable)
- Do NOT default to less than 6 words (insufficient entropy)
- Do NOT include capitalization options (EFF words are lowercase only)
- Do NOT include number/symbol substitution (breaks memorability)

**Recommended Agent Profile**:
- **Category**: `unspecified-low` - Moderate complexity with crypto requirements
- **Skills**: None needed (uses standard Web Crypto API)

**Skills Evaluation**:
- INCLUDED: None
- OMITTED: All - straightforward implementation

**Parallelization**:
- **Can Run In Parallel**: YES (with Wave 1 tasks except 1.1)
- **Parallel Group**: Wave 1 - Group A
- **Blocks**: Task 2.1 (UI components need passphrase generation)
- **Blocked By**: Task 1.1 (needs wordlist)

**References**:
- Wordlist module: `src/key-manager/wordlist.js` (Task 1.1)
- CSPRNG usage: `src/crypto.js:147-150` (generateSalt uses crypto)
- EFF recommendations: https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/passphrase.js`
- [ ] `generatePassphrase()` returns 6 space-separated words by default
- [ ] Each call produces different passphrases (non-deterministic)
- [ ] `generatePassphrase({separator: '-'})` returns hyphen-separated
- [ ] `calculateEntropy(6)` returns ~77.5
- [ ] Uses `crypto.getRandomValues()` for randomness
- [ ] Unit test: `bun test src/__tests__/key-manager/passphrase.test.ts` passes with 100% coverage

**Commit**: YES (Task 1.2)
- Message: `feat(key-manager): implement secure passphrase generator`
- Files: `src/key-manager/passphrase.js`
- Pre-commit: `bun test src/__tests__/key-manager/passphrase.test.ts`

---

#### Task 1.3: Master Password Cryptography

**What to do**:
1. Create `src/key-manager/master-crypto.js` module
2. Implement master password to encryption key derivation:
   - Algorithm: Argon2id (via libsodium crypto_pwhash)
   - Parameters: opslimit=3 (MODERATE), memlimit=256 MiB, algorithm=Argon2id v1.3
   - Salt: 16 bytes (128 bits), unique per vault
   - Output: 32 bytes (256-bit key for XChaCha20-Poly1305)
3. Implement vault encryption/decryption:
   - Algorithm: XChaCha20-Poly1305 (authenticated encryption)
   - Nonce: 24 bytes (192 bits), unique per encryption
   - Format: versioned binary with metadata
4. Implement secure memory helpers:
   - `secureZeroMemory(buffer)` - overwrite sensitive data
   - Note: JavaScript can't truly zero memory, but we can minimize exposure
5. Export functions: `deriveMasterKey(password, salt)`, `encryptVault(plaintext, masterKey)`, `decryptVault(ciphertext, nonce, masterKey)`, `generateVaultSalt()`

**Must NOT do**:
- Do NOT use AES-256-GCM (existing Encyphrix cipher - vault should use XChaCha20-Poly1305 for variety)
- Do NOT use weak KDF parameters (must use MODERATE or higher)
- Do NOT reuse salts across different vaults
- Do NOT reuse nonces (must be unique per encryption operation)
- Do NOT expose master keys in console.log or error messages

**Recommended Agent Profile**:
- **Category**: `ultrabrain` - Complex crypto implementation requiring expertise
- **Skills**: `typescript-programmer` - Type safety for crypto operations

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - Strong typing for crypto functions, critical for security
- OMITTED: `agent-browser` - Not needed (pure crypto module)
- OMITTED: `frontend-ui-ux` - No UI in this task
- OMITTED: `git-master` - Not a git task

**Parallelization**:
- **Can Run In Parallel**: YES (with Wave 1 tasks except 1.4)
- **Parallel Group**: Wave 1 - Group A
- **Blocks**: Task 1.4 (storage service needs encryption)
- **Blocked By**: None (extends existing crypto patterns)

**References**:
- Argon2id implementation: `src/crypto.js:117-144` (deriveKey function)
- libsodium docs: https://doc.libsodium.org/password_hashing/default_phf
- XChaCha20-Poly1305: https://doc.libsodium.org/secret-key_cryptography/secretbox

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/master-crypto.js`
- [ ] `deriveMasterKey()` produces 32-byte key from password + salt
- [ ] Same password + salt = same key (deterministic)
- [ ] Different salt = different key
- [ ] `encryptVault()` produces ciphertext + nonce
- [ ] `decryptVault()` successfully decrypts what `encryptVault()` produced
- [ ] Wrong master key returns null (not throwing error)
- [ ] Unit test: `bun test src/__tests__/key-manager/master-crypto.test.ts` passes

**Commit**: YES (Task 1.3)
- Message: `feat(key-manager): implement master password encryption with Argon2id`
- Files: `src/key-manager/master-crypto.js`
- Pre-commit: `bun test src/__tests__/key-manager/master-crypto.test.ts`

---

#### Task 1.4: Key Storage Service

**What to do**:
1. Create `src/key-manager/storage.js` module
2. Implement encrypted key vault structure:
   ```typescript
   interface EncryptedVault {
     version: number;              // Format version
     salt: string;                 // Base64-encoded salt
     opslimit: number;             // Argon2 iterations
     memlimit: number;             // Argon2 memory
     algorithm: number;            // Argon2 algorithm ID
     encryptedKeys: string;        // Base64-encoded encrypted keys JSON
     keyNonce: string;             // Base64-encoded nonce for key encryption
     createdAt: number;            // Unix timestamp
     updatedAt: number;            // Unix timestamp
   }
   ```
3. Implement key storage operations:
   - `createVault(masterPassword)` - Create new empty vault
   - `addKey(vault, masterPassword, keyData)` - Add encryption key to vault
   - `getKey(vault, masterPassword, keyId)` - Retrieve specific key
   - `listKeys(vault, masterPassword)` - List all keys (decrypts metadata only)
   - `removeKey(vault, masterPassword, keyId)` - Remove key from vault
   - `changeMasterPassword(vault, oldPassword, newPassword)` - Re-encrypt with new password
4. Implement export/import:
   - `exportVault(vault)` - Returns JSON string (encrypted, only decryptable with master password)
   - `importVault(exportedJson)` - Parse and validate imported vault
5. Use localStorage for persistence (client-side only constraint):
   - `saveVaultToStorage(vault)` - Save to localStorage
   - `loadVaultFromStorage()` - Load from localStorage
   - Handle storage quota exceeded errors gracefully

**Must NOT do**:
- Do NOT store keys in plaintext (must always be encrypted)
- Do NOT store master password (only derive key from it)
- Do NOT allow export of unencrypted keys (violates security model)
- Do NOT use external storage (cloud, servers - must be client-side only)
- Do NOT store vault in cookies (insecure, sent with every request)

**Recommended Agent Profile**:
- **Category**: `unspecified-high` - High complexity service with multiple operations
- **Skills**: `typescript-programmer` - Type safety for storage operations

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - Critical for type-safe storage operations
- OMITTED: `agent-browser` - localStorage is basic, no complex browser automation
- OMITTED: `frontend-ui-ux` - Service layer, no UI

**Parallelization**:
- **Can Run In Parallel**: YES (after Task 1.3 starts)
- **Parallel Group**: Wave 1 - Group B (needs 1.3)
- **Blocks**: Tasks 2.1, 2.3, 2.4, 3.2 (all need storage)
- **Blocked By**: Task 1.3 (needs master crypto), Task 1.5 (needs types)

**References**:
- Master crypto module: `src/key-manager/master-crypto.js` (Task 1.3)
- Types module: `src/key-manager/types.ts` (Task 1.5)
- localStorage API: Standard Web Storage API

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/storage.js`
- [ ] `createVault()` creates vault with unique salt
- [ ] `addKey()` successfully adds key (vault re-encrypted)
- [ ] `getKey()` returns decrypted key with correct master password
- [ ] `getKey()` returns null with wrong master password
- [ ] `listKeys()` returns key metadata without full key material
- [ ] `exportVault()` produces valid JSON string
- [ ] `importVault()` successfully parses exported JSON
- [ ] `saveVaultToStorage()` persists to localStorage
- [ ] `loadVaultFromStorage()` retrieves from localStorage
- [ ] Unit test: `bun test src/__tests__/key-manager/storage.test.ts` passes with >90% coverage

**Commit**: YES (Task 1.4)
- Message: `feat(key-manager): implement encrypted key storage service`
- Files: `src/key-manager/storage.js`
- Pre-commit: `bun test src/__tests__/key-manager/storage.test.ts`

---

#### Task 1.5: Key Model and Type Definitions

**What to do**:
1. Create `src/key-manager/types.ts` TypeScript definitions
2. Define core types:
   ```typescript
   interface EncryptionKey {
     id: string;                   // UUID v4
     name: string;                 // User-friendly name
     keyData: Uint8Array;          // Raw 256-bit key material
     createdAt: number;            // Unix timestamp
     keyType: 'aes-256-gcm' | 'chacha20-poly1305';  // Algorithm
     metadata?: Record<string, unknown>;  // Optional extensible metadata
   }

   interface StoredKeyMetadata {
     id: string;
     name: string;
     keyType: string;
     createdAt: number;
     hasKeyData: boolean;          // True if full key stored, false if external
   }

   interface PassphraseOptions {
     wordCount?: number;           // Default 6
     separator?: 'space' | 'hyphen' | 'none';
     includeNumbers?: boolean;     // Add random digits
   }

   type KeyManagerMode = 'generate' | 'manual' | 'import';
   ```
3. Define vault types (see Task 1.4 interface)
4. Define export types for type-safe imports across modules
5. Add JSDoc comments for all types
6. Create index barrel export: `src/key-manager/index.ts`

**Must NOT do**:
- Do NOT use `any` type (must be strictly typed)
- Do NOT expose key material in type definitions beyond necessary
- Do NOT create circular type dependencies

**Recommended Agent Profile**:
- **Category**: `quick` - Type definitions are straightforward
- **Skills**: `typescript-programmer` - Strong TypeScript type definitions

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - Expert-level TypeScript type definitions
- OMITTED: All others - not applicable

**Parallelization**:
- **Can Run In Parallel**: YES (with all Wave 1 tasks)
- **Parallel Group**: Wave 1 - Group A
- **Blocks**: Tasks 1.4, 2.1, 2.2, 2.3 (all need types)
- **Blocked By**: None (can start immediately)

**References**:
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Existing types: `src/__tests__/encryption.test.ts:9-13` (global window type)

**Acceptance Criteria**:
- [ ] File created at `src/key-manager/types.ts`
- [ ] All 4 interfaces defined with proper types
- [ ] `EncryptionKey.keyData` is `Uint8Array` (not string)
- [ ] Barrel export created at `src/key-manager/index.ts`
- [ ] TypeScript compiles without errors: `bun tsc --noEmit`
- [ ] Types can be imported: `import { EncryptionKey } from './key-manager/types'`

**Commit**: YES (Task 1.5)
- Message: `feat(key-manager): add TypeScript type definitions`
- Files: `src/key-manager/types.ts`, `src/key-manager/index.ts`
- Pre-commit: `bun tsc --noEmit`

---

### WAVE 2: INTEGRATION

---

#### Task 2.1: Key Manager UI Components

**What to do**:
1. Create `src/key-manager/ui/generator.js` module
2. Implement passphrase generation UI component:
   - Generate button with visual feedback
   - Display generated passphrase with copy button
   - Show entropy indicator (77.5 bits for 6 words)
   - Word count selector (4-8 words, default 6)
   - Separator selector (space/hyphen/none)
   - Regenerate button
3. Implement master password input component:
   - Password strength meter (reuse existing from password-strength.js)
   - Show/hide toggle
   - Confirm password field for creation
   - Warning if password is weak (< score 3)
4. Implement key save dialog:
   - Key name input
   - Preview of key (masked)
   - Confirmation buttons
5. Follow existing Encyphrix UI patterns:
   - CSS variables from `index.html:16-41`
   - Card-based layout
   - Electric green accent (#00ff88)
   - Monospace typography

**Must NOT do**:
- Do NOT create separate HTML file (must integrate into existing index.html)
- Do NOT use external CSS frameworks (violates zero-network CSP)
- Do NOT display full key material in plaintext (always mask)
- Do NOT allow weak master passwords without warning
- Do NOT store generated keys automatically (user must explicitly save)

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - UI components requiring design implementation
- **Skills**: `frontend-ui-ux` - Stunning UI/UX implementation, `typescript-programmer` - Type safety

**Skills Evaluation**:
- INCLUDED: `frontend-ui-ux` - Critical for matching Encyphrix's high-quality UI
- INCLUDED: `typescript-programmer` - Type-safe DOM manipulation
- OMITTED: `agent-browser` - Pure UI creation, no automation needed
- OMITTED: `git-master` - Not a git operation

**Parallelization**:
- **Can Run In Parallel**: YES (with 2.2, 2.3, 2.4)
- **Parallel Group**: Wave 2 - Group A
- **Blocks**: Task 2.5 (integration needs all UI components)
- **Blocked By**: Tasks 1.2, 1.4, 1.5 (needs passphrase, storage, types)

**References**:
- Passphrase module: `src/key-manager/passphrase.js` (Task 1.2)
- Storage module: `src/key-manager/storage.js` (Task 1.4)
- Types: `src/key-manager/types.ts` (Task 1.5)
- UI patterns: `src/index.html:1-200` (existing CSS and structure)
- Password strength: `src/password-strength.js` (existing analyzer)

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/ui/generator.js`
- [ ] Generates 6-word passphrase on button click
- [ ] Displays ~77.5 bits entropy indicator
- [ ] Copy button copies passphrase to clipboard
- [ ] Master password strength meter shows score
- [ ] Warning shown if password score < 3
- [ ] Save dialog allows naming the key
- [ ] UI matches Encyphrix dark theme styling
- [ ] Unit test: `bun test src/__tests__/key-manager/ui-generator.test.ts` passes

**Commit**: YES (Task 2.1)
- Message: `feat(key-manager): add key generation UI components`
- Files: `src/key-manager/ui/generator.js`
- Pre-commit: `bun test src/__tests__/key-manager/ui-generator.test.ts`

---

#### Task 2.2: Manual Entry UI

**What to do**:
1. Create `src/key-manager/ui/manual-entry.js` module
2. Implement manual key input component:
   - Text area for entering custom key
   - Key format validation (must be 256-bit for AES-256-GCM)
   - Accept formats: hex (64 chars), base64 (44 chars), or raw string
   - Strength indicator for custom keys
   - Paste from clipboard button
3. Implement key conversion utilities:
   - `hexToBytes(hex)` - Convert hex string to Uint8Array
   - `base64ToBytes(b64)` - Convert base64 to Uint8Array
   - `validateKeyMaterial(data)` - Check length and format
4. Implement save flow (similar to generator):
   - Key name input
   - Preview (masked)
   - Confirmation
5. Provide option to NOT save (use once):
   - Checkbox: "Don't save, use for this session only"

**Must NOT do**:
- Do NOT accept keys shorter than 256 bits (weak security)
- Do NOT accept weak passwords as keys (must be random/strong)
- Do NOT auto-save without confirmation
- Do NOT store plaintext keys in memory longer than necessary

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - UI component implementation
- **Skills**: `frontend-ui-ux` - Consistent UI with existing design

**Skills Evaluation**:
- INCLUDED: `frontend-ui-ux` - Match existing Encyphrix aesthetic
- INCLUDED: `typescript-programmer` - Type-safe key handling
- OMITTED: `agent-browser` - No automation in this task

**Parallelization**:
- **Can Run In Parallel**: YES (with 2.1, 2.3, 2.4)
- **Parallel Group**: Wave 2 - Group A
- **Blocks**: Task 2.5 (integration needs this component)
- **Blocked By**: Task 1.5 (needs types)

**References**:
- Types: `src/key-manager/types.ts` (Task 1.5)
- UI patterns: `src/index.html` (existing styling)
- Key validation: `src/crypto.js:117-144` (key derivation patterns)

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/ui/manual-entry.js`
- [ ] Accepts 64-char hex, 44-char base64, or 32+ char string
- [ ] Validates key length (must be 32 bytes = 256 bits)
- [ ] Shows error for invalid format
- [ ] Strength indicator for entered keys
- [ ] "Use once" checkbox available
- [ ] UI matches Encyphrix styling
- [ ] Unit test: `bun test src/__tests__/key-manager/manual-entry.test.ts` passes

**Commit**: YES (Task 2.2)
- Message: `feat(key-manager): add manual key entry UI`
- Files: `src/key-manager/ui/manual-entry.js`
- Pre-commit: `bun test src/__tests__/key-manager/manual-entry.test.ts`

---

#### Task 2.3: Key List and Manager View

**What to do**:
1. Create `src/key-manager/ui/key-list.js` module
2. Implement key list view:
   - List all stored keys with names
   - Show created date
   - Show key type (AES-256-GCM icon)
   - Show if key is available or external
3. Implement key management actions:
   - View key details (modal with masked key + reveal button)
   - Copy key to clipboard (with confirmation)
   - Rename key
   - Delete key (with confirmation dialog)
   - Set as default key for encryption
4. Implement master password unlock:
   - Locked state: show "Unlock Key Manager" button
   - Password prompt when unlocking
   - Remember for session (optional, memory only)
5. Empty state design:
   - Illustration/message when no keys stored
   - Call-to-action to generate or import

**Must NOT do**:
- Do NOT display keys in plaintext by default (always mask first)
- Do NOT allow deleting all keys without confirmation
- Do NOT persist master password (session only)
- Do NOT show keys without unlocking vault first

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - Complex UI with multiple states
- **Skills**: `frontend-ui-ux` - High-quality list UI design

**Skills Evaluation**:
- INCLUDED: `frontend-ui-ux` - Critical for good list UX
- INCLUDED: `typescript-programmer` - Type-safe list operations
- OMITTED: `agent-browser` - No browser automation needed

**Parallelization**:
- **Can Run In Parallel**: YES (with 2.1, 2.2, 2.4)
- **Parallel Group**: Wave 2 - Group A
- **Blocks**: Task 2.5 (integration needs this component)
- **Blocked By**: Tasks 1.4, 1.5 (needs storage service and types)

**References**:
- Storage module: `src/key-manager/storage.js` (Task 1.4)
- Types: `src/key-manager/types.ts` (Task 1.5)
- UI patterns: `src/index.html` (card, list, modal patterns)

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/ui/key-list.js`
- [ ] Shows list of stored keys with names
- [ ] Locked state requires master password to unlock
- [ ] Key details modal masks key by default
- [ ] Reveal button shows plaintext temporarily
- [ ] Copy button copies key to clipboard
- [ ] Delete with confirmation
- [ ] Set default key functionality
- [ ] Empty state with CTA
- [ ] Unit test: `bun test src/__tests__/key-manager/key-list.test.ts` passes

**Commit**: YES (Task 2.3)
- Message: `feat(key-manager): add key list and manager view`
- Files: `src/key-manager/ui/key-list.js`
- Pre-commit: `bun test src/__tests__/key-manager/key-list.test.ts`

---

#### Task 2.4: Export and Import UI

**What to do**:
1. Create `src/key-manager/ui/export-import.js` module
2. Implement export functionality:
   - "Export Key Vault" button
   - Warning dialog about keeping export secure
   - Downloads encrypted vault as JSON file
   - Filename: `encyphrix-vault-YYYY-MM-DD.json`
   - Show export date and key count
3. Implement import functionality:
   - "Import Key Vault" button
   - File picker (accepts .json)
   - Parse and validate imported vault
   - Master password prompt to decrypt and verify
   - Conflict resolution if keys already exist:
     - Option: Merge (add new keys)
     - Option: Replace (overwrite existing)
     - Option: Cancel
4. Show import summary:
   - Number of keys imported
   - Any errors or skipped keys

**Must NOT do**:
- Do NOT allow export of unencrypted keys (must be encrypted vault only)
- Do NOT accept plaintext key files (security violation)
- Do NOT auto-overwrite on import (must ask user)
- Do NOT store imported vault without validation

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - Dialog and file handling UI
- **Skills**: `frontend-ui-ux` - Dialog design and UX flow

**Skills Evaluation**:
- INCLUDED: `frontend-ui-ux` - Important for import/export UX
- INCLUDED: `typescript-programmer` - Type-safe file handling
- OMITTED: `agent-browser` - File picker is native API

**Parallelization**:
- **Can Run In Parallel**: YES (with 2.1, 2.2, 2.3)
- **Parallel Group**: Wave 2 - Group A
- **Blocks**: Task 2.5 (integration needs this component)
- **Blocked By**: Task 1.4 (needs storage service)

**References**:
- Storage module: `src/key-manager/storage.js` (Task 1.4)
- Export function: `src/key-manager/storage.js:exportVault()`
- Import function: `src/key-manager/storage.js:importVault()`

**Acceptance Criteria**:
- [ ] Module created at `src/key-manager/ui/export-import.js`
- [ ] Export downloads encrypted JSON file
- [ ] Import accepts JSON file picker
- [ ] Master password required to decrypt imported vault
- [ ] Conflict resolution dialog for existing keys
- [ ] Import summary shown after completion
- [ ] Unit test: `bun test src/__tests__/key-manager/export-import.test.ts` passes

**Commit**: YES (Task 2.4)
- Message: `feat(key-manager): add encrypted vault export/import UI`
- Files: `src/key-manager/ui/export-import.js`
- Pre-commit: `bun test src/__tests__/key-manager/export-import.test.ts`

---

#### Task 2.5: Main UI Integration

**What to do**:
1. Modify `src/index.html` to add Key Manager section:
   - Add "Key Manager" tab/card alongside Encrypt/Decrypt
   - Or integrate into existing sections as key source
   - Decision: Add as third main section (Encrypt | Decrypt | Key Manager)
2. Integrate all UI components:
   - Import generator.js, manual-entry.js, key-list.js, export-import.js
   - Wire up event handlers
   - Connect to storage service
3. Add mode toggle in encryption section:
   - "Use Key Manager" vs "Enter Password Manually"
   - When using key manager: show key selector dropdown
   - When manual: show password input (existing)
4. Update decryption section:
   - Same toggle: "Use Key Manager" vs "Enter Password"
   - Key selector when using key manager
5. Ensure CSP compliance:
   - No inline event handlers (use addEventListener)
   - No external resources
   - All code in existing script or modules
6. Responsive design:
   - Mobile-friendly layout
   - Stack columns on narrow screens

**Must NOT do**:
- Do NOT break existing encrypt/decrypt functionality
- Do NOT add inline scripts (violates CSP)
- Do NOT modify CSP meta tag without security review
- Do NOT remove manual password option (must coexist)
- Do NOT change default behavior (manual password is default)

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - Complex UI integration
- **Skills**: `frontend-ui-ux` - Seamless integration design, `typescript-programmer` - Type-safe integration

**Skills Evaluation**:
- INCLUDED: `frontend-ui-ux` - Critical for cohesive integration
- INCLUDED: `typescript-programmer` - Type-safe module integration
- OMITTED: `agent-browser` - Manual integration, no automation
- OMITTED: `git-master` - Not a git task

**Parallelization**:
- **Can Run In Parallel**: NO (must wait for all Wave 2 Group A)
- **Parallel Group**: Wave 2 - Group B (sequential, final)
- **Blocks**: Tasks 3.4, 4.2 (need full UI for E2E tests and docs)
- **Blocked By**: Tasks 2.1, 2.2, 2.3, 2.4 (all UI components)

**References**:
- All UI modules: `src/key-manager/ui/*.js` (Tasks 2.1-2.4)
- Storage: `src/key-manager/storage.js` (Task 1.4)
- Existing UI: `src/index.html` (full file)

**Acceptance Criteria**:
- [ ] Key Manager section added to index.html
- [ ] Toggle between "Use Key Manager" and "Manual Password" in Encrypt section
- [ ] Key selector dropdown populates from stored keys
- [ ] Same toggle and selector in Decrypt section
- [ ] All existing tests still pass: `bun test`
- [ ] E2E tests pass: `bun run test:e2e`
- [ ] No CSP violations in browser console
- [ ] Responsive layout works on mobile (test via DevTools)
- [ ] Manual password mode still works (backward compatibility)

**Commit**: YES (Task 2.5)
- Message: `feat(key-manager): integrate key manager into main UI`
- Files: `src/index.html`
- Pre-commit: `bun test && bun run test:e2e`

---

### WAVE 3: TESTING

---

#### Task 3.1: Unit Tests - Crypto Modules

**What to do**:
1. Create `src/__tests__/key-manager/wordlist.test.ts`:
   - Test wordlist loads correctly (7776 words)
   - Test getWordByIndex for boundary values (0, 7775)
   - Test wordlist integrity (no duplicates, all lowercase)
2. Create `src/__tests__/key-manager/passphrase.test.ts`:
   - Test passphrase generation produces 6 words by default
   - Test entropy calculation (~77.5 bits for 6 words)
   - Test different separators work
   - Test cryptographically secure randomness (distribution test)
   - Test word count options (4, 5, 6, 7, 8 words)
3. Create `src/__tests__/key-manager/master-crypto.test.ts`:
   - Test key derivation (same password + salt = same key)
   - Test different salts produce different keys
   - Test vault encryption roundtrip
   - Test decryption fails with wrong key (returns null)
   - Test Argon2id parameters (opslimit, memlimit)
4. Use existing test patterns from `src/__tests__/encryption.test.ts`

**Must NOT do**:
- Do NOT mock crypto.getRandomValues() (test real randomness)
- Do NOT skip edge cases (empty passwords, unicode, etc.)
- Do NOT test with weak parameters (use production settings)

**Recommended Agent Profile**:
- **Category**: `unspecified-low` - Test writing is moderate complexity
- **Skills**: `typescript-programmer` - Type-safe test implementation

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - TypeScript testing patterns
- OMITTED: All others - pure testing task

**Parallelization**:
- **Can Run In Parallel**: YES (with 3.2, 3.3)
- **Parallel Group**: Wave 3 - Group A
- **Blocks**: None
- **Blocked By**: Tasks 1.1, 1.2, 1.3 (tests for these modules)

**References**:
- Modules: `src/key-manager/wordlist.js`, `passphrase.js`, `master-crypto.js`
- Test patterns: `src/__tests__/encryption.test.ts`
- Bun test docs: https://bun.sh/docs/cli/test

**Acceptance Criteria**:
- [ ] `src/__tests__/key-manager/wordlist.test.ts` created with >5 test cases
- [ ] `src/__tests__/key-manager/passphrase.test.ts` created with >8 test cases
- [ ] `src/__tests__/key-manager/master-crypto.test.ts` created with >8 test cases
- [ ] All tests pass: `bun test src/__tests__/key-manager/`
- [ ] Code coverage >90% for crypto modules
- [ ] Tests run in <5 seconds

**Commit**: YES (Task 3.1)
- Message: `test(key-manager): add unit tests for crypto modules`
- Files: `src/__tests__/key-manager/*.test.ts`
- Pre-commit: `bun test src/__tests__/key-manager/`

---

#### Task 3.2: Unit Tests - Storage Service

**What to do**:
1. Create `src/__tests__/key-manager/storage.test.ts`:
2. Test vault creation:
   - Creates vault with unique salt
   - Generates correct metadata (timestamps, version)
3. Test key operations:
   - Add key increases key count
   - Get key returns correct key with master password
   - Get key returns null with wrong password
   - List keys returns metadata only
   - Remove key decreases key count
4. Test export/import:
   - Export produces valid JSON
   - Import restores vault correctly
   - Import with wrong password fails gracefully
5. Test localStorage integration:
   - Save to localStorage persists
   - Load from localStorage retrieves
   - Handle storage quota exceeded
6. Test edge cases:
   - Empty vault operations
   - Duplicate key names
   - Very long key names
   - Special characters in names

**Must NOT do**:
- Do NOT mock localStorage unless necessary (use real API in Bun)
- Do NOT use real passwords in tests (use test fixtures)
- Do NOT skip cleanup (clear test data from localStorage)

**Recommended Agent Profile**:
- **Category**: `unspecified-low` - Test implementation
- **Skills**: `typescript-programmer` - TypeScript testing

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - Type-safe storage tests
- OMITTED: All others - pure testing task

**Parallelization**:
- **Can Run In Parallel**: YES (with 3.1, 3.3)
- **Parallel Group**: Wave 3 - Group A
- **Blocks**: None
- **Blocked By**: Task 1.4 (tests storage service)

**References**:
- Storage module: `src/key-manager/storage.js` (Task 1.4)
- Test patterns: `src/__tests__/integration.test.ts`

**Acceptance Criteria**:
- [ ] `src/__tests__/key-manager/storage.test.ts` created with >12 test cases
- [ ] Tests cover all storage operations
- [ ] All tests pass: `bun test src/__tests__/key-manager/storage.test.ts`
- [ ] Code coverage >85% for storage module
- [ ] Tests clean up localStorage after running

**Commit**: YES (Task 3.2)
- Message: `test(key-manager): add unit tests for storage service`
- Files: `src/__tests__/key-manager/storage.test.ts`
- Pre-commit: `bun test src/__tests__/key-manager/storage.test.ts`

---

#### Task 3.3: Unit Tests - UI Components

**What to do**:
1. Create `src/__tests__/key-manager/ui-generator.test.ts`:
   - Test passphrase display updates on generation
   - Test copy button functionality
   - Test entropy indicator accuracy
   - Test word count selector changes output
2. Create `src/__tests__/key-manager/manual-entry.test.ts`:
   - Test key format validation
   - Test hex/base64 parsing
   - Test validation error messages
3. Create `src/__tests__/key-manager/key-list.test.ts`:
   - Test locked/unlocked state rendering
   - Test key list display
   - Test delete confirmation
4. Use JSDOM or Bun's DOM testing capabilities

**Must NOT do**:
- Do NOT test actual browser rendering (test logic only)
- Do NOT test CSS styling (not functional)
- Do NOT skip event handler testing

**Recommended Agent Profile**:
- **Category**: `quick` - UI logic testing is straightforward
- **Skills**: `typescript-programmer` - TypeScript testing

**Skills Evaluation**:
- INCLUDED: `typescript-programmer` - Type-safe UI tests
- OMITTED: `agent-browser` - Unit tests, not E2E

**Parallelization**:
- **Can Run In Parallel**: YES (with 3.1, 3.2)
- **Parallel Group**: Wave 3 - Group A
- **Blocks**: None
- **Blocked By**: Tasks 2.1, 2.2, 2.3 (tests for these modules)

**References**:
- UI modules: `src/key-manager/ui/*.js` (Tasks 2.1-2.3)
- Bun DOM testing: https://bun.sh/docs/test/dom

**Acceptance Criteria**:
- [ ] `src/__tests__/key-manager/ui-generator.test.ts` created
- [ ] `src/__tests__/key-manager/manual-entry.test.ts` created
- [ ] `src/__tests__/key-manager/key-list.test.ts` created
- [ ] All tests pass: `bun test src/__tests__/key-manager/ui-*.test.ts`
- [ ] Tests cover component state and event handling

**Commit**: YES (Task 3.3)
- Message: `test(key-manager): add unit tests for UI components`
- Files: `src/__tests__/key-manager/ui-*.test.ts`
- Pre-commit: `bun test src/__tests__/key-manager/ui-*.test.ts`

---

#### Task 3.4: E2E Tests - Full Workflows

**What to do**:
1. Create `e2e/key-manager.spec.ts`:
2. Test complete user workflows:
   - **Workflow 1**: Generate key → Save to vault → Use for encryption → Decrypt with same key
   - **Workflow 2**: Manual key entry → Use once (don't save) → Encryption/Decryption
   - **Workflow 3**: Create vault → Add multiple keys → Export vault → Clear storage → Import vault → Verify keys restored
   - **Workflow 4**: Wrong master password → Access denied → Correct password → Access granted
3. Use Playwright for browser automation:
   - Navigate to app
   - Click buttons
   - Fill inputs
   - Verify outcomes
4. Test error scenarios:
   - Wrong master password on unlock
   - Import corrupted vault file
   - Storage quota exceeded

**Must NOT do**:
- Do NOT use real user data in tests
- Do NOT skip cleanup between tests (isolation)
- Do NOT test with mocked crypto (use real encryption)

**Recommended Agent Profile**:
- **Category**: `unspecified-low` - E2E testing is moderate complexity
- **Skills**: `agent-browser` - Browser automation via Playwright

**Skills Evaluation**:
- INCLUDED: `agent-browser` - Critical for E2E browser automation
- INCLUDED: `typescript-programmer` - TypeScript E2E tests
- OMITTED: `frontend-ui-ux` - Testing, not designing
- OMITTED: `git-master` - Not a git task

**Parallelization**:
- **Can Run In Parallel**: NO (must wait for Wave 3 Group A)
- **Parallel Group**: Wave 3 - Group B (sequential, final)
- **Blocks**: None
- **Blocked By**: Tasks 2.5, 3.1, 3.2, 3.3 (needs full implementation and unit tests)

**References**:
- E2E patterns: `e2e/ui.test.ts`, `e2e/offline.spec.ts`
- Playwright docs: https://playwright.dev/docs/intro
- Full UI: `src/index.html` (Task 2.5)

**Acceptance Criteria**:
- [ ] `e2e/key-manager.spec.ts` created with 4+ workflow tests
- [ ] Tests use Playwright for browser automation
- [ ] All E2E tests pass: `bun run test:e2e`
- [ ] Tests cover success and error scenarios
- [ ] Tests isolated (no state leakage between tests)
- [ ] Tests clean up after completion

**Commit**: YES (Task 3.4)
- Message: `test(key-manager): add E2E tests for complete workflows`
- Files: `e2e/key-manager.spec.ts`
- Pre-commit: `bun run test:e2e`

---

### WAVE 4: DOCUMENTATION

---

#### Task 4.1: Developer Documentation

**What to do**:
1. Create `docs/key-manager/implementation.md`:
   - Architecture overview (diagram if helpful)
   - Module descriptions (wordlist, passphrase, crypto, storage, UI)
   - Data flow (encrypt/decrypt with key manager)
   - Security considerations
   - Extension points for future features
2. Document each module:
   - Purpose and responsibilities
   - Public API (functions, parameters, return types)
   - Dependencies
   - Testing approach
3. Include code examples:
   - Creating a vault
   - Adding a key
   - Encrypting with stored key
4. Document build/development:
   - How to run tests
   - How to add new key types
   - How to modify encryption parameters

**Must NOT do**:
- Do NOT document internal/private functions (maintainability burden)
- Do NOT duplicate TypeScript type definitions (link to types.ts)
- Do NOT skip security documentation (critical for crypto)

**Recommended Agent Profile**:
- **Category**: `writing` - Technical documentation
- **Skills**: None needed (straightforward documentation)

**Skills Evaluation**:
- INCLUDED: None
- OMITTED: All - documentation task

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.2, 4.3)
- **Parallel Group**: Wave 4 - All parallel
- **Blocks**: None
- **Blocked By**: All implementation tasks (1.1-2.5, 3.1-3.3)

**References**:
- All implementation files in `src/key-manager/`
- Existing docs: `docs/architecture.md`, `docs/security.md`

**Acceptance Criteria**:
- [ ] `docs/key-manager/implementation.md` created
- [ ] Documents all 5 foundation modules
- [ ] Documents all 4 UI components
- [ ] Includes architecture diagram or description
- [ ] Includes security considerations section
- [ ] Code examples are tested and working
- [ ] Links to relevant source files

**Commit**: YES (Task 4.1)
- Message: `docs(key-manager): add developer implementation documentation`
- Files: `docs/key-manager/implementation.md`
- Pre-commit: N/A (documentation only)

---

#### Task 4.2: User Documentation

**What to do**:
1. Create `docs/key-manager/user-guide.md`:
2. Write "Getting Started" section:
   - Creating your first key vault
   - Generating your first passphrase
   - Using a stored key for encryption
3. Document all features:
   - **Key Generation**: How to generate strong passphrases
   - **Manual Entry**: How to use your own keys
   - **Key Management**: How to view, copy, rename, delete keys
   - **Export/Import**: How to backup and restore your vault
4. Include security best practices:
   - Choosing a strong master password
   - Keeping your vault export safe
   - When to use manual entry vs generated keys
5. Add troubleshooting section:
   - Forgot master password (recovery not possible)
   - Vault won't unlock
   - Import fails
6. Include screenshots (if possible) or detailed UI descriptions

**Must NOT do**:
- Do NOT make security guarantees we can't keep (be honest)
- Do NOT skip the "forgot password" section (critical user question)
- Do NOT use technical jargon without explanation

**Recommended Agent Profile**:
- **Category**: `writing` - User-facing documentation
- **Skills**: None needed (documentation task)

**Skills Evaluation**:
- INCLUDED: None
- OMITTED: All - documentation task

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.1, 4.3)
- **Parallel Group**: Wave 4 - All parallel
- **Blocks**: None
- **Blocked By**: Task 2.5 (needs complete UI to document)

**References**:
- Full UI: `src/index.html` (Task 2.5)
- Existing user docs: `README.md` (usage section)
- EFF passphrase guide: https://www.eff.org/dice

**Acceptance Criteria**:
- [ ] `docs/key-manager/user-guide.md` created
- [ ] Getting Started section covers basic workflow
- [ ] All 4 major features documented
- [ ] Security best practices included
- [ ] Troubleshooting section covers common issues
- [ ] Language is accessible to non-technical users
- [ ] Honest about limitations (no password recovery)

**Commit**: YES (Task 4.2)
- Message: `docs(key-manager): add user guide documentation`
- Files: `docs/key-manager/user-guide.md`
- Pre-commit: N/A (documentation only)

---

#### Task 4.3: Security Documentation

**What to do**:
1. Create `docs/key-manager/security.md`:
2. Document threat model:
   - What the key manager protects against
   - What it cannot protect against
3. Document cryptography:
   - Argon2id parameters and rationale (256 MiB, 3 iterations)
   - XChaCha20-Poly1305 encryption
   - Salt and nonce handling
   - Key derivation flow
4. Document security properties:
   - Master password never stored
   - Keys only in memory when unlocked
   - Encrypted at rest in localStorage
   - No network exposure
5. Document attack scenarios and mitigations:
   - Brute force attacks (slow KDF)
   - Local storage theft (encrypted)
   - Memory dumps (keys only when unlocked)
   - XSS attacks (mitigated by CSP)
6. Include security audit checklist
7. Reference external standards:
   - OWASP recommendations
   - NIST guidelines
   - libsodium best practices

**Must NOT do**:
- Do NOT make absolute security claims ("unbreakable", "military-grade")
- Do NOT omit limitations (honest security model)
- Do NOT skip threat model (essential for understanding)

**Recommended Agent Profile**:
- **Category**: `writing` - Security documentation requires precision
- **Skills**: None needed (documentation based on research)

**Skills Evaluation**:
- INCLUDED: None
- OMITTED: All - documentation task

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.1, 4.2)
- **Parallel Group**: Wave 4 - All parallel
- **Blocks**: None
- **Blocked By**: Tasks 1.3, 1.4 (need crypto implementation details)

**References**:
- Master crypto: `src/key-manager/master-crypto.js` (Task 1.3)
- Storage: `src/key-manager/storage.js` (Task 1.4)
- Research: Argon2id RFC 9106, OWASP guidelines
- Existing security docs: `docs/security.md`

**Acceptance Criteria**:
- [ ] `docs/key-manager/security.md` created
- [ ] Threat model clearly defined
- [ ] All cryptographic choices documented with rationale
- [ ] Security properties listed
- [ ] Attack scenarios covered with mitigations
- [ ] Honest limitations section included
- [ ] References to external standards included
- [ ] Security audit checklist provided

**Commit**: YES (Task 4.3)
- Message: `docs(key-manager): add security documentation`
- Files: `docs/key-manager/security.md`
- Pre-commit: N/A (documentation only)

---

## Commit Strategy

### Wave 1 Commits (Foundation)
| Task | Commit Message | Files |
|------|----------------|-------|
| 1.1 | `feat(key-manager): add EFF Long List wordlist module` | `src/key-manager/wordlist.js`, `src/key-manager/eff_large_wordlist.txt` |
| 1.2 | `feat(key-manager): implement secure passphrase generator` | `src/key-manager/passphrase.js` |
| 1.3 | `feat(key-manager): implement master password encryption with Argon2id` | `src/key-manager/master-crypto.js` |
| 1.4 | `feat(key-manager): implement encrypted key storage service` | `src/key-manager/storage.js` |
| 1.5 | `feat(key-manager): add TypeScript type definitions` | `src/key-manager/types.ts`, `src/key-manager/index.ts` |

### Wave 2 Commits (Integration)
| Task | Commit Message | Files |
|------|----------------|-------|
| 2.1 | `feat(key-manager): add key generation UI components` | `src/key-manager/ui/generator.js` |
| 2.2 | `feat(key-manager): add manual key entry UI` | `src/key-manager/ui/manual-entry.js` |
| 2.3 | `feat(key-manager): add key list and manager view` | `src/key-manager/ui/key-list.js` |
| 2.4 | `feat(key-manager): add encrypted vault export/import UI` | `src/key-manager/ui/export-import.js` |
| 2.5 | `feat(key-manager): integrate key manager into main UI` | `src/index.html` |

### Wave 3 Commits (Testing)
| Task | Commit Message | Files |
|------|----------------|-------|
| 3.1 | `test(key-manager): add unit tests for crypto modules` | `src/__tests__/key-manager/*.test.ts` |
| 3.2 | `test(key-manager): add unit tests for storage service` | `src/__tests__/key-manager/storage.test.ts` |
| 3.3 | `test(key-manager): add unit tests for UI components` | `src/__tests__/key-manager/ui-*.test.ts` |
| 3.4 | `test(key-manager): add E2E tests for complete workflows` | `e2e/key-manager.spec.ts` |

### Wave 4 Commits (Documentation)
| Task | Commit Message | Files |
|------|----------------|-------|
| 4.1 | `docs(key-manager): add developer implementation documentation` | `docs/key-manager/implementation.md` |
| 4.2 | `docs(key-manager): add user guide documentation` | `docs/key-manager/user-guide.md` |
| 4.3 | `docs(key-manager): add security documentation` | `docs/key-manager/security.md` |

---

## Success Criteria

### Verification Commands

```bash
# 1. All tests pass
bun test

# 2. E2E tests pass
bun run test:e2e

# 3. TypeScript compiles
bun tsc --noEmit

# 4. No CSP violations in browser
# Open browser DevTools, verify no CSP errors in console

# 5. Manual functionality test
# - Generate 6-word passphrase
# - Save to vault with master password
# - Encrypt message using stored key
# - Decrypt using same key
# - Export vault
# - Import vault in new session
# - Verify all keys present

# 6. Backward compatibility
# - Encrypt with manual password (old way)
# - Decrypt with manual password
# - Verify still works
```

### Final Checklist

- [ ] EFF Long List wordlist integrated (7776 words, ~12.92 bits/word)
- [ ] 6-word passphrase generation working (~77.5 bits entropy)
- [ ] Master password encryption with Argon2id (256 MiB, 3 iterations)
- [ ] Key storage service with encrypted vault
- [ ] Key Manager UI integrated into main interface
- [ ] Manual entry option available
- [ ] Encrypted export/import functionality
- [ ] All unit tests passing (>90% coverage for crypto modules)
- [ ] E2E tests passing (4+ workflows)
- [ ] Developer documentation complete
- [ ] User documentation complete
- [ ] Security documentation complete
- [ ] No CSP violations
- [ ] Responsive on mobile
- [ ] Backward compatible with manual password mode
- [ ] Zero network requests maintained

---

## Category + Skills Summary

| Wave | Task | Category | Skills |
|------|------|----------|--------|
| 1 | 1.1 | `quick` | None |
| 1 | 1.2 | `unspecified-low` | None |
| 1 | 1.3 | `ultrabrain` | `typescript-programmer` |
| 1 | 1.4 | `unspecified-high` | `typescript-programmer` |
| 1 | 1.5 | `quick` | `typescript-programmer` |
| 2 | 2.1 | `visual-engineering` | `frontend-ui-ux`, `typescript-programmer` |
| 2 | 2.2 | `visual-engineering` | `frontend-ui-ux`, `typescript-programmer` |
| 2 | 2.3 | `visual-engineering` | `frontend-ui-ux`, `typescript-programmer` |
| 2 | 2.4 | `visual-engineering` | `frontend-ui-ux`, `typescript-programmer` |
| 2 | 2.5 | `visual-engineering` | `frontend-ui-ux`, `typescript-programmer` |
| 3 | 3.1 | `unspecified-low` | `typescript-programmer` |
| 3 | 3.2 | `unspecified-low` | `typescript-programmer` |
| 3 | 3.3 | `quick` | `typescript-programmer` |
| 3 | 3.4 | `unspecified-low` | `agent-browser`, `typescript-programmer` |
| 4 | 4.1 | `writing` | None |
| 4 | 4.2 | `writing` | None |
| 4 | 4.3 | `writing` | None |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| EFF wordlist too large (~50KB) | Medium | Lazy load or embed as compressed, verify size budget |
| Argon2id 256 MiB too slow on mobile | High | Detect mobile and fallback to 64 MiB with warning |
| localStorage quota exceeded | Medium | Handle gracefully, warn user, suggest export |
| CSP violations from new code | High | Test in browser, use addEventListener (not inline) |
| Breaking existing functionality | Critical | Maintain backward compatibility, manual password default |
| Weak master passwords | High | Strength meter, warnings, enforce minimum length |

---

## Appendix: EFF Long List Details

**Wordlist Source**: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt

**Properties**:
- 7,776 words (6^5, all 5-dice combinations)
- Average length: ~7 characters
- Entropy per word: log₂(7776) ≈ 12.92 bits
- 6 words: 6 × 12.92 = 77.52 bits
- Format: `11111\tabacus\n` (dice number + tab + word + newline)

**Licensing**: Creative Commons Attribution (CC BY)
- Free to use, modify, redistribute
- Attribution recommended

---

*Plan generated by Prometheus - Strategic Planning Consultant*
*For Encyphrix Key Manager Feature - Full Implementation*
