# Encyphrix - Project Knowledge Base

**Generated:** 2026-02-01
**Commit:** 21d81ba
**Branch:** master

## OVERVIEW
Paranoid-grade browser encryption tool. Client-side only, zero network requests. Uses AES-256-GCM + Argon2id via libsodium.

## STRUCTURE
```
encyphrix/
├── src/                    # Application source
│   ├── crypto.js           # Core encrypt/decrypt + stealth modes
│   ├── format.js           # Ciphertext serialization
│   ├── stealth.js          # Noise/padding obfuscation
│   ├── password-strength.js # zxcvbn integration
│   ├── index.html          # Main UI (67KB, loads crypto modules)
│   ├── key-manager/        # Key management module (see subdir AGENTS.md)
│   ├── lib/                # Vendored libsodium + zxcvbn
│   └── __tests__/          # Unit tests (Bun)
├── e2e/                    # Playwright E2E tests
├── docs/                   # Security & architecture docs
├── scripts/                # Build.sh (reproducible builds)
├── nginx.conf              # Production config with strict CSP
└── package.json            # Bun project, type: module
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Encrypt/decrypt logic | `src/crypto.js` | initCrypto(), encrypt(), decrypt() |
| Ciphertext format | `src/format.js` | Headers, serialization, versioning |
| Stealth modes | `src/stealth.js` | Noise, padding, combined obfuscation |
| Password strength | `src/password-strength.js` | zxcvbn wrapper |
| Key management | `src/key-manager/` | Mnemonic phrases, storage, generation |
| UI entry point | `src/index.html` | Inline module script, imports crypto.js |
| Vendored crypto | `src/lib/` | libsodium.mjs, libsodium-sumo.mjs, zxcvbn.js |
| Tests | `src/__tests__/` | 22 unit test files using Bun |
| E2E tests | `e2e/` | 3 Playwright spec files |
| Build system | `scripts/build.sh` | Reproducible builds with SHA/SRI hashes |
| Docker | `Dockerfile`, `docker-compose.yml` | Security-hardened nginx container |
| Nginx config | `nginx.conf` | Strict CSP: connect-src 'none' |

## CONVENTIONS

### Code Style
- **ES modules**: `"type": "module"` in package.json
- **Mixed extensions**: Mostly .js, some .ts (types.ts), no tsconfig.json
- **No linting**: No ESLint/Prettier configured
- **Security-first**: All code assumes zero-trust environment

### Module Organization
- **Flat src/**: Core modules at root (crypto.js, format.js, stealth.js)
- **Barrel exports**: `src/key-manager/index.js` aggregates submodule exports
- **Vendored deps**: `src/lib/` contains 2MB+ of vendored libsodium/zxcvbn

### Testing
- **Unit**: Bun test runner, 22 test files in `src/__tests__/`
- **E2E**: Playwright with Chromium/Firefox/WebKit
- **Test location**: Non-standard (nested in src/__tests__/)

### Build & Deploy
- **No bundler**: Raw files served via Python http.server or nginx
- **Reproducible builds**: Custom bash script with hash verification
- **Security headers**: Strict CSP blocks all network connections
- **Docker**: Non-root user, read-only filesystem, no-new-privileges

## ANTI-PATTERNS (THIS PROJECT)

### NEVER Do
- **Network requests**: `connect-src 'none'` CSP forbids all network access
- **Modify vendored libs**: Files in `src/lib/` are frozen copies
- **Break reproducibility**: Build must produce identical hashes given same inputs

### Code Patterns to Avoid
- **CommonJS require()**: Use ES imports (though crypto.js has fallback)
- **Inline eval()**: Blocked by CSP, causes runtime errors
- **External resources**: No CDN links, no external fonts/scripts
- **Weak passwords**: App enforces strong password requirements

### Testing Anti-Patterns
- **Skip crypto tests**: All crypto functionality must have tests
- **Mock libsodium**: Use real crypto in tests (deterministic with fixed seeds)
- **Ignore CSP violations**: E2E tests verify zero network requests

## UNIQUE STYLES

### Security Model
1. **Zero network**: No fetch/XHR/WebSocket allowed (CSP-enforced)
2. **Client-side only**: All encryption in browser, no server processing
3. **Reproducible builds**: Bit-for-bit identical builds for verification
4. **Coercion resistance**: Duress passwords show fake content

### Ciphertext Features
- **Duress passwords**: Secondary password → fake plaintext
- **Stealth modes**: Random noise + padding to hide structure
- **Self-destruct flag**: Courtesy indicator for one-time viewing
- **Base64 encoding**: URL-safe ciphertext transport

### Development Approach
- **Bun-first**: Uses Bun runtime (specified in engines)
- **Python fallback**: `python3 || python` for maximum compatibility
- **No build step**: Development serves raw src/ files
- **Sisyphus tracking**: `.sisyphus/boulder.json` for plan management

## COMMANDS

```bash
# Development
bun run serve              # Python http.server on port 3000

# Testing
bun run test               # Unit tests (22 files)
bun run test:watch         # Watch mode
bun run test:e2e           # Playwright E2E tests

# Build
bun run build              # Reproducible build to ./dist/
bun run build:verify       # Build + verify integrity
bun run build:test-reproducibility  # Build twice, compare hashes

# Docker
docker-compose up          # Security-hardened container on port 80
```

## NOTES

### Critical Security Properties
- **Password-based**: Cannot resist infinite compute (mathematical reality)
- **Argon2id**: Memory-hard KDF makes brute-force expensive
- **No backdoors**: Lost password = lost data, no recovery possible
- **Honest limitations**: See docs/philosophy.md for threat model

### Known Issues
- **Duplicate test:e2e**: Defined twice in package.json (lines 9, 11)
- **No tsconfig.json**: TypeScript files exist but no compiler config
- **No CI/CD**: No .github/workflows/ configured
- **67KB HTML**: index.html is monolithic (contains inline scripts)

### Dependencies
- **libsodium-wrappers**: Crypto primitives (Argon2, AES-GCM)
- **zxcvbn**: Password strength estimation
- **Bun**: Required runtime (>=1.0.0)
- **Playwright**: E2E testing (1.58.0 pinned)

### File Size Context
- `src/lib/libsodium-sumo.mjs`: ~1.8MB (cryptographic library)
- `src/lib/zxcvbn.js`: ~800KB (password strength)
- `src/index.html`: ~67KB (monolithic UI)
- `src/key-manager/wordlist-data.json`: ~101KB (BIP39 wordlist)

---

*This AGENTS.md was generated by init-deep. See src/key-manager/AGENTS.md for key management specifics.*
