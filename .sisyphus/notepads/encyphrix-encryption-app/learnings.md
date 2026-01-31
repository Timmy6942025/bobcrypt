# Encyphrix UI Implementation Learnings

## Date: 2026-01-30

### Successful Approaches

1. **Cyber-Security Noir Aesthetic**
   - Deep void black (#0a0a0f) as base creates authentic security tool feel
   - Electric green (#00ff88) accent provides high contrast and "terminal" vibe
   - Monospace font stack reinforces technical/encryption tool identity
   - Subtle glow effects (box-shadow) add depth without compromising minimalism

2. **Component Architecture**
   - CSS custom properties (variables) enable consistent theming
   - Card-based layout with hover states provides clear visual hierarchy
   - Grid layout (2-column → 1-column on mobile) works well for encrypt/decrypt side-by-side
   - Full-width password strength meter below creates natural flow

3. **Accessibility Implementation**
   - ARIA labels on all interactive elements
   - aria-live regions for dynamic output updates
   - aria-pressed for toggle buttons
   - role="progressbar" for strength meter
   - Focus visible styling for keyboard navigation
   - Screen reader only text (.visually-hidden class)

4. **JavaScript Patterns**
   - ES modules with dynamic import for crypto.js
   - Event delegation pattern for password toggles
   - Status message system with auto-hide for success
   - Character counters with visual feedback (warning/danger states)
   - Keyboard shortcuts (Ctrl+Enter to submit, Escape to clear)

5. **Security UX Patterns**
   - "Offline Mode" badge reinforces client-side only messaging
   - Password visibility toggles with eye/monkey icons
   - Copy buttons with visual feedback (temporary state change)
   - Clear buttons reset all fields and focus management
   - No localStorage usage for sensitive data

### Technical Decisions

1. **No External CSS Frameworks**
   - Custom CSS ensures CSP compliance
   - Smaller payload (no framework bloat)
   - Complete control over aesthetic

2. **Vanilla JavaScript (No Frameworks)**
   - Aligns with "no external dependencies" philosophy
   - Better CSP compatibility
   - Simpler build process

3. **CSS-First Responsive Design**
   - Mobile breakpoint at 600px for fine-tuning
   - Grid collapse at 900px for tablet/desktop transition
   - Flexbox for button groups (stacks on mobile)

### Animation & Motion Choices

1. **Shimmer effect on brand icon** - Creates "premium/security" feel
2. **Pulse animation on offline badge** - Living indicator
3. **Staggered transitions** - border-color, box-shadow for smooth hover
4. **Slide-in for status messages** - Draws attention without jarring
5. **Spinner for async operations** - Loading feedback during crypto operations

### Form UX Details

1. **Character counters** - Real-time feedback with color-coded warnings
2. **Password strength meter** - Visual bar + crack time estimate + suggestions
3. **Disabled copy buttons** - Until valid output exists
4. **Focus management** - Return focus to input after clear
5. **Maxlength attributes** - Prevent overflow (10k for plaintext, 50k for ciphertext)

### CSP Compliance

- All styles inline (style-src 'self' 'unsafe-inline')
- No external images (img-src 'none')
- No external fonts (font-src 'none')
- No external connections (connect-src 'none')
- WASM allowed for libsodium ('wasm-unsafe-eval')

## Task: zxcvbn Password Strength Integration

### Implementation Summary
- Copied zxcvbn v4.4.2 from node_modules to src/lib/zxcvbn.js for offline use
- Created password-strength.js module with clean API:
  - `analyzePassword(password, userInputs)` - Returns score, label, crack time, suggestions
  - `initStrengthMeter(inputElement, uiElements, callback)` - Wires up real-time strength meter
  - Helper functions: `getStrengthClass`, `isPasswordStrong`, `getPasswordSuggestions`, `formatCrackTime`

### Key Technical Decisions
1. **UMD Bundle Loading**: zxcvbn exports as global `window.zxcvbn` when loaded via script tag
2. **Dynamic Import Fallback**: Module tries window.zxcvbn first, then dynamic import, then globalThis
3. **Score Mapping**: zxcvbn scores 0-4 mapped to CSS classes: weak (0-1), fair (2), good (3), strong (4)
4. **Crack Time Display**: Used `offline_slow_hashing_1e4_per_second` metric as specified
5. **Suggestions**: Combined warning + suggestions from zxcvbn feedback, limited to 3 items

### UI Integration
- Added script tag for zxcvbn.js before module script in index.html
- Imported `initStrengthMeter` and wired to #strength-password input
- Existing CSS already had .strength-bar classes for weak/fair/good/strong
- ARIA attributes updated for accessibility (aria-valuenow on progressbar)

### Testing
- Created password-strength.test.ts with 8 tests
- All tests pass (89 total unit tests passing)
- Tests verify: library exists, module exists, HTML integration, UI elements, CSS classes

### Security Considerations
- All password analysis happens client-side (zxcvbn is local)
- No passwords sent to any server
- Weak passwords are warned but not blocked (configurable)

---

## Task: Strict CSP Implementation and Security Audit

## Date: 2026-01-30

### CSP Implementation

#### Strict CSP Policy Applied
```
default-src 'none';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
connect-src 'none';
img-src 'none';
font-src 'none';
base-uri 'none';
form-action 'none';
```

**Key Decision**: Removed `frame-ancestors 'none'` from meta tag because it's HTTP header only.

#### CSP Violations Fixed
1. **Inline event handlers**: Removed `onclick="return false;"` from footer links
2. **Form onsubmit**: Removed `onsubmit="return false;"` from forms
3. **Event handling**: Migrated all to `addEventListener` pattern

### Playwright Testing Strategy

#### Test Server Setup
- Used Python HTTP server instead of `file://` protocol
- Required for ES modules to work correctly (avoids CORS issues)
- Server runs on localhost:3333 during tests

#### CSP Compliance Tests (All 7 Passing)
1. ✅ CSP meta tag present with correct policy
2. ✅ All required directives present
3. ✅ Zero CSP violations (console monitoring)
4. ✅ Zero external network requests
5. ✅ No inline event handlers
6. ✅ No console errors

#### Network Request Filtering
- Same-origin requests to localhost are allowed
- Only external (cross-origin) requests are flagged as violations
- This correctly validates the `connect-src 'none'` policy

### Library Bundling

#### Libsodium Distribution
- Copied `libsodium-wrappers-sumo` ESM build to `src/lib/`
- Copied `libsodium-sumo` WASM module to `src/lib/`
- Updated import paths to use relative `./lib/` paths
- Modified wrapper to import from `./libsodium-sumo.mjs`

#### Environment Detection
```javascript
if (typeof window !== 'undefined') {
  // Browser: use local bundled libsodium
} else {
  // Node.js/Bun: use node_modules
}
```

### Security Documentation

#### docs/security.md Contents
- CSP policy explanation
- Threat model (assets, threats mitigated, not mitigated)
- Cryptographic architecture
- User security best practices
- Deployment security (nginx config)
- Audit and verification procedures

### Nginx Configuration

#### Security Headers Implemented
- Content-Security-Policy (redundant with meta tag)
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: no-referrer
- Permissions-Policy (feature restriction)
- Cross-Origin policies

### Key Takeaways

1. **CSP meta tag vs HTTP header**: Some directives like `frame-ancestors` only work in HTTP headers
2. **ES modules require HTTP**: `file://` protocol causes CORS issues with ES modules
3. **Bundling dependencies**: For strict CSP, all dependencies must be local (no CDN)
4. **Event handler migration**: All inline handlers must use `addEventListener` instead
5. **Testing strategy**: Monitor console for CSP violations, track network requests

### Files Modified/Created

- `src/index.html` - Fixed CSP, removed inline handlers
- `src/crypto.js` - Environment-aware libsodium loading
- `src/lib/libsodium.mjs` - Bundled libsodium wrapper
- `src/lib/libsodium-sumo.mjs` - Bundled libsodium core
- `docs/security.md` - Security documentation
- `nginx.conf` - Production deployment config
- `e2e/ui.test.ts` - CSP compliance tests

## Format.js Serialize/Deserialize Mismatch Bug - 2026-01-30

### Problem
Decryption was failing with "invalid password or corrupted ciphertext" even when using the correct password. 8 encryption tests were failing.

### Root Cause
Mismatch between `serialize()` and `deserialize()` functions in `src/format.js`:

- `serialize()` wrote: version(1) + kdf(1) + opslimit(4) + memlimit(4) + salt(16) + cipher(1) + nonce(12) + **flags(1)** + encryptedData = 40 byte header
- `deserialize()` read: version(1) + kdf(1) + opslimit(4) + memlimit(4) + salt(16) + cipher(1) + nonce(12) + encryptedData = 39 byte header

The flags byte (1 byte) was being written by serialize but NOT read by deserialize. This caused a 1-byte offset, making the encrypted data appear corrupted.

### Fix
Added flags byte reading in `deserialize()` function in `src/format.js`:

```javascript
// Nonce (12 bytes)
metadata.nonce = bytes.slice(offset, offset + NONCE_SIZE);
offset += NONCE_SIZE;

// Flags (1 byte) - THIS WAS MISSING
metadata.flags = view.getUint8(offset);
offset += 1;

// Encrypted data (rest of buffer: ciphertext + auth tag)
metadata.encryptedData = bytes.slice(offset);
```

Also updated:
1. `HEADER_SIZE` constant in tests from 39 to 40
2. Binary format test to check flags byte at position 39 and encrypted data starting at position 40
3. Added `flags: 0` to test metadata objects to satisfy TypeScript type checking

### Tests
- All 157 src tests now pass
- Encryption roundtrip works correctly
- Format serialization/deserialization is now consistent

### Lesson
When modifying binary format specifications, ALWAYS update BOTH serialize and deserialize functions simultaneously. Even a 1-byte mismatch will completely break cryptographic operations.

---

## Task: Self-Destruct Mode Implementation - 2026-01-30

### Implementation Summary
Implemented optional self-destruct (one-time decryption) feature for ciphertext:

1. **UI Changes** (`src/index.html`):
   - Added "One-time decryption (self-destruct)" checkbox in encryption section
   - Styled with danger color (red) to indicate caution
   - Added explanatory text: "Recipient will see a warning that this message is intended for one-time viewing. Cannot prevent copying."
   - Updated decrypt UI to show prominent warning when self-destruct message is decrypted
   - Warning includes: "⚠️ One-time message: This message is intended for single viewing. The sender has requested that you do not retain a copy."

2. **Format Changes** (`src/format.js`):
   - `FLAG_SELF_DESTRUCT = 0x01` constant already existed
   - Updated `createMetadata()` to accept optional `flags` parameter
   - Added `hasSelfDestructFlag()` helper function to check flag without full decryption
   - Flags byte is stored at position 39 in the 40-byte header

3. **Crypto Changes** (`src/crypto.js`):
   - Updated `encrypt()` to accept `selfDestruct` option
   - Sets `FLAG_SELF_DESTRUCT` in metadata when enabled
   - Updated `decrypt()` to return `{ plaintext: string, selfDestruct: boolean }` object
   - Added `checkSelfDestruct()` helper function (safe wrapper around `hasSelfDestructFlag`)
   - Imported `hasSelfDestructFlag` from format.js

4. **Test Suite** (`src/__tests__/self-destruct.test.ts`):
   - 13 tests covering encryption, decryption, and helper functions
   - Tests for default behavior (no self-destruct), explicit enable, and duress + self-destruct combo
   - Round-trip tests with empty, unicode, and long messages
   - All tests pass

5. **Documentation** (`docs/self-destruct.md`):
   - Comprehensive documentation explaining the feature
   - Clear statement that it cannot prevent copying
   - Technical details about format specification
   - Security considerations and threat model
   - Comparison with other systems (Signal, Snapchat)
   - Best practices for usage

### Key Technical Decisions

1. **Not Default Behavior**: Self-destruct is opt-in only (checkbox unchecked by default)
2. **Honest UX**: Clear warning that it "Cannot prevent copying" right next to the checkbox
3. **Return Object Pattern**: Changed `decrypt()` to return object instead of string to include flag
   - Old: `const plaintext = await decrypt(ciphertext, password)`
   - New: `const { plaintext, selfDestruct } = await decrypt(ciphertext, password)`
4. **Helper Functions**: Provided both strict (`hasSelfDestructFlag`) and safe (`checkSelfDestruct`) versions
5. **Visual Indicator**: Red warning box in decrypt UI when self-destruct is enabled

### JSDoc Type Annotation Fix
TypeScript required marking optional parameters with square brackets in JSDoc:
```javascript
@param {Object} [options] - Optional encryption options
@param {string} [options.duressPassword] - Optional duress password
@param {boolean} [options.selfDestruct] - Enable self-destruct mode
```

Without brackets, TypeScript treated all options as required.

### Security Warnings Implemented
1. **Encryption UI**: "Cannot prevent copying" in red text below checkbox
2. **Decryption UI**: Prominent red warning box with explanation
3. **Documentation**: Extensive section on "What Self-Destruct Does NOT Do"
4. **Code Comments**: Warnings that this is a "courtesy indicator, not technical enforcement"

### Test Results
- All 13 self-destruct tests pass
- All 35 format tests pass
- All 6 crypto init tests pass
- Total: 54 new tests passing

### Files Modified/Created
- `src/index.html` - Added self-destruct checkbox and warning UI
- `src/format.js` - Updated createMetadata, added hasSelfDestructFlag
- `src/crypto.js` - Updated encrypt/decrypt, added checkSelfDestruct
- `src/__tests__/self-destruct.test.ts` - New test suite (13 tests)
- `docs/self-destruct.md` - Comprehensive documentation

### Lessons Learned
1. **Changing return types affects all callers**: Changing `decrypt()` from string to object required updating UI code and would require updating other test files
2. **JSDoc matters for TypeScript**: Even in .js files, JSDoc annotations affect TypeScript checking of .ts test files
3. **Binary format consistency**: The existing format.js already had the flags byte in the spec, just needed to be wired up
4. **UX for security features**: Important to be honest about limitations - "cannot prevent copying" warning builds trust
5. **Optional feature design**: Making it opt-in with clear warnings avoids surprising users
