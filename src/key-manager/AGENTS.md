# Key Manager Module

**Generated:** 2026-02-01
**Part of:** Encyphrix encryption tool
**Scope:** Mnemonic passphrase generation, cryptographic key derivation, secure storage

## OVERVIEW
BIP39-style mnemonic phrase generation with Argon2id key derivation. Provides deterministic key generation from memorable passphrases.

## STRUCTURE
```
src/key-manager/
├── index.js              # Barrel: exports all submodules
├── types.ts              # TypeScript type definitions
├── wordlist.js           # BIP39 wordlist loader
├── wordlist-data.json    # 2048 BIP39 English words (~101KB)
├── passphrase.js         # Mnemonic phrase generation
├── master-crypto.js      # Argon2id key derivation
├── storage.js            # Secure key storage (localStorage/IDB)
└── ui/                   # UI components
    ├── key-generator.js  # Key creation interface
    ├── key-list.js       # Key management UI (+ CSS)
    ├── manual-entry.js   # Manual phrase input
    └── export-import.js  # Backup/restore keys
```

## WHERE TO LOOK

| Task | File | Function |
|------|------|----------|
| Generate mnemonic | `passphrase.js` | `generatePhrase(wordCount)` |
| Derive master key | `master-crypto.js` | `deriveMasterKey(phrase, salt)` |
| Validate phrase | `wordlist.js` | `isValidPhrase(phrase)` |
| Store keys | `storage.js` | `saveKey(), getKey(), deleteKey()` |
| UI: Generate | `ui/key-generator.js` | DOM + event handlers |
| UI: List keys | `ui/key-list.js` | Key list, export, import UI |
| UI: Manual entry | `ui/manual-entry.js` | Phrase word picker |
| Types | `types.ts` | KeyMetadata, KeyData interfaces |

## CONVENTIONS

### Module Pattern
- **Barrel exports**: Add new exports to `index.js`
- **Separate UI**: UI components isolated in `ui/` subdirectory
- **Crypto boundaries**: `master-crypto.js` is only file touching libsodium

### Data Flow
1. **Generation**: `passphrase.js` → `master-crypto.js` → `storage.js`
2. **Recovery**: `wordlist.js` (validation) → `master-crypto.js` (derivation)
3. **Storage**: Encrypted at rest with device-bound keys

### Security Rules
- **Phrases never stored**: Only derived keys stored, not source phrases
- **Argon2id params**: opslimit=3, memlimit=64MB (configurable in master-crypto.js)
- **Salt required**: Every key derivation uses unique salt

## ANTI-PATTERNS

### NEVER
- **Store plaintext phrases**: Phrases exist only in memory during derivation
- **Weak word counts**: Minimum 12 words (128-bit entropy)
- **Skip validation**: Always validate phrase against wordlist before derivation
- **Hardcoded salts**: Must generate unique salt per key

### Testing
- **Mock wordlist**: Use real 2048-word list in tests
- **Deterministic crypto**: Tests use fixed Argon2id params for reproducibility
- **Storage isolation**: localStorage cleared between tests

## INTEGRATION

### From Parent (src/)
Import via barrel:
```javascript
import { generatePhrase, deriveMasterKey } from './key-manager/index.js';
```

### Used By
- `src/index.html` - Main UI imports key-manager modules
- `src/crypto.js` - May use for key derivation
- E2E tests in `e2e/key-manager.spec.ts`

## DEPENDENCIES

### Internal
- `src/lib/libsodium.mjs` - Argon2id, SHA-256
- `src/lib/zxcvbn.js` - Password strength (indirect via parent)

### External
- None (zero external network requests)

---

*See parent AGENTS.md for project-wide conventions.*
