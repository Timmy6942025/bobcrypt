# Duress Password Support

## Overview

Encyphrix supports **duress passwords** - a coercion resistance feature that allows you to define a secondary password that decrypts to fake/decoy content instead of your real data.

## Use Case

When someone is forced to decrypt their data under duress (coercion, legal pressure, physical threat), they can provide the duress password instead of the real password. The application will appear to work normally, displaying the fake content, while the real content remains hidden.

## How It Works

### Technical Implementation

1. **Dual Encryption**: When duress mode is enabled during encryption, both the real plaintext and fake plaintext are encrypted separately
2. **Different Key Derivation**: The duress password derives a completely different encryption key using a modified salt path (XOR with duress prefix)
3. **Combined Ciphertext**: The final ciphertext contains both encryptions concatenated together:
   - Primary ciphertext (real data)
   - Duress nonce (12 bytes)
   - Duress ciphertext (fake data)
4. **No Metadata Leakage**: The ciphertext format does not indicate whether duress mode is enabled

### Decryption Process

When decrypting:
1. The provided password is first tried as the primary password
2. If that fails, the password is tried as a duress password
3. If duress decryption succeeds, the fake plaintext is returned seamlessly
4. The user experience is identical regardless of which password was used

## Usage

### In the Web Interface

1. Check the "Enable duress password" checkbox in the Encrypt section
2. Enter your primary password (for real content)
3. Enter a duress password (must be different from primary)
4. Enter the fake message to display when duress password is used
5. Encrypt your message

### Programmatic API

```javascript
import { encrypt, decrypt } from './crypto.js';

// Encrypt with duress support
const ciphertext = await encrypt(
  'Real secret message',
  'primary-password',
  {
    duressPassword: 'duress-password',
    fakePlaintext: 'Fake decoy message'
  }
);

// Decrypt with primary password - returns real message
const realMessage = await decrypt(ciphertext, 'primary-password');
console.log(realMessage); // 'Real secret message'

// Decrypt with duress password - returns fake message
const fakeMessage = await decrypt(ciphertext, 'duress-password');
console.log(fakeMessage); // 'Fake decoy message'
```

## Security Properties

### Coercion Resistance
- **Plausible Deniability**: There's no way to prove a duress password exists from examining the ciphertext
- **Identical UX**: The decryption process looks identical regardless of which password is used
- **No Metadata**: The ciphertext header format is identical whether duress is enabled or not

### Key Separation
- Primary and duress keys are derived from completely different key derivation paths
- Knowing one password provides zero information about the other
- Both keys are 256-bit AES keys derived via Argon2id

### Cryptographic Guarantees
- The duress password cannot decrypt the real content
- The primary password cannot decrypt the fake content
- An attacker cannot determine if duress mode is enabled without trying passwords

## Threat Model

### What This Protects Against
- Physical coercion to decrypt data
- Legal compulsion to reveal passwords
- "Rubber hose cryptanalysis" (physical threats)
- Border searches and device seizures

### Limitations
- **Cannot prevent copying**: If an attacker copies the ciphertext before you decrypt, they can attempt brute force later
- **Cannot prevent observation**: If someone watches you enter the real password, duress mode won't help
- **Plausible deniability limits**: Sophisticated attackers may suspect duress mode is in use based on your behavior or threat model
- **Single duress password**: Only one duress password is supported per ciphertext

## Best Practices

### Choosing Duress Passwords
- Use a password that you can remember under stress
- Make it different from your primary password but equally strong
- Consider using a password that you might "accidentally" reveal under pressure
- Don't use obvious patterns (e.g., "password123" vs "password456")

### Creating Fake Content
- Make the fake content plausible and boring
- Avoid content that raises more questions
- Consider using content that explains why there's nothing valuable
- Don't use content that contradicts your real data

### Operational Security
- Practice using both passwords so you don't hesitate under pressure
- Don't document which password is which
- Consider your threat model - who might coerce you and what would satisfy them?
- Remember: the best duress content is content that makes the attacker stop looking

## Implementation Details

### Duress Salt Derivation

The duress key is derived using a modified salt:

```javascript
const DURESS_PREFIX = new Uint8Array([
  0x44, 0x55, 0x52, 0x45, 0x53, 0x53, 0x5f, 0x4d, // "DURESS_M"
  0x4f, 0x44, 0x45, 0x5f, 0x53, 0x41, 0x4c, 0x54  // "ODE_SALT"
]);

const duressSalt = new Uint8Array(16);
for (let i = 0; i < 16; i++) {
  duressSalt[i] = salt[i] ^ DURESS_PREFIX[i];
}
```

This ensures the duress key derivation path is completely independent of the primary key path.

### Ciphertext Structure (with Duress)

```
[1 byte]   Version (0x01)
[1 byte]   KDF algorithm (0x01 = Argon2id)
[4 bytes]  KDF opslimit (uint32 BE)
[4 bytes]  KDF memlimit (uint32 BE)
[16 bytes] Salt
[1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
[12 bytes] Primary nonce
[1 byte]   Flags
[variable] Primary ciphertext (includes 16-byte auth tag)
[12 bytes] Duress nonce
[variable] Duress ciphertext (includes 16-byte auth tag)
```

The total size increase when using duress is: 12 bytes (duress nonce) + fake_ciphertext_length (includes 16-byte auth tag).

## Testing

Run the duress-specific tests:

```bash
bun test src/__tests__/duress.test.ts
```

Tests verify:
- Duress encryption produces valid ciphertext
- Primary password returns real plaintext
- Duress password returns fake plaintext
- Same ciphertext decrypts to different content with different passwords
- No metadata leakage indicating duress mode
- Proper rejection when duress password equals primary password

## References

- [TrueCrypt/VeraCrypt Hidden Volumes](https://www.veracrypt.fr/en/Hidden%20Volume.html) - Similar concept for disk encryption
- [Rubber Hose Cryptanalysis](https://en.wikipedia.org/wiki/Rubber-hose_cryptanalysis) - The threat duress passwords protect against
- [Coercion-Resistant Encryption](https://www.cs.columbia.edu/~smb/papers/coerce.pdf) - Academic research on the topic
