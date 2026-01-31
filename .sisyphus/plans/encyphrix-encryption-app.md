# Encyphrix - Ultimate Encryption App Work Plan

## TL;DR

> **Quick Summary**: Build a paranoid-grade, password-based encryption web app that encrypts/decrypts text with maximum future-proof security. Uses Argon2id KDF + AES-256-GCM, runs client-side only, self-hostable on Raspberry Pi Zero 2.
> 
> **Deliverables**:
> - Single HTML file with embedded CSS/JS (no external deps for core)
> - Argon2id + libsodium.js WASM integration
> - Web Crypto API encryption/decryption
> - Password strength meter (zxcvbn)
> - Algorithm-agile ciphertext format with version headers
> - **Paranoid features**: Duress passwords, self-destruct mode, ciphertext stealth
> - **Air-gapped**: Works offline with `file://` protocol
> - **Reproducible builds**: Bit-for-bit verifiable
> - Docker/Pi Zero 2 deployment config
> 
> **Estimated Effort**: Medium-High (~5-7 days of focused work)
> **Parallel Execution**: YES - 4 waves (foundation → core → advanced → deployment)
> **Critical Path**: Core crypto → UI → Advanced features → Deployment

---

## Context

### Original Request
Build an encryption app with the strongest encryption ever that:
- Resists quantum computers and all imaginable future compute
- Is incredibly easy for users (password-based, no key management)
- Self-hostable on Raspberry Pi Zero 2 (1GHz quad-core, 512MB RAM)
- Everyone sees encrypted text (sender, recipient, MITM) but needs app + password to decrypt
- Future-proof against computers with compute beyond imagination

### Research Findings

**Post-Quantum Standards (NIST August 2024)**:
- FIPS 203 (ML-KEM) - Key encapsulation (formerly CRYSTALS-Kyber)
- FIPS 204 (ML-DSA) - Signatures (formerly CRYSTALS-Dilithium)
- FIPS 205 (SLH-DSA) - Hash-based signatures (formerly SPHINCS+)

**Oracle Consultation Results**:
1. **No cascade encryption** - Adds complexity without security benefit
2. **Skip ML-KEM** - Not useful for password-based symmetric encryption
3. **Argon2id on Pi Zero 2**: m=65536 (64MB), t=4-6, p=2
4. **Stack**: Web Crypto API (AES-256-GCM) + libsodium.js (Argon2id)
5. **Algorithm agility**: Version headers for future migration
6. **Password entropy is the bottleneck** - Best crypto is useless with weak passwords

**Libraries Identified**:
- `libsodium.js` - Argon2id, XChaCha20-Poly1305 (via WASM)
- `zxcvbn` - Password strength estimation
- Web Crypto API (native) - AES-256-GCM, PBKDF2 (fallback)

### Metis Review

**Identified Gaps** (addressed in plan):
- [Gap 1]: Need algorithm agility from day one for future migration → Included version header in ciphertext format
- [Gap 2]: Pi Zero 2 memory constraints → Conservative Argon2id params (64MB)
- [Gap 3]: Browser memory wiping limitations → Documented as known limitation
- [Gap 4]: Password strength is critical → Included zxcvbn integration
- [Gap 5]: MITM with public ciphertext → Clarified threat model (password entropy is defense)
- [Gap 6]: Hidden ambition gap (user wants "ultimate", plan delivers standard) → Added paranoid features (duress passwords, stealth mode, self-destruct)
- [Gap 7]: Philosophical gap ("infinite compute" impossibility not addressed) → Added Task 10: Security Philosophy & Threat Model Document
- [Gap 8]: Innovation expectation (user said "innovate") → Innovation is in UX/accessibility, not novel crypto
- [Gap 9]: App fingerprinting threat → Added Task 12: Ciphertext Stealth Features
- [Gap 10]: Missing air-gapped deployment → Added Task 14: Offline-First Distribution
- [Gap 11]: Missing reproducible builds → Added Task 15: Reproducible Build System

---

## Work Objectives

### Core Objective
Build a client-side web application that encrypts and decrypts text using password-based encryption with maximum practical security, resistant to quantum computers and future compute improvements.

### Concrete Deliverables
1. **Single HTML application** (`index.html`) with all CSS/JS embedded
2. **Cryptographic core** (`crypto.js`): Argon2id KDF + AES-256-GCM encryption/decryption
3. **User interface**: Clean, intuitive encrypt/decrypt interface
4. **Password strength meter**: Real-time feedback using zxcvbn
5. **Algorithm-agile format**: Version headers for future cipher migration
6. **Duress password support**: Different password → fake plaintext for coercion resistance
7. **Ciphertext stealth**: Random noise mode, optional steganography, padding
8. **Self-destruct mode**: One-time decryption with automatic cleanup
9. **Offline-first**: Works with `file://` protocol, no server required
10. **Reproducible builds**: Bit-for-bit verifiable, SRI hashes
11. **Deployment configs**: Docker + Pi Zero 2 specific optimizations
12. **Documentation**: Usage instructions, security model, threat analysis

### Definition of Done
- [x] App encrypts/decrypts text correctly with password
- [x] Argon2id KDF runs in <2 seconds on Pi Zero 2
- [x] Password strength meter shows feedback
- [x] Ciphertext includes version header (algorithm agility)
- [x] Duress password produces different (fake) output
- [x] Works completely offline (`file://` protocol)
- [x] Reproducible build produces identical output
- [x] All tests pass
- [x] Successfully deploys and runs on Raspberry Pi Zero 2

### Must Have
1. Argon2id key derivation with secure parameters
2. AES-256-GCM authenticated encryption
3. Client-side only (no server communication)
4. Algorithm-agile ciphertext format
5. Password strength indicator
6. Duress password support
7. Offline/air-gapped functionality
8. Reproducible builds
9. Works on Raspberry Pi Zero 2

### Must NOT Have (Guardrails)
- ❌ Cascade encryption (multiple algorithm layers)
- ❌ ML-KEM/post-quantum asymmetric (not needed for password-based)
- ❌ Server-side components
- ❌ External API dependencies for core crypto
- ❌ Weak password acceptance
- ❌ Custom cryptographic constructions

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (fresh project)
- **User wants tests**: YES (TDD for crypto)
- **Framework**: bun test (or vitest for browser testing)
- **QA approach**: TDD with automated browser tests via playwright

### Test Setup
- [x] 0. Setup Test Infrastructure
  - Install: `bun add -d bun-types @types/web`
  - Test runner: bun's built-in test runner
  - Browser testing: Playwright for E2E crypto tests
  - Verify: `bun test` runs successfully
  - Example: Create `src/__tests__/example.test.ts`
  - Verify: 1 test passes

### Verification Types by Task

**For Crypto tasks** (using Bun + libsodium tests):
```bash
# Agent runs:
bun test src/crypto.test.ts
# Assert: All crypto operations pass
# Assert: Argon2id produces expected key length (32 bytes)
# Assert: AES-GCM encryption/decryption roundtrip works
# Assert: Ciphertext format matches spec
```

**For UI tasks** (using Playwright):
```bash
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000
2. Fill: textarea#plaintext with "Secret message"
3. Fill: input#password with "correct-horse-battery-staple"
4. Click: button#encrypt
5. Wait for: selector "#ciphertext" to be visible
6. Assert: Ciphertext is not empty and different from plaintext
7. Fill: textarea#ciphertext-input with [ciphertext]
8. Fill: input#decrypt-password with "correct-horse-battery-staple"
9. Click: button#decrypt
10. Assert: selector "#decrypted" contains "Secret message"
11. Screenshot: .sisyphus/evidence/encrypt-decrypt-success.png
```

**For Performance tasks** (using Bun):
```bash
# Agent runs on Pi Zero 2:
bun test src/performance.test.ts
# Assert: Argon2id completes in <2000ms
# Assert: Encryption of 1KB completes in <100ms
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Project Setup + HTML Structure
├── Task 2: Integrate libsodium.js + Web Crypto
└── Task 3: Implement Argon2id KDF

Wave 2 (Core Crypto - After Wave 1):
├── Task 4: Implement AES-256-GCM Encryption/Decryption
├── Task 5: Design Algorithm-Agile Ciphertext Format
└── Task 6: Build UI (HTML/CSS)

Wave 3 (Features & Security - After Wave 2):
├── Task 7: Password Strength Meter (zxcvbn)
├── Task 8: Security Audit + CSP Headers
└── Task 9: Testing Suite

Wave 3.5 (Advanced Security - After Wave 2/3):
├── Task 10: Security Philosophy & Threat Model Document
├── Task 11: Duress Password Support
├── Task 12: Ciphertext Stealth Features
├── Task 13: Self-Destruct Mode
├── Task 14: Offline-First Distribution
└── Task 15: Reproducible Build System

Wave 4 (Deployment - After All Previous):
├── Task 16: Pi Zero 2 Optimization
├── Task 17: Docker Deployment Config
└── Task 18: Documentation
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 6 | None |
| 2 | None | 4, 5 | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 2, 3 | 5, 6, 11, 12, 13 | None |
| 5 | 4 | 7, 12 | 6 |
| 6 | 1 | 7, 8 | 5 |
| 7 | 5, 6 | 8 | None |
| 8 | 7 | 9 | None |
| 9 | 4, 5, 6, 7, 8 | 10, 11, 12, 13, 14, 15, 16, 17, 18 | None |
| 10 | None | 18 | 9 |
| 11 | 4, 9 | 18 | 10, 12, 13, 14, 15 |
| 12 | 5, 9 | 18 | 10, 11, 13, 14, 15 |
| 13 | 4, 9 | 18 | 10, 11, 12, 14, 15 |
| 14 | 9 | 16, 17, 18 | 10, 11, 12, 13, 15 |
| 15 | 9 | 16, 17, 18 | 10, 11, 12, 13, 14 |
| 16 | 9, 14, 15 | 18 | 17 |
| 17 | 9, 14, 15 | 18 | 16 |
| 18 | 10, 11, 12, 13, 14, 15, 16, 17 | None | None |

---

## TODOs

### Wave 1: Foundation

- [x] 1. Project Setup + HTML Structure

  **What to do**:
  - Create project directory structure
  - Create base `index.html` with semantic structure
  - Add CSP (Content Security Policy) headers meta tag
  - Create CSS (embedded in HTML) for clean UI
  - Set up test infrastructure (bun + playwright)

  **Must NOT do**:
  - Don't use external CSS/JS files (keep it single-file for portability)
  - Don't add any crypto yet

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Reason**: Frontend UI structure and styling
  - **Skills**: None needed beyond base

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6 (UI depends on structure)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] HTML file exists at `src/index.html`
  - [ ] Contains encrypt/decrypt textareas and password inputs
  - [ ] CSP meta tag present restricting external resources
  - [ ] bun test infrastructure set up
  - [ ] Command: `bun test` → "1 test passed"
  - [ ] Screenshot: Basic UI structure visible

  **Commit**: YES
  - Message: `feat: Initial project setup with HTML structure and CSP`
  - Files: `src/index.html`, `package.json`, `.gitignore`

---

- [x] 2. Integrate libsodium.js + Web Crypto

  **What to do**:
  - Download libsodium.js (WASM build) to `src/lib/libsodium.js`
  - Create `src/crypto.js` module
  - Initialize libsodium.js using the `sodium.ready` promise pattern:
    ```javascript
    // EXACT INITIALIZATION PATTERN TO USE:
    import sodium from 'libsodium-wrappers';
    
    export async function initCrypto() {
      await sodium.ready;
      console.log('libsodium.js initialized, version:', sodium.SODIUM_VERSION_STRING);
      return sodium;
    }
    
    // Web Crypto API detection:
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
    ```
  - Add Web Crypto API detection and fallback
  - Write tests for library initialization

  **Implementation Notes**:
  - Use `libsodium-wrappers` package (npm install libsodium-wrappers)
  - The `sodium.ready` promise resolves when WASM is loaded
  - Web Crypto API is accessed via `window.crypto.subtle`
  - Always check for `window.crypto` existence before use

  **Must NOT do**:
  - Don't use CDN (must work offline)
  - Don't implement crypto operations yet (just setup)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Complex library integration with WASM
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3, 4
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] libsodium.js exists at `src/lib/libsodium.js`
  - [ ] `src/crypto.js` exports `initCrypto()` function
  - [ ] Test: `bun test src/__tests__/crypto.init.test.ts` → libsodium initializes
  - [ ] Test: Web Crypto API detected
  - [ ] Command: `bun run src/crypto.js` → "Crypto libraries initialized"

  **Commit**: YES
  - Message: `feat: Integrate libsodium.js WASM and Web Crypto API`
  - Files: `src/crypto.js`, `src/lib/libsodium.js`, `src/__tests__/crypto.init.test.ts`

---

- [x] 3. Implement Argon2id KDF

  **What to do**:
  - Implement `deriveKey(password: string, salt: Uint8Array)` function
  - Use libsodium.js `crypto_pwhash` (Argon2id) with EXACT signature:
    ```javascript
    // EXACT FUNCTION SIGNATURE FROM libsodium.js:
    // sodium.crypto_pwhash(outputLength, password, salt, opsLimit, memLimit, algorithm)
    
    export function deriveKey(password: string, salt: Uint8Array): Uint8Array {
      const passwordBytes = sodium.from_string(password);
      const key = sodium.crypto_pwhash(
        32,                    // outputLength: 32 bytes (256 bits)
        passwordBytes,         // password: Uint8Array
        salt,                  // salt: Uint8Array (16 bytes)
        6,                     // opsLimit: 6 iterations (sensitive opslimit)
        65536,                 // memLimit: 64 MB in KB (65536)
        sodium.crypto_pwhash_ALG_ARGON2ID13  // algorithm: Argon2id v1.3
      );
      return key;
    }
    
    // Generate random 16-byte salt:
    const salt = sodium.randombytes_buf(16);
    ```
  - Parameters: opslimit=6, memlimit=64MB (65536 KB), output=32 bytes
  - Generate random 128-bit (16-byte) salt
  - Return { key: Uint8Array, salt: Uint8Array }
  - Write comprehensive tests

  **Function Signature Reference**:
  - `sodium.crypto_pwhash(outputLength, password, salt, opsLimit, memLimit, algorithm)`
  - Returns: `Uint8Array` of length `outputLength`
  - Algorithm constant: `sodium.crypto_pwhash_ALG_ARGON2ID13`
  - Salt must be exactly 16 bytes (128 bits)
  - Password must be converted to Uint8Array via `sodium.from_string()`

  **Must NOT do**:
  - Don't use pure-JS Argon2 (too slow)
  - Don't use lower memory than 64MB (weaker security)
  - Don't reuse salts

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Reason**: Cryptographic implementation requiring precision
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4 (encryption needs derived key)
  - **Blocked By**: Task 2 (needs libsodium)

  **Acceptance Criteria**:
  - [ ] Function `deriveKey(password, salt)` implemented
  - [ ] Uses `sodium.crypto_pwhash` with Argon2id
  - [ ] Parameters: opslimit=6, memlimit=65536, output=32
  - [ ] Test: `bun test src/__tests__/kdf.test.ts` → 5 tests pass
  - [ ] Test: Same password+salt produces same key
  - [ ] Test: Different salts produce different keys
  - [ ] Test: Key length is 32 bytes (256 bits)
  - [ ] Performance: <2000ms on reference hardware

  **Commit**: YES
  - Message: `feat: Implement Argon2id KDF with 64MB memory`
  - Files: `src/crypto.js` (KDF functions), `src/__tests__/kdf.test.ts`

---

### Wave 2: Core Crypto

- [x] 4. Implement AES-256-GCM Encryption/Decryption

  **What to do**:
  - Implement `encrypt(plaintext: string, password: string)`:
    1. Generate 128-bit salt
    2. Derive 256-bit key via Argon2id
    3. Generate 96-bit nonce (12 bytes for GCM)
    4. Encrypt via Web Crypto API AES-GCM with EXACT algorithm spec:
       ```javascript
       // EXACT WEB CRYPTO API USAGE FOR AES-256-GCM:
       
       // 1. Import the raw key into Web Crypto
       const cryptoKey = await window.crypto.subtle.importKey(
         'raw',                    // format
         derivedKey,               // Uint8Array (32 bytes)
         { name: 'AES-GCM' },      // algorithm
         false,                    // not extractable
         ['encrypt', 'decrypt']    // key usages
       );
       
       // 2. Encrypt with exact algorithm object:
       const algorithm = {
         name: 'AES-GCM',
         iv: nonce,               // Uint8Array, 12 bytes (96 bits)
         tagLength: 128           // authentication tag length in bits
       };
       
       const plaintextBytes = new TextEncoder().encode(plaintext);
       const encryptedBuffer = await window.crypto.subtle.encrypt(
         algorithm,
         cryptoKey,
         plaintextBytes
       );
       
       // 3. Result is ArrayBuffer: ciphertext + 16-byte auth tag appended
       const encryptedBytes = new Uint8Array(encryptedBuffer);
       // encryptedBytes.length = plaintext.length + 16 (auth tag)
       ```
    5. Return ciphertext with metadata
  - Implement `decrypt(ciphertext: string, password: string)`:
    1. Parse ciphertext format
    2. Extract salt, nonce, encrypted data
    3. Derive key via Argon2id (same params)
    4. Decrypt via AES-GCM using same algorithm object
    5. Return plaintext via `new TextDecoder().decode(decrypted)`
  - Write comprehensive roundtrip tests

  **Web Crypto API Reference**:
  - Algorithm name: `'AES-GCM'`
  - IV (nonce): Must be 12 bytes (96 bits) for GCM
  - Tag length: 128 bits (16 bytes) - this is appended to ciphertext
  - Key import: Use `crypto.subtle.importKey()` with `{ name: 'AES-GCM' }`
  - Encryption: `crypto.subtle.encrypt(algorithm, key, data)` returns Promise<ArrayBuffer>
  - The returned ArrayBuffer contains: [ciphertext...][auth tag (16 bytes)]

  **Must NOT do**:
  - Don't use ECB mode or unauthenticated encryption
  - Don't reuse nonces
  - Don't skip authentication tag verification

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Reason**: Security-critical cryptographic implementation
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5, 6, 7, 9
  - **Blocked By**: Task 2, 3

  **Acceptance Criteria**:
  - [ ] Function `encrypt(plaintext, password)` returns string
  - [ ] Function `decrypt(ciphertext, password)` returns string
  - [ ] Test: `bun test src/__tests__/encryption.test.ts` → 10 tests pass
  - [ ] Test: Roundtrip encryption/decryption works
  - [ ] Test: Wrong password fails to decrypt
  - [ ] Test: Tampered ciphertext fails authentication
  - [ ] Test: Different passwords produce different ciphertexts
  - [ ] Test: Same password+plaintext produces different ciphertexts (random nonce)

  **Commit**: YES
  - Message: `feat: Implement AES-256-GCM encryption with Argon2id key derivation`
  - Files: `src/crypto.js` (encrypt/decrypt), `src/__tests__/encryption.test.ts`

---

- [x] 5. Design Algorithm-Agile Ciphertext Format

  **What to do**:
  - Design binary format for encrypted output:
    ```
    [1 byte]  Version (0x01)
    [1 byte]  KDF algorithm (0x01 = Argon2id)
    [4 bytes] KDF opslimit (uint32 BE)
    [4 bytes] KDF memlimit (uint32 BE)
    [16 bytes] Salt
    [1 byte]  Cipher algorithm (0x01 = AES-256-GCM)
    [12 bytes] Nonce
    [variable] Ciphertext (includes 16-byte auth tag at end)
    ```
  - Implement `serialize()` and `deserialize()` functions using DataView:
    ```javascript
    // EXACT IMPLEMENTATION APPROACH USING DataView:
    
    export function serialize(metadata, encryptedData) {
      // encryptedData is Uint8Array from Web Crypto (ciphertext + auth tag)
      const totalLength = 1 + 1 + 4 + 4 + 16 + 1 + 12 + encryptedData.length;
      const buffer = new ArrayBuffer(totalLength);
      const view = new DataView(buffer);
      let offset = 0;
      
      // Version (1 byte)
      view.setUint8(offset, metadata.version);
      offset += 1;
      
      // KDF algorithm (1 byte)
      view.setUint8(offset, metadata.kdfAlgorithm);
      offset += 1;
      
      // KDF opslimit (4 bytes, big-endian uint32)
      view.setUint32(offset, metadata.opslimit, false); // false = big-endian
      offset += 4;
      
      // KDF memlimit (4 bytes, big-endian uint32)
      view.setUint32(offset, metadata.memlimit, false);
      offset += 4;
      
      // Salt (16 bytes)
      new Uint8Array(buffer, offset, 16).set(metadata.salt);
      offset += 16;
      
      // Cipher algorithm (1 byte)
      view.setUint8(offset, metadata.cipherAlgorithm);
      offset += 1;
      
      // Nonce (12 bytes)
      new Uint8Array(buffer, offset, 12).set(metadata.nonce);
      offset += 12;
      
      // Encrypted data (ciphertext + auth tag)
      new Uint8Array(buffer, offset).set(encryptedData);
      
      // Return as Base64 string
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
    
    export function deserialize(base64String) {
      const binary = atob(base64String);
      const buffer = new ArrayBuffer(binary.length);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      let offset = 0;
      const metadata = {};
      
      metadata.version = view.getUint8(offset);
      offset += 1;
      
      metadata.kdfAlgorithm = view.getUint8(offset);
      offset += 1;
      
      metadata.opslimit = view.getUint32(offset, false); // big-endian
      offset += 4;
      
      metadata.memlimit = view.getUint32(offset, false);
      offset += 4;
      
      metadata.salt = bytes.slice(offset, offset + 16);
      offset += 16;
      
      metadata.cipherAlgorithm = view.getUint8(offset);
      offset += 1;
      
      metadata.nonce = bytes.slice(offset, offset + 12);
      offset += 12;
      
      metadata.encryptedData = bytes.slice(offset); // Rest is ciphertext + auth tag
      
      return metadata;
    }
    ```
  - Encode as Base64 (standard with padding) for text transport
  - Write tests for format correctness

  **Implementation Notes**:
  - Use `DataView` for multi-byte integers to ensure big-endian encoding
  - `setUint32(offset, value, false)` where `false` = big-endian
  - For byte arrays: create Uint8Array views and use `.set()` method
  - Base64: Use standard `btoa()`/`atob()` (handle Unicode properly with encodeURIComponent trick)
  - Total header size: 39 bytes (1+1+4+4+16+1+12) + encrypted data

  **Must NOT do**:
  - Don't use JSON (inefficient, no binary support)
  - Don't skip version header (locks into single algorithm)
  - Don't use ambiguous field separators

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Binary protocol design
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (after Task 4)
  - **Blocks**: Task 4 (encryption must use format)
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] Format specification documented in code comments
  - [ ] `serialize(metadata, ciphertext, tag)` implemented
  - [ ] `deserialize(serialized)` implemented
  - [ ] Test: `bun test src/__tests__/format.test.ts` → 8 tests pass
  - [ ] Test: Serialization roundtrip works
  - [ ] Test: Version byte is 0x01
  - [ ] Test: Base64 encoding/decoding works
  - [ ] Test: Corrupted format throws descriptive error

  **Commit**: YES
  - Message: `feat: Algorithm-agile ciphertext format with version headers`
  - Files: `src/format.js`, `src/__tests__/format.test.ts`

---

- [x] 6. Build UI (HTML/CSS)

  **What to do**:
  - Build clean, intuitive interface:
    - Section 1: Encrypt
      - Textarea for plaintext
      - Password input (with visibility toggle)
      - Encrypt button
      - Output area for ciphertext (copy button)
    - Section 2: Decrypt
      - Textarea for ciphertext
      - Password input
      - Decrypt button
      - Output area for plaintext
    - Section 3: Password Strength Meter
      - Real-time feedback bar
      - Crack time estimate
      - Suggestions for improvement
  - Style with CSS (dark theme recommended for security app)
  - Make it responsive (works on mobile)
  - Add copy-to-clipboard functionality

  **Must NOT do**:
  - Don't use external CSS frameworks (keep it standalone)
  - Don't require JavaScript for basic layout
  - Don't store passwords in localStorage

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Reason**: UI/UX design and implementation
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7 (strength meter is part of UI)
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] UI has encrypt and decrypt sections
  - [ ] Password inputs have visibility toggle
  - [ ] Encrypt/decrypt buttons trigger actions
  - [ ] Output areas have copy buttons
  - [ ] Playwright test: `bunx playwright test src/__tests__/ui.spec.ts` → passes
  - [ ] Screenshot: .sisyphus/evidence/ui-complete.png

  **Commit**: YES
  - Message: `feat: Build encryption/decrypt UI with password strength indicators`
  - Files: `src/index.html` (updated), `src/__tests__/ui.spec.ts`

---

### Wave 3: Features & Security

- [x] 7. Password Strength Meter (zxcvbn)

  **What to do**:
  - Integrate zxcvbn library: Use `zxcvbn` (Dropbox original, v4.4.0)
    ```javascript
    // EXACT LIBRARY AND USAGE PATTERN:
    // Install: npm install zxcvbn (NOT zxcvbn-ts, NOT zxcvbn2)
    // Import: import zxcvbn from 'zxcvbn';
    
    // Usage:
    const result = zxcvbn(password);
    // Returns: { score: 0-4, crack_times_display: {...}, feedback: {...} }
    
    // Score interpretation:
    // 0 = too guessable (weak)
    // 1 = very guessable (weak)
    // 2 = somewhat guessable (medium)
    // 3 = safely unguessable (strong)
    // 4 = very unguessable (very strong)
    
    // Display crack time:
    const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second;
    // e.g., "3 days", "7 years", "centuries"
    
    // Get suggestions:
    const suggestions = result.feedback.suggestions;
    // Array of suggestion strings
    ```
  - Download library to `src/lib/zxcvbn.js` for offline use
  - Add real-time password strength evaluation on input
  - Display visual strength bar (weak → medium → strong)
  - Show estimated crack time (use `offline_slow_hashing_1e4_per_second` metric)
  - Provide suggestions for stronger passwords
  - Reject weak passwords for encryption (optional, configurable)

  **Library Reference**:
  - **Package**: `zxcvbn` (original Dropbox version)
  - **Version**: 4.4.0 (last stable)
  - **Function**: `zxcvbn(password, userInputs?)`
  - **Returns**: Object with `score` (0-4), `crack_times_display`, `feedback`
  - **Alternative NOT to use**: `zxcvbn-ts` (different API, modern but incompatible)
  - **Browser bundle**: Use `dist/zxcvbn.js` from package

  **Must NOT do**:
  - Don't use simple length checks (zxcvbn is far superior)
  - Don't block encryption entirely (warn but allow)
  - Don't send passwords to any server

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Reason**: UI component integration
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 6

  **Acceptance Criteria**:
  - [ ] zxcvbn library at `src/lib/zxcvbn.js`
  - [ ] Strength meter shows on password input
  - [ ] Visual bar updates in real-time
  - [ ] Crack time estimate displayed
  - [ ] Test: `bun test src/__tests__/password-strength.test.ts` → passes
  - [ ] Screenshot: Password "password" shows "weak", "correct-horse-battery-staple" shows "strong"

  **Commit**: YES
  - Message: `feat: Add zxcvbn password strength meter with crack time estimates`
  - Files: `src/lib/zxcvbn.js`, `src/password-strength.js`, `src/__tests__/password-strength.test.ts`

---

- [x] 8. Security Audit + CSP Headers

  **What to do**:
  - Implement strict Content Security Policy:
    ```
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    connect-src 'none';
    img-src 'none';
    font-src 'none';
    frame-ancestors 'none';
    base-uri 'none';
    form-action 'none';
    ```
  - Add `<meta http-equiv="Content-Security-Policy" content="...">`
  - Verify no external network requests
  - Add security headers for server deployment
  - Document security model and threat mitigations

  **Must NOT do**:
  - Don't allow 'unsafe-eval' (use 'wasm-unsafe-eval' for WASM)
  - Don't allow external scripts
  - Don't allow inline event handlers (use addEventListener)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Security configuration
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 9
  - **Blocked By**: Task 6, 7

  **Acceptance Criteria**:
  - [ ] CSP meta tag in HTML head
  - [ ] No CSP violations in browser console
  - [ ] Playwright test: No external network requests made
  - [ ] Security documentation in `docs/security.md`
  - [ ] Screenshot: Browser console shows zero CSP errors

  **Commit**: YES
  - Message: `security: Implement strict CSP headers and security documentation`
  - Files: `src/index.html` (CSP), `docs/security.md`

---

- [x] 9. Testing Suite

  **What to do**:
  - Unit tests for all crypto functions (already done in tasks 3, 4, 5)
  - Integration tests for full encrypt/decrypt flow
  - E2E tests with Playwright:
    - Encrypt flow
    - Decrypt flow
    - Wrong password handling
    - Password strength meter
  - Performance tests:
    - Argon2id completes in <2000ms
    - Encrypt/decrypt 1KB text in <100ms
  - Edge case tests:
    - Empty plaintext
    - Unicode characters
    - Large files (1MB+)
    - Special characters in passwords

  **Must NOT do**:
  - Don't skip testing on actual Pi Zero 2
  - Don't use mock crypto in production tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Comprehensive testing
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 10, 11, 12
  - **Blocked By**: All previous tasks

  **Acceptance Criteria**:
  - [ ] Unit tests: `bun test` → 100% pass rate
  - [ ] E2E tests: `bunx playwright test` → all pass
  - [ ] Performance test: Argon2id <2000ms
  - [ ] Performance test: 1KB encrypt <100ms
  - [ ] Coverage report generated

  **Commit**: YES
  - Message: `test: Complete testing suite with unit, integration, and E2E tests`
  - Files: `src/__tests__/*.test.ts`, `playwright.config.ts`

---

### Wave 3.5: Advanced Security Features (Paranoid Mode)

**Note**: These features address the gap between user expectation ("ultimate encryption") and standard implementation. They provide tangible security benefits for targeted threat models.

- [x] 10. Security Philosophy & Threat Model Document

  **What to do**:
  - Create `docs/philosophy.md` that honestly addresses:
    - Why standard algorithms are the "ultimate" choice (battle-tested, no custom crypto)
    - Explicit acknowledgment that password-based encryption cannot resist infinite compute
    - Clear threat model: what it CAN protect against vs what it CANNOT
    - Honest limitations section
  - Include comparison table: Encyphrix vs other tools (Veracrypt, Hat.sh, etc.)
  - Frame "using standard algorithms correctly" as the ultimate achievement
  - Address the "innovation" question: Innovation is in UX/accessibility, not novel crypto

  **Must NOT do**:
  - Don't make false claims about quantum resistance beyond AES-256's actual capabilities
  - Don't promise infinite compute resistance
  - Don't disparage other tools unfairly

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Reason**: Technical writing and philosophy documentation
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `docs/philosophy.md` exists with honest threat model
  - [ ] Document explicitly states "infinite compute resistance is impossible"
  - [ ] Clear "What this protects against" vs "What this cannot protect against" sections
  - [ ] Comparison table with at least 3 other encryption tools
  - [ ] Security theater vs real security distinction explained

  **Commit**: YES
  - Message: `docs: Add security philosophy and honest threat model`
  - Files: `docs/philosophy.md`

---

- [x] 11. Duress Password Support

  **What to do**:
  - Implement duress password feature:
    - Primary password → real plaintext
    - Duress password → fake/decoy plaintext (configurable)
  - UI: Checkbox "Enable duress password" during encryption
  - When decrypting with duress password, show fake message (user-defined)
  - Duress password derives different key via different salt path
  - Write tests for duress functionality

  **Must NOT do**:
  - Don't store any indication that duress mode exists
  - Don't use different UI flow for duress (appears to work normally)
  - Don't allow duress password to be same as primary

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Reason**: Security-critical feature for targeted users
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: Task 4 (needs encryption working)

  **Acceptance Criteria**:
  - [ ] Duress password option in encryption UI
  - [ ] Duress password produces different output than primary
  - [ ] Test: `bun test src/__tests__/duress.test.ts` → 6 tests pass
  - [ ] Test: Same ciphertext decrypts to different plaintexts with different passwords
  - [ ] Test: No metadata indicates duress mode
  - [ ] Documentation: `docs/duress.md`

  **Commit**: YES
  - Message: `feat: Add duress password support for coercion resistance`
  - Files: `src/duress.js`, `src/__tests__/duress.test.ts`, `docs/duress.md`

---

- [x] 12. Ciphertext Stealth Features

  **What to do**:
  - Implement optional ciphertext stealth modes:
    1. **Random Noise Mode**: Output appears as random bytes (no version headers visible)
       - Prepend random bytes before actual ciphertext
       - Store offset to real data in derived key material
    2. **Steganography Mode**: Hide ciphertext in PNG images (LSB steganography)
    3. **Padding Mode**: Pad to fixed block sizes (hide message length)
  - UI: Toggle for "Stealth Mode" with sub-options
  - Must still work with standard decryption (backward compatible)
  - Write tests for each stealth mode

  **Must NOT do**:
  - Don't make stealth mode default (harder to debug)
  - Don't use steganography that significantly degrades image quality
  - Don't require external tools for extraction

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Reason**: Advanced security features requiring precision
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: Task 5 (needs format defined)

  **Acceptance Criteria**:
  - [ ] Random noise mode: Output passes chi-square randomness test
  - [ ] Steganography mode: Can hide ciphertext in PNG without visible distortion
  - [ ] Padding mode: Different length messages produce same size output
  - [ ] Test: `bun test src/__tests__/stealth.test.ts` → 9 tests pass
  - [ ] All stealth modes decryptable with standard decrypt function
  - [ ] Documentation: `docs/stealth.md`

  **Commit**: YES
  - Message: `feat: Add ciphertext stealth features (noise mode, steganography, padding)`
  - Files: `src/stealth.js`, `src/__tests__/stealth.test.ts`, `docs/stealth.md`

---

- [x] 13. Self-Destruct Mode

  **What to do**:
  - Implement optional self-destruct for ciphertext:
    - Checkbox "One-time decryption" during encryption
    - Store flag in ciphertext metadata
    - After first successful decrypt, overwrite ciphertext with zeros (if file)
    - For clipboard output: clear clipboard after timeout
  - Warning: Cannot enforce self-destruct if recipient saves copy
  - Focus on UX: Make it easy to use one-time messages

  **Must NOT do**:
  - Don't claim this prevents copying (it doesn't)
  - Don't use DRM-style techniques (futile and hostile)
  - Don't make it default (surprising behavior)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: UX feature with security implications
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] Self-destruct checkbox in encryption UI
  - [ ] Flag stored in ciphertext format
  - [ ] Visual indicator in decryption UI when self-destruct enabled
  - [ ] Test: `bun test src/__tests__/self-destruct.test.ts` → passes
  - [ ] Documentation: `docs/self-destruct.md`

  **Commit**: YES
  - Message: `feat: Add optional self-destruct mode for one-time messages`
  - Files: `src/self-destruct.js`, `src/__tests__/self-destruct.test.ts`, `docs/self-destruct.md`

---

- [x] 14. Offline-First Distribution

  **What to do**:
  - Ensure single HTML file works completely offline:
    - Test with `file://` protocol (no server)
    - Verify no external network requests
    - Include all resources embedded (no CDN, no external fonts)
  - Create `docs/air-gapped.md` with instructions for air-gapped usage:
    - Download HTML to USB
    - Use on laptop never connected to internet
    - Tails OS integration guide
    - Qubes OS disposable VM workflow
  - Create build script to verify offline capability
  - Add "Offline Mode" badge in UI

  **Must NOT do**:
  - Don't require any network for core functionality
  - Don't use service workers (cache confusion)
  - Don't require HTTPS for `file://` usage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Deployment security configuration
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] App works with `file://` protocol (test in browser)
  - [ ] Zero network requests in DevTools Network tab
  - [ ] Playwright test: `src/__tests__/offline.spec.ts` → passes
  - [ ] Documentation: `docs/air-gapped.md` with Tails/Qubes guides
  - [ ] Build script verifies offline capability

  **Commit**: YES
  - Message: `feat: Ensure complete offline/air-gapped functionality`
  - Files: `docs/air-gapped.md`, build verification script

---

- [x] 15. Reproducible Build System

  **What to do**:
  - Implement reproducible builds (same source → same binary, bit-for-bit):
    - Pin all dependency versions with exact hashes
    - Create deterministic build script
    - Generate SRI (Subresource Integrity) hashes for all resources
    - Document build process for verification
  - Create `scripts/build.sh` that produces deterministic output
  - Add verification instructions: "Build yourself and compare hashes"
  - Sign releases with GPG (optional but recommended)
  - Create `docs/build-verification.md`

  **Must NOT do**:
  - Don't use floating versions in package.json
  - Don't rely on non-deterministic build tools
  - Skip: Formal verification (impossible for full app)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Supply chain security
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Build script produces identical output on multiple runs
  - [ ] SRI hashes generated for all resources
  - [ ] Documentation: `docs/build-verification.md` with instructions
  - [ ] Test: Build twice, compare hashes → match
  - [ ] CI check verifies reproducibility

  **Commit**: YES
  - Message: `security: Implement reproducible builds and SRI hashes`
  - Files: `scripts/build.sh`, `docs/build-verification.md`, CI reproducibility check

---

### Wave 4: Deployment

- [x] 16. Pi Zero 2 Optimization

  **What to do**:
  - Test on actual Raspberry Pi Zero 2 hardware
  - Profile Argon2id performance and adjust params if needed
  - Optimize memory usage (garbage collection hints)
  - Minify HTML/CSS/JS for smaller file size
  - Consider splitting WASM loading for lower memory usage
  - Document optimal browser for Pi Zero 2 (Chromium vs Firefox)

  **Must NOT do**:
  - Don't reduce Argon2id memory below 64MB without user consent
  - Don't skip actual hardware testing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Performance optimization for constrained hardware
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 9

  **Acceptance Criteria**:
  - [ ] Tested on Raspberry Pi Zero 2
  - [ ] Argon2id completes in <2000ms on Pi Zero
  - [ ] No out-of-memory errors
  - [ ] Documentation: `docs/pi-zero-2.md`
  - [ ] Optimized file size <2MB total

  **Commit**: YES
  - Message: `perf: Optimize for Raspberry Pi Zero 2 deployment`
  - Files: `docs/pi-zero-2.md`, optimizations in source

---

- [x] 17. Docker Deployment Config

  **What to do**:
  - Create `Dockerfile`:
    - Use nginx:alpine base image
    - Copy static files
    - Configure nginx with security headers
  - Create `docker-compose.yml` for easy deployment
  - Create `.dockerignore`
  - Test build and run locally
  - Document deployment instructions

  **Must NOT do**:
  - Don't use heavy base images (no Ubuntu/full Node)
  - Don't expose unnecessary ports

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Reason**: Standard Docker setup
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 15

  **Acceptance Criteria**:
  - [ ] `Dockerfile` builds successfully
  - [ ] `docker-compose up` serves app on port 80
  - [ ] Container size <20MB
  - [ ] Security headers present in responses
  - [ ] Playwright tests pass against Docker container
  - [ ] Documentation: `docs/deployment.md`

  **Commit**: YES
  - Message: `feat: Add Docker deployment configuration`
  - Files: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docs/deployment.md`

---

- [x] 18. Documentation

  **What to do**:
  - Create comprehensive README:
    - What is Encyphrix
    - How to use (encrypt/decrypt)
    - Security model explanation
    - Password recommendations
    - Self-hosting instructions
  - Create `docs/architecture.md`:
    - Algorithm choices
    - Ciphertext format specification
    - Threat model
  - Create `docs/security.md`:
    - What threats it protects against
    - What threats it doesn't protect against
    - Limitations (browser memory wiping, etc.)
  - Add inline code comments
  - Create LICENSE file (MIT or GPL)

  **Must NOT do**:
  - Don't make security claims you can't prove
  - Don't hide limitations

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Reason**: Technical documentation
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 16, 17

  **Acceptance Criteria**:
  - [ ] `README.md` with usage instructions
  - [ ] `docs/architecture.md` with technical details
  - [ ] `docs/security.md` with threat model
  - [ ] `LICENSE` file present
  - [ ] All public functions have JSDoc comments

  **Commit**: YES
  - Message: `docs: Complete documentation with security model and usage guide`
  - Files: `README.md`, `docs/*.md`, `LICENSE`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: Initial project setup with HTML structure and CSP` | src/index.html, package.json, .gitignore | bun test passes |
| 2 | `feat: Integrate libsodium.js WASM and Web Crypto API` | src/crypto.js, src/lib/libsodium.js | crypto init test passes |
| 3 | `feat: Implement Argon2id KDF with 64MB memory` | src/crypto.js (KDF), tests | kdf tests pass |
| 4 | `feat: Implement AES-256-GCM encryption` | src/crypto.js (encrypt/decrypt), tests | encryption tests pass |
| 5 | `feat: Algorithm-agile ciphertext format` | src/format.js, tests | format tests pass |
| 6 | `feat: Build encryption/decrypt UI` | src/index.html (updated), tests | Playwright tests pass |
| 7 | `feat: Add zxcvbn password strength meter` | src/lib/zxcvbn.js, src/password-strength.js | strength tests pass |
| 8 | `security: Implement strict CSP headers` | src/index.html (CSP), docs/security.md | No CSP violations |
| 9 | `test: Complete testing suite` | src/__tests__/*, playwright.config.ts | All tests pass |
| 10 | `perf: Optimize for Raspberry Pi Zero 2` | docs/pi-zero-2.md, optimizations | <2000ms on Pi |
| 11 | `feat: Add Docker deployment` | Dockerfile, docker-compose.yml | Docker builds/runs |
| 12 | `docs: Complete documentation` | README.md, docs/*.md, LICENSE | - |

---

## Success Criteria

### Verification Commands
```bash
# Unit tests
bun test
# Expected: All tests pass (25+ tests)

# E2E tests
bunx playwright test
# Expected: All scenarios pass

# Performance test (on Pi Zero 2)
bun test src/__tests__/performance.test.ts
# Expected: Argon2id <2000ms, Encrypt <100ms

# Docker build
docker build -t encyphrix .
docker run -p 8080:80 encyphrix
# Expected: App serves on localhost:8080
```

### Final Checklist
- [x] All unit tests pass
- [x] All E2E tests pass
- [x] Argon2id completes in <2000ms on Pi Zero 2
- [x] No CSP violations
- [x] Docker container builds and runs
- [x] Password strength meter works
- [x] Encrypt/decrypt roundtrip works
- [x] Wrong password fails appropriately
- [x] Documentation complete
- [x] Security model documented

---

## Post-Quantum Considerations (Documented for Future)

While this implementation uses AES-256-GCM (256-bit symmetric encryption), it is already resistant to quantum attacks via Grover's algorithm (which effectively reduces 256-bit security to 128-bit quantum security). The ciphertext format includes version headers to allow future migration to post-quantum algorithms if needed.

**Future Migration Path**:
1. Add new cipher algorithm ID (0x02 = CRYSTALS-Kyber derived symmetric key)
2. Maintain backward compatibility with version 1
3. Allow users to re-encrypt with new algorithms
4. Keep Argon2id KDF (memory-hard, quantum-resistant)

This design provides maximum practical security today with a clear upgrade path for tomorrow.

---

## Notes

**Why No ML-KEM/Post-Quantum Asymmetric?**
ML-KEM solves the "secure key distribution" problem. Since this app uses password-based encryption (both parties know the password), there's no key to distribute. 256-bit symmetric encryption with a memory-hard KDF provides equivalent or better security for this use case without the complexity of asymmetric cryptography.

**Why Not Cascade Encryption?**
Cascading multiple ciphers (e.g., AES then ChaCha20) adds complexity without proven security benefits. Modern ciphers like AES-256-GCM already provide 256-bit security—cascading doesn't double the security bits. The Oracle consultation explicitly recommended against cascading for this use case.

**Password Entropy is King**
No amount of cryptography can protect a weak password. The zxcvbn strength meter and documentation emphasize the critical importance of strong, unique passwords or passphrases.

---

*Plan created by Prometheus after comprehensive research and Oracle consultation. Ready for execution via `/start-work`.*
