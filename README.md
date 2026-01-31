# Encyphrix

> Paranoid-grade encryption for everyone. Client-side only. No servers. No tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-green.svg)](docs/security.md)
[![CSP: Strict](https://img.shields.io/badge/CSP-Strict-red.svg)](docs/security.md)

## What is Encyphrix?

Encyphrix is a **browser-based encryption tool** designed for maximum security with zero trust. It encrypts and decrypts text messages using industry-standard cryptography—entirely within your browser. No data ever leaves your device.

### Key Features

- **Zero Network Exposure**: Makes zero network requests. Works completely offline.
- **Client-Side Only**: All encryption happens in your browser. No server processing.
- **Standard Algorithms**: Uses battle-tested AES-256-GCM and Argon2id (via libsodium).
- **Strict CSP**: Content Security Policy blocks all external resources and network connections.
- **Duress Passwords**: Optional coercion resistance with fake/decoy content.
- **Stealth Modes**: Hide ciphertext structure with random noise and padding.
- **Self-Destruct**: Mark messages for one-time viewing (courtesy indicator).
- **No Installation**: Single HTML file—works in any modern browser.
- **Open Source**: Fully auditable. No security through obscurity.

### What Encyphrix Is NOT

- ❌ **Not a password manager** - We don't store passwords
- ❌ **Not a communication platform** - We don't send messages
- ❌ **Not a file encryption tool** - Text only (use VeraCrypt or Hat.sh for files)
- ❌ **Not quantum-proof** - Uses best available algorithms, but "quantum-proof" claims are premature
- ❌ **Not foolproof** - Strong passwords required; lost passwords = lost data

## Quick Start

### Using the Web Interface

1. **Open the app**: Open `src/index.html` in any modern browser (or use a hosted version)
2. **Encrypt a message**:
   - Enter your secret message in the "Encrypt" section
   - Enter a strong password (use the strength meter as a guide)
   - Click "Encrypt Message"
   - Copy the resulting ciphertext (Base64-encoded)
3. **Decrypt a message**:
   - Paste the ciphertext in the "Decrypt" section
   - Enter the password
   - Click "Decrypt Message"
   - Read the decrypted plaintext

### Command Line (Node.js/Bun)

```javascript
import { initCrypto, encrypt, decrypt } from './src/crypto.js';

// Initialize crypto libraries
await initCrypto();

// Encrypt
const ciphertext = await encrypt('Hello, Secret World!', 'my-strong-password');
console.log('Encrypted:', ciphertext);

// Decrypt
const result = await decrypt(ciphertext, 'my-strong-password');
console.log('Decrypted:', result.plaintext);
```

## How to Use

### Basic Encryption

1. Navigate to the **Encrypt** section
2. Enter your plaintext message
3. Enter a strong password (see [Password Recommendations](#password-recommendations))
4. Click **Encrypt Message**
5. Copy the Base64 ciphertext to your clipboard
6. Share the ciphertext via any channel (email, chat, cloud storage)
7. **Share the password separately**—never send it with the ciphertext

### Basic Decryption

1. Navigate to the **Decrypt** section
2. Paste the ciphertext
3. Enter the password
4. Click **Decrypt Message**
5. Read the decrypted message
6. **Clear your clipboard** after copying sensitive text

### Advanced Features

#### Duress Passwords (Coercion Resistance)

Enable duress mode when encrypting to create a secondary password that decrypts to fake content:

1. Check **"Enable duress password"**
2. Enter your primary password (for real content)
3. Enter a duress password (different from primary)
4. Enter the fake message to display
5. Encrypt as normal

When decrypting:
- Primary password → Shows real content
- Duress password → Shows fake content

**Security property**: There's no way to prove a duress password exists by examining the ciphertext.

See [docs/duress.md](docs/duress.md) for details.

#### Stealth Modes

Hide the fact that you're using encryption:

- **Random Noise Mode**: Prepends random bytes to hide ciphertext structure
- **Padding Mode**: Pads to fixed block sizes to hide message length
- **Combined Mode**: Both noise and padding for maximum obfuscation

See [docs/stealth.md](docs/stealth.md) for details.

#### Self-Destruct Mode

Mark messages as one-time viewing:

1. Check **"One-time decryption (self-destruct)"** when encrypting
2. The recipient sees a warning that the message is intended for single viewing

**Important**: This is a courtesy indicator, not technical enforcement. Recipients can still copy or screenshot the message.

See [docs/self-destruct.md](docs/self-destruct.md) for details.

## Security Model

### What We Protect Against

| Threat | Protection Level |
|--------|-----------------|
| Casual eavesdropping | ✅ Strong - Ciphertext is infeasible to decrypt without password |
| Network attacks (MITM) | ✅ Complete - Zero network requests |
| XSS/malicious scripts | ✅ Strong - Strict CSP blocks all external resources |
| Opportunistic attacks | ✅ Strong - Encryption survives storage compromise |
| Accidental exposure | ✅ Strong - Encrypted data remains confidential |

### What We CANNOT Protect Against

| Threat | Reality |
|--------|---------|
| Compromised endpoint | ❌ Client-side encryption cannot defend against malware/keyloggers |
| Weak passwords | ❌ Dictionary attacks are fast against weak passwords |
| Shoulder surfing | ❌ Physical security is your responsibility |
| Clipboard history | ❌ We can't control clipboard managers |
| Browser extensions | ❌ Extensions have full page access |
| Infinite compute | ❌ Given unlimited resources, any password can be brute-forced |
| Social engineering | ❌ Encryption can't protect against human error |

### Honest Limitations

**Password-based encryption cannot resist infinite compute.** If an attacker has unlimited computing power, unlimited time, and your encrypted file, they will eventually crack it. This is mathematical reality.

Encyphrix makes brute-force attacks **economically infeasible** for realistic threat models by using Argon2id (memory-hard KDF) and requiring strong passwords.

See [docs/philosophy.md](docs/philosophy.md) for our honest security philosophy.

## Password Recommendations

### Minimum Requirements

- **At least 12 characters** - Longer is exponentially better
- **Mix of character types** - Uppercase, lowercase, numbers, symbols
- **Not in common dictionaries** - Avoid "password123", "qwerty", etc.

### Strong Password Guidelines

1. **Use passphrase style**: Multiple random words
   - Good: `correct-horse-battery-staple`
   - Good: `Tr0ub4dor&3-apple-cloud-9`

2. **Include variety**:
   - Uppercase letters (A-Z)
   - Lowercase letters (a-z)
   - Numbers (0-9)
   - Symbols (!@#$%^&*)

3. **Avoid personal information**:
   - No names, birthdays, or pet names
   - No keyboard patterns (qwerty, 123456)
   - No common substitutions (p@ssw0rd)

4. **Unique per message**: Don't reuse encryption passwords

5. **Use a password manager**: Generate and store strong passwords securely

### Password Strength Meter

The app includes a real-time password strength meter powered by [zxcvbn](https://github.com/dropbox/zxcvbn). It estimates crack time and provides suggestions for improvement.

**Aim for "Strong" (score 4/4)** for sensitive data.

## Self-Hosting Instructions

### Option 1: Static File Server (Simplest)

```bash
# Clone or download the repository
git clone https://github.com/yourusername/encyphrix.git
cd encyphrix

# Serve the src directory
python3 -m http.server 3000 --directory src

# Or with Node.js
npx serve src

# Or with Bun
bun run serve
```

Then open `http://localhost:3000` in your browser.

### Option 2: Nginx (Production)

Use the provided `nginx.conf` for secure deployment:

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/encyphrix

# Enable site
sudo ln -s /etc/nginx/sites-available/encyphrix /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

The nginx configuration includes:
- HTTPS redirect
- HSTS (HTTP Strict Transport Security)
- Security headers (X-Frame-Options, CSP, etc.)
- Static file serving with proper MIME types

### Option 3: Docker

```dockerfile
FROM nginx:alpine
COPY src/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Option 4: GitHub Pages / Netlify / Vercel

1. Fork this repository
2. Configure your hosting service to serve the `src/` directory
3. Deploy

**Security note**: When using third-party hosting, verify the CSP in the HTML hasn't been modified. The meta tag should contain `connect-src 'none'`.

### Verification Steps

After deployment, verify security:

1. **Open DevTools** (F12) → Network tab
2. **Reload page** - Should show ZERO network requests
3. **Check Console** - Should show NO CSP violations
4. **Inspect CSP** - View page source, verify meta tag contains `connect-src 'none'`

## Technical Documentation

- [Security Documentation](docs/security.md) - Detailed security architecture and threat model
- [Architecture Documentation](docs/architecture.md) - Algorithm choices and ciphertext format
- [Philosophy](docs/philosophy.md) - Honest security philosophy and limitations
- [Duress Passwords](docs/duress.md) - Coercion resistance feature
- [Stealth Modes](docs/stealth.md) - Ciphertext obfuscation features
- [Self-Destruct](docs/self-destruct.md) - One-time message indicator

## API Reference

### Core Functions

#### `initCrypto()`

Initialize the cryptographic libraries (libsodium.js).

```javascript
import { initCrypto } from './crypto.js';

await initCrypto();
```

**Must be called before using any crypto functions.**

#### `encrypt(plaintext, password, options)`

Encrypt plaintext using AES-256-GCM with Argon2id key derivation.

```javascript
import { encrypt, STEALTH_NOISE } from './crypto.js';

// Basic encryption
const ciphertext = await encrypt('secret message', 'password');

// With options
const ciphertext = await encrypt('secret message', 'password', {
  duressPassword: 'coercion-password',
  fakePlaintext: 'fake decoy message',
  selfDestruct: true,
  stealthMode: STEALTH_NOISE
});
```

**Parameters:**
- `plaintext` (string): Message to encrypt
- `password` (string): Encryption password
- `options` (object, optional):
  - `duressPassword` (string): Secondary password for fake content
  - `fakePlaintext` (string): Content shown when duress password is used
  - `selfDestruct` (boolean): Enable one-time message flag
  - `stealthMode` (number): `STEALTH_NONE`, `STEALTH_NOISE`, `STEALTH_PADDING`, or `STEALTH_COMBINED`

**Returns:** Promise<string> - Base64-encoded ciphertext

#### `decrypt(ciphertext, password)`

Decrypt ciphertext.

```javascript
import { decrypt } from './crypto.js';

const result = await decrypt(ciphertext, 'password');
console.log(result.plaintext);     // Decrypted message
console.log(result.selfDestruct);  // true if self-destruct enabled
```

**Returns:** Promise<{plaintext: string, selfDestruct: boolean}>

#### `checkSelfDestruct(ciphertext)`

Check if ciphertext has self-destruct flag (without decrypting).

```javascript
import { checkSelfDestruct } from './crypto.js';

const isSelfDestruct = checkSelfDestruct(ciphertext); // boolean
```

### Password Strength

#### `analyzePassword(password)`

Analyze password strength using zxcvbn.

```javascript
import { analyzePassword } from './password-strength.js';

const analysis = analyzePassword('my-password');
console.log(analysis.score);        // 0-4
console.log(analysis.label);        // 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'
console.log(analysis.crackTime);    // Estimated crack time
console.log(analysis.suggestions);  // Improvement suggestions
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js
- Modern browser with Web Crypto API support

### Setup

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run E2E tests
bun run test:e2e

# Serve locally
bun run serve
```

### Testing

The test suite includes:
- Unit tests for all crypto functions
- Integration tests for encrypt/decrypt workflows
- Edge case testing (empty inputs, unicode, large data)
- Duress password functionality
- Stealth mode operations
- Password strength analysis
- CSP compliance verification

### Building

```bash
# Build distribution
bun run build

# Verify build
bun run build:verify
```

## Security Audit

### Automated Verification

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

## Comparison with Other Tools

| Feature | Encyphrix | VeraCrypt | Hat.sh | OpenSSL | GnuPG |
|---------|-----------|-----------|--------|---------|-------|
| **Primary Use** | Message encryption | Disk/container | File encryption | General crypto | Email/file |
| **Client-Side Only** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Zero Network** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Browser-Based** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **No Installation** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Duress Passwords** | ✅ | ✅ (hidden vol) | ❌ | ❌ | ❌ |
| **Plausible Deniability** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **File Encryption** | ❌ | ✅ | ✅ | ✅ | ✅ |

**Use Encyphrix when**: You need quick message encryption in a browser with zero installation and maximum security isolation.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Security Contributions

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to project maintainers privately
3. Allow reasonable time for response before disclosure
4. Follow responsible disclosure practices

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [libsodium](https://libsodium.gitbook.io/doc/) - The cryptographic library that powers Encyphrix
- [zxcvbn](https://github.com/dropbox/zxcvbn) - Password strength estimation
- [OWASP](https://owasp.org/) - Security best practices and CSP guidance

## Disclaimer

**Encyphrix is provided as-is without warranty.** While we use industry-standard cryptography and follow security best practices, we cannot guarantee absolute security. You are responsible for:

- Choosing strong passwords
- Keeping your devices secure
- Verifying the integrity of the code you run
- Understanding the limitations of password-based encryption

**Lost passwords cannot be recovered.** There are no backdoors. If you lose your password, your data is permanently inaccessible.

---

**Trust the math. Verify the implementation. Use strong passwords.**
