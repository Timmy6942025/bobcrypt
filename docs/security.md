# Encyphrix Security Documentation

## Overview

Encyphrix is designed with a **paranoid-grade security model** that prioritizes client-side encryption, zero network exposure, and defense in depth. This document explains the security architecture, threat model, and mitigations implemented.

## Content Security Policy (CSP)

### Implemented Policy

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

### Policy Explanation

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src 'none'` | Blocks all resources by default | Defense in depth - deny by default |
| `script-src 'self'` | Only allow scripts from same origin | Prevents XSS from external scripts |
| `script-src 'unsafe-inline'` | Allow inline scripts | Required for single-file architecture |
| `script-src 'wasm-unsafe-eval'` | Allow WASM compilation | Required for libsodium.js WASM |
| `style-src 'self' 'unsafe-inline'` | Allow inline styles | Required for CSS-in-HTML approach |
| `connect-src 'none'` | Block all network requests | **Critical**: Ensures no data exfiltration |
| `img-src 'none'` | Block all images | Prevents tracking pixels, data URIs only |
| `font-src 'none'` | Block external fonts | Uses system fonts only |
| `frame-ancestors 'none'` | Prevent framing | Clickjacking protection |
| `base-uri 'none'` | Prevent base tag manipulation | Stops base tag attacks |
| `form-action 'none'` | Block form submissions | Ensures no accidental data leakage |

### Why 'wasm-unsafe-eval' Instead of 'unsafe-eval'

- `'unsafe-eval'` allows **all** JavaScript eval() operations (dangerous)
- `'wasm-unsafe-eval'` **only** allows WebAssembly compilation (limited scope)
- libsodium.js requires WASM for cryptographic operations
- This is the most restrictive option that still enables crypto functionality

## Threat Model

### Assets Protected

1. **User plaintext data** - The secret messages being encrypted
2. **User passwords** - Used for key derivation
3. **Cryptographic keys** - Derived from passwords, temporarily in memory
4. **Ciphertext** - Encrypted output that must remain confidential

### Threats Mitigated

#### 1. Cross-Site Scripting (XSS)
**Threat**: Malicious scripts injected via user input or external sources
**Mitigation**:
- Strict CSP blocks external scripts (`script-src 'self'`)
- No inline event handlers (all use `addEventListener`)
- No `eval()` or `new Function()` usage
- All DOM insertion uses `textContent` (not `innerHTML`) for user data

#### 2. Data Exfiltration
**Threat**: Malicious code sending data to external servers
**Mitigation**:
- `connect-src 'none'` blocks ALL network requests
- No fetch(), XMLHttpRequest, or WebSocket possible
- Application is completely offline-capable
- Verified via automated testing

#### 3. Clickjacking
**Threat**: Application framed in malicious site to trick users
**Mitigation**:
- `frame-ancestors 'none'` prevents all framing
- Even if XSS occurred, framing is impossible

#### 4. Man-in-the-Middle (MITM)
**Threat**: Network attacker intercepting/modifying traffic
**Mitigation**:
- No network requests = no MITM attack surface
- All resources are local
- For deployment: HTTPS with HSTS (see nginx config)

#### 5. Supply Chain Attacks
**Threat**: Compromised dependencies injecting malicious code
**Mitigation**:
- Minimal dependencies (only libsodium-wrappers-sumo, zxcvbn)
- CSP blocks external script loading even if dependency tries
- Subresource Integrity (SRI) can be added for external resources
- All dependencies vendored in `src/lib/`

#### 6. Side-Channel Attacks
**Threat**: Timing attacks, cache attacks, speculative execution
**Mitigation**:
- libsodium.js uses constant-time algorithms where possible
- Argon2id memory-hard KDF resists GPU/ASIC attacks
- No external network timing channels (offline operation)

### Threats NOT Protected Against

#### 1. Compromised Host System
**Not Protected**: If your device has malware/keyloggers
**Reason**: Client-side encryption cannot defend against compromised endpoints
**Mitigation**: Use trusted devices, keep OS/browser updated

#### 2. Weak Passwords
**Not Protected**: Users choosing guessable passwords
**Reason**: Encryption is only as strong as the password
**Mitigation**: Password strength meter guides users, but cannot enforce

#### 3. Shoulder Surfing
**Not Protected**: Physical observation of screen/password entry
**Reason**: Physical security is user's responsibility
**Mitigation**: Password toggle allows hiding input

#### 4. Clipboard History
**Not Protected**: Clipboard managers storing history
**Reason**: Copy/paste functionality requires clipboard access
**Mitigation**: Users should clear clipboard after use

#### 5. Browser Extension Attacks
**Not Protected**: Malicious browser extensions
**Reason**: Extensions have full page access
**Mitigation**: Use minimal extensions, verify extension permissions

## Cryptographic Architecture

### Encryption Flow

```
Plaintext
    ↓
Password + Random Salt → Argon2id (opslimit=6, memlimit=64MB) → 256-bit Key
    ↓
Random Nonce (12 bytes) + Key + Plaintext → AES-256-GCM → Ciphertext + Auth Tag
    ↓
Serialize (Version + KDF params + Salt + Cipher params + Nonce + Ciphertext)
    ↓
Base64 Encode
```

### Security Properties

| Property | Implementation | Security Level |
|----------|---------------|----------------|
| Key Derivation | Argon2id v1.3 | Memory-hard, GPU-resistant |
| Encryption | AES-256-GCM | Authenticated encryption |
| Salt | 128-bit random | Unique per encryption |
| Nonce | 96-bit random | Unique per encryption |
| Auth Tag | 128-bit GCM tag | Tamper detection |

### Algorithm Parameters

- **Argon2id iterations**: 6 (sensitive data profile)
- **Argon2id memory**: 64 MB (65536 KB)
- **AES key size**: 256 bits
- **GCM nonce size**: 96 bits (12 bytes)
- **GCM auth tag**: 128 bits

## Security Best Practices for Users

### Password Recommendations

1. **Minimum 12 characters** - Longer is exponentially better
2. **Use passphrase style** - Multiple random words (e.g., "correct-horse-battery-staple")
3. **Include variety** - Uppercase, lowercase, numbers, symbols
4. **Unique per message** - Don't reuse encryption passwords
5. **Use password manager** - Generate and store strong passwords securely

### Operational Security

1. **Verify HTTPS** - Check for lock icon when using hosted version
2. **Clear clipboard** - After copying encrypted/decrypted text
3. **Close tab when done** - Minimize exposure time
4. **Don't share passwords** - Use separate channel from ciphertext
5. **Verify recipient** - Ensure you're encrypting for the right person

### Verification Steps

Users can verify the security model:

1. **Open DevTools** (F12) → Network tab
2. **Reload page** - Should show ZERO network requests
3. **Check Console** - Should show NO CSP violations
4. **Inspect CSP** - View page source, verify meta tag

## Deployment Security

### Nginx Configuration

See `nginx.conf` for production deployment with:
- HTTPS redirect
- HSTS (HTTP Strict Transport Security)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- CSP header (redundant with meta tag for defense in depth)

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Clickjacking protection |
| X-Content-Type-Options | nosniff | MIME sniffing protection |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Referrer-Policy | no-referrer | Privacy protection |
| Permissions-Policy | ... | Feature restriction |

## Audit & Verification

### Automated Testing

Playwright tests verify:
- ✅ No CSP violations on page load
- ✅ No external network requests
- ✅ No console errors
- ✅ Encryption/decryption functionality

### Manual Verification

```bash
# Start local server
cd src && python3 -m http.server 8080

# Open browser, check DevTools:
# 1. Network tab - should be empty after load
# 2. Console - should have no CSP errors
# 3. Application → Frames → top → CSP
```

## Security Changelog

### v1.0.0
- Implemented strict CSP policy
- Removed all inline event handlers
- Added security documentation
- Created nginx deployment config
- Added automated CSP compliance tests

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to project maintainers
3. Allow reasonable time for response before disclosure
4. Follow responsible disclosure practices

## References

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [libsodium Documentation](https://libsodium.gitbook.io/doc/)
- [Argon2 Specification](https://github.com/P-H-C/phc-winner-argon2/blob/master/argon2-specs.pdf)
- [AES-GCM Security](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
