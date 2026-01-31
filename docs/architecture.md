# Architecture

## System Overview

Encyphrix is a client-side encryption application that runs entirely in the browser. It uses modern cryptographic primitives to provide secure encryption and decryption of text messages.

## Core Components

### 1. Cryptographic Core (`src/crypto.js`)

The cryptographic module provides the following functions:

- `initCrypto()` - Initialize libsodium.js WASM
- `encrypt(plaintext, password, options)` - Encrypt plaintext with password
- `decrypt(ciphertext, password)` - Decrypt ciphertext with password
- `deriveKey(password, salt)` - Derive encryption key using Argon2id
- `generateSalt()` - Generate random 16-byte salt
- `generateNonce()` - Generate random 12-byte nonce

### 2. Ciphertext Format (`src/format.js`)

Implements versioned, algorithm-agile binary format:

```
[1 byte]   Version (0x01)
[1 byte]   KDF algorithm (0x01 = Argon2id)
[4 bytes]  KDF opslimit (uint32 BE)
[4 bytes]  KDF memlimit (uint32 BE)
[16 bytes] Salt
[1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
[12 bytes] Nonce
[1 byte]   Flags (0x01 = Self-destruct)
[variable] Ciphertext + auth tag
```

### 3. UI Layer (`src/index.html`)

Single-page application with:
- Encrypt section (plaintext input, password, options)
- Decrypt section (ciphertext input, password)
- Password strength meter (zxcvbn)
- Visual feedback and status messages

### 4. Stealth Module (`src/stealth.js`)

Optional obfuscation features:
- Noise mode: Prepends random bytes
- Padding mode: Fixed-size output
- Combined mode: Both techniques

## Algorithm Choices

### Key Derivation: Argon2id

- **Algorithm**: Argon2id v1.3 (winner of Password Hashing Competition)
- **Memory**: 64 MB (65536 KB)
- **Iterations**: 6 (opslimit)
- **Parallelism**: 1 (single-threaded for browser compatibility)
- **Output**: 32 bytes (256 bits)

Rationale: Argon2id provides resistance to both GPU attacks (memory-hard) and side-channel attacks (data-independent memory access).

### Encryption: AES-256-GCM

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key size**: 256 bits
- **Nonce**: 96 bits (12 bytes)
- **Auth tag**: 128 bits (16 bytes)

Rationale: AES-256-GCM provides:
- Confidentiality (AES encryption)
- Authenticity (GCM authentication tag)
- High performance (hardware acceleration on modern CPUs)
- NIST standard, widely audited

### Why Not Post-Quantum?

For password-based symmetric encryption:
- AES-256 already provides ~128-bit security against quantum computers (Grover's algorithm)
- Post-quantum asymmetric (ML-KEM) solves key distribution, not needed for password-based
- Memory-hard KDF (Argon2id) is already quantum-resistant

## Threat Model

### What Encyphrix Protects Against

1. **Passive eavesdropping** - Encrypted messages cannot be read without password
2. **Password cracking attempts** - Argon2id makes brute-force expensive
3. **Tampering** - GCM authentication detects modified ciphertext
4. **Coercion** - Duress password provides plausible deniability
5. **Traffic analysis** - Stealth mode hides message patterns

### What Encyphrix Does NOT Protect Against

1. **Weak passwords** - Password entropy is the security bottleneck
2. **Keyloggers** - Cannot protect against compromised endpoints
3. **Shoulder surfing** - Screen visibility during use
4. **Forensic recovery** - Browser memory may leave traces
5. **Social engineering** - User tricked into revealing password

## Security Properties

### Forward Secrecy

No forward secrecy - if password is compromised, all past messages encrypted with that password can be decrypted.

### Deniability

Duress password feature provides cryptographic deniability - same ciphertext decrypts to different messages with different passwords.

### Metadata Protection

- No server communication = no server logs
- Stealth mode hides message length and format
- No identifying markers in ciphertext

## Performance Characteristics

- **Argon2id KDF**: ~0.5ms on modern hardware, ~2s on Raspberry Pi Zero 2
- **AES-GCM encryption**: <1ms for typical messages
- **Memory usage**: ~64MB for KDF, minimal for encryption

## Browser Compatibility

Requires:
- Web Crypto API (crypto.subtle)
- WebAssembly (for libsodium.js)
- ES6 modules

Supported browsers:
- Chrome/Edge 60+
- Firefox 55+
- Safari 11+

## Build Process

1. Dependencies installed via `bun install`
2. Libraries copied to `src/lib/` for offline use
3. Single HTML file can be opened directly (file:// protocol)
4. No build step required for basic usage

## Deployment Options

1. **Static hosting** - Serve HTML file from any web server
2. **Docker** - Use provided Dockerfile with nginx
3. **Air-gapped** - Copy to USB, use on offline machine
4. **Raspberry Pi** - Optimized for low-power devices
