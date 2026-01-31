# Encyphrix Key Manager Feature Implementation Plan

## TL;DR

> **Quick Summary**: Add a secure Key Manager to Encyphrix that generates and stores encryption keys in localStorage with master password protection. Supports both 6-word EFF passphrases and 256-bit random keys.
> 
> **Deliverables**:
> - `src/key-manager.js` - Core module with key generation, storage, and encryption
> - `src/wordlist.js` - EFF Long List word list (7,776 words)
> - `src/index.html` updates - Key selector UI, key manager panel, modals
> - `src/__tests__/key-manager.test.ts` - Unit tests
> - `src/__tests__/key-manager-integration.test.ts` - Integration tests
> - Updated README.md with Key Manager documentation
> 
> **Estimated Effort**: Large (8-10 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Core Module → UI Integration → Integration Tests

---

## Context

### Original Request
Add a Key Manager feature to Encyphrix encryption app with:
1. Key generation (6-word passphrase + 256-bit random)
2. Secure localStorage persistence with master password encryption
3. Password manager-like UI (list, add, delete, select keys)
4. Security warnings about localStorage risks
5. Encrypted export/backup functionality

### Interview Summary
**Key Discussions**:
- **Word List**: EFF Long List (7,776 words) selected for maximum security (~77 bits entropy for 6 words)
- **Master Password**: MUST-HAVE - non-negotiable for security since localStorage is vulnerable
- **UI Approach**: Integrated - key selector dropdown at top of encrypt/decrypt cards, manual entry as fallback
- **Export**: MUST be encrypted with master password - never export plaintext keys
- **Key Naming**: Auto-generate "Key 1", "Key 2", etc. with rename capability
- **Version**: FULL version with master password encryption from day one

### Technical Decisions Confirmed
1. Use existing AES-256-GCM + Argon2id from crypto.js for key encryption
2. Reuse existing format.js serialization pattern for encrypted key storage
3. **Storage: localStorage with master password encryption** (as per requirements)
   - localStorage key: `encyphrix_keys_v1`
   - Keys stored as encrypted JSON blob (master password required to decrypt)
   - Security mitigations: Argon2id hashing, AES-256-GCM encryption, prominent warnings
4. First-time flow: Force master password creation on initial visit

### Security Note on localStorage
While localStorage persistence is required per your specifications, note that:
- Encrypted keys in localStorage are vulnerable to malware/browser extensions
- XSS attacks could potentially exfiltrate the encrypted blob
- Shared computers = key exposure risk
- **Mitigation**: Mandatory master password encryption + prominent security warnings

---

## Work Objectives

### Core Objective
Implement a secure Key Manager that allows users to generate, store, and manage encryption keys in the browser with master password protection, while maintaining the existing manual password entry as a fallback option.

### Concrete Deliverables
1. **key-manager.js module** with:
   - `generatePassphrase()` - 6-word EFF passphrase generation
   - `generateRandomKey()` - 256-bit random key generation  
   - `createMasterPassword()` - Master password setup with confirmation
   - `verifyMasterPassword()` - Master password verification
   - `addKey()` - Add new key to encrypted store
   - `getKey()` - Decrypt and retrieve a specific key
   - `listKeys()` - List all keys (metadata only, no decryption)
   - `deleteKey()` - Remove a key from storage
   - `renameKey()` - Change key name/label
   - `exportKeys()` - Export encrypted backup
   - `importKeys()` - Restore from encrypted backup
   - `hasMasterPassword()` - Check if master password is set
   - `hasKeys()` - Check if any keys exist

2. **wordlist.js module**:
   - EFF Long List (7,776 words)
   - Word validation utilities

3. **UI Updates to index.html**:
   - Key selector dropdown at top of Encrypt/Decrypt cards
   - "Manage Keys" button opening key manager panel
   - Master password creation modal (first-time flow)
   - Key generation modal (passphrase vs random)
   - Key list panel (show/hide)
   - Security warning banner
   - Export/Import UI

4. **Integration with crypto.js**:
   - Use selected key from key manager in encrypt/decrypt operations
   - Auto-fill password field when key selected
   - Manual entry mode as fallback

5. **Tests**:
   - Unit tests for key-manager.js functions
   - Unit tests for wordlist.js
   - Integration tests for full workflow
   - E2E tests for UI interactions

6. **Documentation**:
   - README updates with Key Manager usage
   - Security warnings about localStorage storage
   - Export/backup procedures

### Definition of Done
- [ ] All 211 existing tests pass
- [ ] New tests achieve 80%+ coverage
- [ ] Manual verification: Can generate, save, select, and use keys
- [ ] Master password encryption verified (keys not readable in localStorage)
- [ ] Export/Import roundtrip verified
- [ ] Security warnings displayed prominently
- [ ] No CSP violations
- [ ] No external network requests

### Must Have
- Master password encryption (non-negotiable)
- 6-word EFF passphrase generation
- 256-bit random key generation
- Key CRUD operations (create, read, list, delete, rename)
- Key selection in encrypt/decrypt UI
- Encrypted export/backup
- Security warnings about localStorage
- First-time master password setup flow
- Manual password entry fallback

### Must NOT Have (Guardrails)
- Plaintext key export (security violation)
- Cloud sync or external storage
- Biometric authentication
- Key sharing between devices
- Automatic key rotation
- Multiple master passwords (simplification)
- Browser extension integration

---

## Verification Strategy

### Test Infrastructure Assessment
- **Infrastructure exists**: YES (Bun test framework)
- **User wants tests**: YES (TDD approach for core crypto, tests-after for UI)
- **Framework**: Bun test with TypeScript

### TDD Workflow
Each crypto-related task follows RED-GREEN-REFACTOR:
1. Write failing test first
2. Implement minimum to pass
3. Refactor while keeping green

### Automated Verification (Agent-Executable)

**For Key Manager Module** (using Bun test):
```bash
# Run unit tests
bun test src/__tests__/key-manager.test.ts

# Expected: All tests pass with 80%+ coverage
```

**For Integration** (using Bun test):
```bash
# Run integration tests
bun test src/__tests__/key-manager-integration.test.ts

# Expected: Full encrypt/decrypt workflow with keys
```

**For UI Changes** (using Playwright):
```bash
# Serve app locally
bun run serve &

# Run E2E tests
bun run test:e2e

# Expected: All E2E tests pass
```

**Manual Verification Steps**:
1. Open app in browser
2. Create master password on first visit
3. Generate a passphrase key
4. Generate a random key
5. Encrypt message using saved key
6. Decrypt using same key
7. Verify keys are encrypted in localStorage (DevTools → Application → Local Storage)
8. Export keys to file
9. Clear localStorage
10. Import keys from file
11. Verify keys work again

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Can Start Immediately):
├── Task 1: Create EFF Word List Module
├── Task 2: Create Key Manager Core Module (part 1 - generation)
└── Task 3: Setup Test Infrastructure for Key Manager

Wave 2 (After Wave 1):
├── Task 4: Key Manager Core Module (part 2 - encryption & storage)
├── Task 5: Key Manager UI Components
└── Task 6: Unit Tests for Key Manager

Wave 3 (After Wave 2):
├── Task 7: UI Integration with Encrypt/Decrypt
├── Task 8: Integration Tests
└── Task 9: Documentation Updates

Wave 4 (Final):
├── Task 10: E2E Tests & Final Verification
└── Task 11: Security Review & Polish

Critical Path: Task 1 → Task 2 → Task 4 → Task 7 → Task 10
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 4, 6 | 3 |
| 3 | None | 6 | 1, 2 |
| 4 | 2 | 7, 8 | 5, 6 |
| 5 | None | 7 | 4, 6 |
| 6 | 2, 3 | 8 | 4, 5 |
| 7 | 4, 5 | 10 | 8 |
| 8 | 4, 6 | 10 | 7 |
| 9 | None | 10 | 7, 8 |
| 10 | 7, 8, 9 | None | None |
| 11 | 10 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Category | Skills |
|------|-------|---------------------|--------|
| 1 | 1, 2, 3 | quick | - |
| 2 | 4, 5, 6 | visual-engineering | frontend-ui-ux |
| 3 | 7, 8, 9 | quick | - |
| 4 | 10, 11 | quick | playwright |

---

## TODOs

### Wave 1: Foundation

#### Task 1: Create EFF Word List Module

**What to do**:
- Create `src/wordlist.js` containing EFF Long List (7,776 words)
- Export word list array and validation utilities
- Add function to get random words from list
- Add function to validate word list integrity (length check)

**Must NOT do**:
- Do NOT include short or dice lists (use Long List only)
- Do NOT add word modification (stemming, etc.)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Simple data module, no complex logic

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 2
- **Blocked By**: None

**References**:
- EFF Word Lists: https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases
- Word count must be exactly 7,776 words
- Format: One word per line in source, exported as array

**Acceptance Criteria**:
- [ ] `src/wordlist.js` created with 7,776 words
- [ ] Exports: `WORDLIST` (array), `getRandomWords(count)`, `validateWordlist()`
- [ ] `validateWordlist()` returns true (7,776 words verified)
- [ ] `getRandomWords(6)` returns 6 unique random words
- [ ] Test: `bun -e "import { WORDLIST } from './src/wordlist.js'; console.log(WORDLIST.length)"` outputs 7776

**Commit**: YES
- Message: `feat(key-manager): add EFF Long List word list (7776 words)`
- Files: `src/wordlist.js`

---

#### Task 2: Create Key Manager Core Module - Part 1 (Generation)

**What to do**:
- Create `src/key-manager.js` module structure
- Implement key generation functions:
  - `generatePassphrase()` - 6 random words from EFF list, hyphen-separated
  - `generateRandomKey()` - 32 bytes from crypto.getRandomValues, base64 encoded
- Implement key ID generation (UUID v4 or timestamp-based)
- Create TypeScript types/interfaces for Key objects

**Must NOT do**:
- Do NOT implement storage functions yet (Part 2)
- Do NOT implement master password logic yet
- Do NOT use Math.random() (use crypto.getRandomValues)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Core crypto module, well-defined requirements

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 3)
- **Parallel Group**: Wave 1
- **Blocks**: Task 4, Task 6
- **Blocked By**: Task 1

**References**:
- Pattern: Follow `src/crypto.js` export style
- Random generation: `crypto.getRandomValues(new Uint8Array(32))`
- UUID generation: Use `crypto.randomUUID()` or timestamp + random
- Import: `import { WORDLIST, getRandomWords } from './wordlist.js'`

**Acceptance Criteria**:
- [ ] `src/key-manager.js` created with exports
- [ ] `generatePassphrase()` returns string like "apple-banana-cherry-date-elderberry-fig"
- [ ] `generateRandomKey()` returns 44-char base64 string (32 bytes)
- [ ] Both functions generate unique output on each call
- [ ] Test: `bun test src/__tests__/key-manager.test.ts` - generation tests pass

**Commit**: YES
- Message: `feat(key-manager): implement key generation (passphrase and random)`
- Files: `src/key-manager.js`

---

#### Task 3: Setup Test Infrastructure for Key Manager

**What to do**:
- Create `src/__tests__/key-manager.test.ts` test file
- Create `src/__tests__/key-manager-integration.test.ts` test file
- Setup test helpers for localStorage mocking (since Bun doesn't have localStorage)
- Add test utilities for master password handling

**Must NOT do**:
- Do NOT write actual test cases yet (just infrastructure)
- Do NOT skip the mocking setup (critical for localStorage tests)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Test infrastructure setup

**Parallelization**:
- **Can Run In Parallel**: YES (with Tasks 1, 2)
- **Parallel Group**: Wave 1
- **Blocks**: Task 6, Task 8
- **Blocked By**: None

**References**:
- Pattern: Follow `src/__tests__/encryption.test.ts` structure
- Bun test docs: https://bun.sh/docs/cli/test
- localStorage mock: Create simple mock object with getItem/setItem/removeItem

**Acceptance Criteria**:
- [ ] `src/__tests__/key-manager.test.ts` created with imports and basic structure
- [ ] `src/__tests__/key-manager-integration.test.ts` created
- [ ] localStorage mock helper created in test file
- [ ] Test command runs: `bun test src/__tests__/key-manager.test.ts` (may have 0 tests, but no errors)

**Commit**: YES (can be squashed with Task 2)
- Message: `test(key-manager): setup test infrastructure`
- Files: `src/__tests__/key-manager.test.ts`, `src/__tests__/key-manager-integration.test.ts`

---

### Wave 2: Core Implementation

#### Task 4: Key Manager Core Module - Part 2 (Encryption & Storage)

**What to do**:
- Implement master password functions:
  - `createMasterPassword(password)` - Hash and store master password verification hash
  - `verifyMasterPassword(password)` - Verify against stored hash
  - `hasMasterPassword()` - Check if master password is configured
- Implement key storage with encryption:
  - `addKey(name, keyMaterial, password)` - Encrypt key with master password, store
  - `getKey(keyId, password)` - Decrypt and return key material
  - `listKeys()` - Return metadata (id, name, type, created) without decryption
  - `deleteKey(keyId)` - Remove key from storage
  - `renameKey(keyId, newName)` - Update key name
- Use existing AES-256-GCM + Argon2id from crypto.js for encryption

**Must NOT do**:
- Do NOT store keys in plaintext (must be encrypted)
- Do NOT store master password itself (store verification hash only)
- Do NOT use different KDF parameters than existing crypto.js (keep consistent)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Building on existing crypto patterns

**Parallelization**:
- **Can Run In Parallel**: YES (with Tasks 5, 6)
- **Parallel Group**: Wave 2
- **Blocks**: Task 7, Task 8
- **Blocked By**: Task 2

**References**:
- Encryption pattern: `src/crypto.js` encrypt/decrypt functions
- Storage format: Use same serialization as format.js
- Master password hash: Use Argon2id to derive hash, store salt + hash
- localStorage structure: `{ version: 1, masterHash: '...', keys: [{ id, name, type, created, encryptedKey }] }`

**Acceptance Criteria**:
- [ ] Master password can be created and verified
- [ ] Keys are encrypted before storage (verify in localStorage mock)
- [ ] Keys can be decrypted with correct master password
- [ ] Wrong master password fails decryption
- [ ] `listKeys()` returns metadata without requiring master password
- [ ] Test: All key-manager.test.ts tests pass

**Commit**: YES
- Message: `feat(key-manager): implement master password and encrypted key storage`
- Files: `src/key-manager.js`

---

#### Task 5: Key Manager UI Components

**What to do**:
- Create Key Manager panel HTML structure (initially hidden)
- Create "Manage Keys" button to toggle panel
- Create key list display (name, type, created date)
- Create "Add Key" button opening generation modal
- Create key generation modal with:
  - Radio buttons: Passphrase vs 256-bit Random
  - Generate button
  - Name input (auto-filled with "Key N", editable)
  - Preview of generated key
  - Save/Cancel buttons
- Create master password creation modal (for first-time flow)
- Create security warning banner component
- Add CSS styling matching existing design system

**Must NOT do**:
- Do NOT wire up functionality yet (just HTML/CSS)
- Do NOT modify existing encrypt/decrypt sections yet
- Do NOT skip accessibility (aria labels, focus management)

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`
- **Reason**: UI component creation requiring design consistency

**Parallelization**:
- **Can Run In Parallel**: YES (with Tasks 4, 6)
- **Parallel Group**: Wave 2
- **Blocks**: Task 7
- **Blocked By**: None

**References**:
- UI pattern: See duress-fields, stealth-fields for show/hide pattern
- Modal pattern: Use existing card styling with overlay
- CSS: Follow existing CSS variables in index.html
- Form elements: Use existing .form-input, .btn classes

**Acceptance Criteria**:
- [ ] Key Manager panel HTML added to index.html
- [ ] "Manage Keys" button visible and clickable
- [ ] Panel shows/hides on button click
- [ ] Key generation modal HTML complete
- [ ] Master password modal HTML complete
- [ ] All elements styled consistently with existing UI
- [ ] No visual regressions in existing encrypt/decrypt sections

**Commit**: YES
- Message: `feat(ui): add key manager panel and modals`
- Files: `src/index.html`

---

#### Task 6: Unit Tests for Key Manager

**What to do**:
- Write unit tests for all key-manager.js functions:
  - Key generation (passphrase format, random key length)
  - Master password creation and verification
  - Key storage (add, get, list, delete, rename)
  - Encryption verification (keys not stored plaintext)
  - Export/import functionality
- Mock localStorage for tests
- Test error cases (wrong password, missing key, etc.)

**Must NOT do**:
- Do NOT skip edge cases (empty names, special characters)
- Do NOT skip security tests (verify encryption actually works)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Test implementation based on existing patterns

**Parallelization**:
- **Can Run In Parallel**: YES (with Tasks 4, 5)
- **Parallel Group**: Wave 2
- **Blocks**: Task 8
- **Blocked By**: Task 2, Task 3

**References**:
- Test patterns: `src/__tests__/encryption.test.ts`, `src/__tests__/integration.test.ts`
- Bun test: https://bun.sh/docs/cli/test
- Mock pattern: See integration.test.ts for window.crypto mocking

**Acceptance Criteria**:
- [ ] All key generation functions tested
- [ ] Master password functions tested
- [ ] Key CRUD operations tested
- [ ] Encryption verified (stored data is not plaintext)
- [ ] Error cases tested
- [ ] Test coverage > 80%
- [ ] All tests pass: `bun test src/__tests__/key-manager.test.ts`

**Commit**: YES (can be squashed with Task 4)
- Message: `test(key-manager): add comprehensive unit tests`
- Files: `src/__tests__/key-manager.test.ts`

---

### Wave 3: Integration

#### Task 7: UI Integration with Encrypt/Decrypt

**What to do**:
- Add key selector dropdown at top of Encrypt and Decrypt cards
- Populate dropdown with saved keys from key manager
- Add "Use saved key" / "Enter manually" toggle
- When key selected: auto-fill password field (read-only), show key name
- When manual mode: password field editable, no key association
- Wire up "Manage Keys" button to key manager panel
- Wire up key generation modal to actually generate and save keys
- Wire up master password modal for first-time flow
- Handle master password prompts when accessing keys
- Add "Export Keys" and "Import Keys" buttons to key manager panel

**Must NOT do**:
- Do NOT break existing manual password functionality
- Do NOT store plaintext passwords in form fields
- Do NOT skip master password verification on key access

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`
- **Reason**: Complex UI integration requiring careful state management

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 8)
- **Parallel Group**: Wave 3
- **Blocks**: Task 10
- **Blocked By**: Task 4, Task 5

**References**:
- JS integration: Add to existing `<script type="module">` in index.html
- Import: `import { generatePassphrase, addKey, getKey, listKeys, ... } from './key-manager.js'`
- Event handling: See existing encrypt/decrypt button handlers
- Form state: Track selected key ID vs manual mode

**Acceptance Criteria**:
- [ ] Key selector dropdown populated with saved keys
- [ ] Selecting a key auto-fills password field (read-only)
- [ ] Manual mode allows typing custom password
- [ ] Encryption works with both saved keys and manual passwords
- [ ] Decryption works with both saved keys and manual passwords
- [ ] Key manager panel opens and shows key list
- [ ] Can generate and save new keys from UI
- [ ] Master password prompt appears on first visit
- [ ] Can export and import keys

**Commit**: YES
- Message: `feat(ui): integrate key manager with encrypt/decrypt workflow`
- Files: `src/index.html`

---

#### Task 8: Integration Tests

**What to do**:
- Write integration tests for complete workflows:
  - First-time setup (master password creation)
  - Key generation and storage
  - Encrypt with saved key → decrypt with same key
  - Encrypt with manual password → decrypt with manual password
  - Export keys → clear storage → import keys → decrypt works
- Test localStorage persistence (save, reload page, keys still available)
- Test master password verification failure

**Must NOT do**:
- Do NOT skip the full workflow tests
- Do NOT use unit test mocks (test real localStorage if possible, or realistic mock)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Integration test writing

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 7)
- **Parallel Group**: Wave 3
- **Blocks**: Task 10
- **Blocked By**: Task 4, Task 6

**References**:
- Pattern: `src/__tests__/integration.test.ts`
- Full workflow: Generate key → Save → Encrypt → Decrypt
- Persistence: Mock page reload by re-instantiating key manager

**Acceptance Criteria**:
- [ ] First-time setup workflow tested
- [ ] Full encrypt/decrypt with saved keys tested
- [ ] Export/import roundtrip tested
- [ ] Persistence across "page reload" tested
- [ ] Wrong master password rejection tested
- [ ] All integration tests pass: `bun test src/__tests__/key-manager-integration.test.ts`

**Commit**: YES
- Message: `test(key-manager): add integration tests for full workflows`
- Files: `src/__tests__/key-manager-integration.test.ts`

---

#### Task 9: Documentation Updates

**What to do**:
- Update README.md with Key Manager section:
  - Overview of Key Manager feature
  - How to create master password
  - How to generate and save keys
  - How to use saved keys for encryption/decryption
  - Security warnings about localStorage
  - Export/backup instructions
  - Recovery procedures
- Update SECURITY.md with Key Manager security model
- Add Key Manager to feature comparison table
- Update quick start section

**Must NOT do**:
- Do NOT minimize security risks (be honest about localStorage limitations)
- Do NOT skip backup/recovery instructions

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Documentation writing

**Parallelization**:
- **Can Run In Parallel**: YES (with Tasks 7, 8)
- **Parallel Group**: Wave 3
- **Blocks**: Task 10
- **Blocked By**: None

**References**:
- Existing README structure
- Security model docs
- Keep tone: honest, paranoid, user-focused

**Acceptance Criteria**:
- [ ] README.md has Key Manager section
- [ ] Security warnings clearly stated
- [ ] Usage instructions clear and tested
- [ ] Backup/recovery procedures documented
- [ ] No broken links or formatting issues

**Commit**: YES
- Message: `docs: add key manager documentation and security warnings`
- Files: `README.md`

---

### Wave 4: Final Verification

#### Task 10: E2E Tests & Final Verification

**What to do**:
- Create E2E tests using Playwright for critical user flows:
  - First visit: Create master password
  - Generate a passphrase key
  - Encrypt a message with saved key
  - Decrypt the message
  - Export keys
  - Import keys
- Run full test suite: `bun test` (all 211+ existing + new tests)
- Manual browser testing
- Verify no CSP violations
- Verify no network requests

**Must NOT do**:
- Do NOT skip E2E tests (they catch integration issues unit tests miss)
- Do NOT ship with failing tests

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `playwright`
- **Reason**: E2E testing with browser automation

**Parallelization**:
- **Can Run In Parallel**: NO (final verification)
- **Parallel Group**: Wave 4
- **Blocks**: None (last task)
- **Blocked By**: Task 7, Task 8, Task 9

**References**:
- E2E patterns: `e2e/` directory (if exists)
- Playwright: https://playwright.dev/
- Serve: `bun run serve`

**Acceptance Criteria**:
- [ ] E2E test file created: `e2e/key-manager.spec.ts`
- [ ] All existing tests pass: `bun test` (211+)
- [ ] All new tests pass
- [ ] E2E tests pass: `bun run test:e2e`
- [ ] Manual test: First-time flow works
- [ ] Manual test: Encrypt/decrypt with saved key works
- [ ] Manual test: Export/import works
- [ ] DevTools: No CSP violations
- [ ] DevTools Network: Zero external requests

**Commit**: YES
- Message: `test(e2e): add end-to-end tests for key manager`
- Files: `e2e/key-manager.spec.ts`

---

#### Task 11: Security Review & Polish

**What to do**:
- Code review: Verify no plaintext key storage
- Verify master password hashing uses Argon2id
- Verify key encryption uses AES-256-GCM
- Check for XSS vulnerabilities in key names
- Verify localStorage structure doesn't leak key metadata
- Add entropy check for generated passphrases
- Add strength meter for master password
- Polish UI: animations, transitions, focus states
- Final accessibility check (keyboard navigation, screen readers)

**Must NOT do**:
- Do NOT skip security review
- Do NOT ignore accessibility issues

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None needed
- **Reason**: Final polish and security verification

**Parallelization**:
- **Can Run In Parallel**: NO (final task)
- **Parallel Group**: Wave 4
- **Blocks**: None
- **Blocked By**: Task 10

**References**:
- Security checklist in docs/security.md
- Accessibility: WCAG 2.1 AA guidelines

**Acceptance Criteria**:
- [ ] Security review completed (no plaintext storage)
- [ ] Master password uses Argon2id
- [ ] Keys encrypted with AES-256-GCM
- [ ] No XSS vulnerabilities in key name handling
- [ ] Master password strength meter added
- [ ] UI polish: smooth animations, clear feedback
- [ ] Keyboard navigation works for all features
- [ ] All tests still pass after changes

**Commit**: YES
- Message: `feat(key-manager): security review and UI polish`
- Files: `src/key-manager.js`, `src/index.html`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `feat(key-manager): add EFF Long List word list` | src/wordlist.js |
| 2 | `feat(key-manager): implement key generation` | src/key-manager.js |
| 3+6 | `test(key-manager): setup test infrastructure and unit tests` | src/__tests__/key-manager.test.ts |
| 4 | `feat(key-manager): implement master password and encrypted storage` | src/key-manager.js |
| 5 | `feat(ui): add key manager panel and modals` | src/index.html |
| 7 | `feat(ui): integrate key manager with encrypt/decrypt workflow` | src/index.html |
| 8 | `test(key-manager): add integration tests` | src/__tests__/key-manager-integration.test.ts |
| 9 | `docs: add key manager documentation` | README.md |
| 10 | `test(e2e): add end-to-end tests` | e2e/key-manager.spec.ts |
| 11 | `feat(key-manager): security review and polish` | src/key-manager.js, src/index.html |

---

## Success Criteria

### Verification Commands

```bash
# Run all tests
bun test

# Expected: 211+ existing tests + new tests all pass

# Run E2E tests
bun run test:e2e

# Expected: All E2E tests pass

# Serve and manual test
bun run serve
# Open http://localhost:3000
```

### Final Checklist

- [ ] All 211 existing tests pass
- [ ] New unit tests pass (>80% coverage)
- [ ] New integration tests pass
- [ ] E2E tests pass
- [ ] Manual verification complete
- [ ] No CSP violations
- [ ] No external network requests
- [ ] Security review passed
- [ ] Documentation updated
- [ ] Master password encryption verified
- [ ] Export/Import tested
- [ ] Accessibility verified

---

## Risk Assessment

### High Risk Items
1. **Master password security** - If implemented incorrectly, keys could be exposed
   - Mitigation: Use proven crypto patterns from existing crypto.js
   - Review: Explicitly verify encryption in code review

2. **localStorage persistence** - Data loss if user clears browser data
   - Mitigation: Prominent warnings + export functionality
   - Review: Verify warnings are noticeable but not annoying

### Medium Risk Items
1. **UI complexity** - Key manager adds significant UI complexity
   - Mitigation: Good UX design, clear labels, help text
   - Review: Usability testing

2. **First-time flow friction** - Forcing master password could annoy users
   - Mitigation: Make it quick, clear value proposition
   - Review: Test with fresh browser profile

### Low Risk Items
1. **Performance** - Argon2id is slow by design
   - Mitigation: Use same params as existing crypto (opslimit=6, memlimit=64MB)
   - Review: Timing tests

---

## Notes for Implementers

### Key Technical Details

1. **EFF Long List Format**: 
   - 7,776 words
   - One word per line in source
   - Words are common, recognizable, easy to spell
   - Export as flat array: `export const WORDLIST = ['word1', 'word2', ...]`

2. **Key Object Structure**:
   ```typescript
   interface Key {
     id: string;           // UUID or timestamp-based
     name: string;         // User-defined or "Key N"
     type: 'passphrase' | 'random';
     created: number;      // Unix timestamp
     encryptedKey: string; // Base64 encrypted key material
   }
   ```

3. **Storage Format**:
   ```typescript
   interface KeyStore {
     version: 1;
     masterSalt: string;      // Base64 salt for master password
     masterHash: string;      // Base64 Argon2id hash for verification
     keys: Key[];             // Encrypted keys array
   }
   ```

4. **Master Password Verification**:
   - Use Argon2id to derive key from master password + salt
   - Store salt + first 32 bytes of derived key as verification hash
   - On verification: Re-derive and compare

5. **Key Encryption**:
   - Derive encryption key from master password + unique salt per key
   - Encrypt key material with AES-256-GCM
   - Store salt + nonce + ciphertext

6. **UI State Management**:
   - Track: selectedKeyId (null = manual mode)
   - On key select: Load key with master password, fill password field
   - On manual mode: Clear password field, allow editing

### Design Principles to Maintain

1. **Security First**: Never compromise security for convenience
2. **Zero Trust**: Assume browser/localStorage is compromised, encrypt everything
3. **Honest UX**: Clear warnings, no false security claims
4. **Offline First**: No network dependencies
5. **Accessibility**: Keyboard navigable, screen reader friendly

### Testing Priorities

1. Security tests (encryption, no plaintext storage)
2. Integration tests (full workflows)
3. Edge case tests (empty inputs, special chars, large data)
4. E2E tests (critical user paths)
5. UI tests (interactions, state management)
