# Self-Destruct Mode (One-Time Messages)

## Overview

Self-destruct mode is an optional feature that marks a message as intended for one-time viewing. When enabled, the ciphertext includes a flag that signals to the recipient that the sender prefers the message not be retained after reading.

**Important**: Self-destruct mode is a **courtesy indicator**, not a technical enforcement. It cannot prevent the recipient from copying, screenshotting, or otherwise preserving the message.

## How It Works

### Encryption

When you enable "One-time decryption" during encryption:

1. The `FLAG_SELF_DESTRUCT` (0x01) is set in the ciphertext metadata flags byte
2. The flag is stored in the binary format at a fixed position (byte 39 of the header)
3. The ciphertext is otherwise identical to standard encryption

### Decryption

When decrypting a message with self-destruct enabled:

1. The decrypt function reads the flags byte from the metadata
2. Returns `{ plaintext: string, selfDestruct: boolean }`
3. The UI displays a prominent warning that this is a one-time message

## Usage

### Web Interface

1. Enter your message in the Encrypt section
2. Enter your password
3. Check the "One-time decryption (self-destruct)" checkbox
4. Click "Encrypt Message"
5. Share the ciphertext with the recipient

The recipient will see a warning when decrypting:
> ⚠️ **One-time message:** This message is intended for single viewing. The sender has requested that you do not retain a copy.

### Programmatic API

```javascript
import { encrypt, decrypt, checkSelfDestruct } from './crypto.js';

// Encrypt with self-destruct
const ciphertext = await encrypt('Secret message', 'password123', {
  selfDestruct: true
});

// Check if ciphertext has self-destruct (without decrypting)
const isSelfDestruct = checkSelfDestruct(ciphertext); // true

// Decrypt - returns object with plaintext and flag
const result = await decrypt(ciphertext, 'password123');
console.log(result.plaintext);      // 'Secret message'
console.log(result.selfDestruct);   // true
```

## Technical Details

### Format Specification

The self-destruct flag is stored in the ciphertext format Version 1:

```
[1 byte]   Version (0x01)
[1 byte]   KDF algorithm (0x01 = Argon2id)
[4 bytes]  KDF opslimit (uint32 big-endian)
[4 bytes]  KDF memlimit (uint32 big-endian)
[16 bytes] Salt
[1 byte]   Cipher algorithm (0x01 = AES-256-GCM)
[12 bytes] Nonce
[1 byte]   Flags (0x01 = Self-destruct enabled)  <-- Flag stored here
[variable] Ciphertext (includes 16-byte auth tag)
```

### Constants

```javascript
const FLAG_SELF_DESTRUCT = 0x01;
```

### Helper Functions

- `hasSelfDestructFlag(ciphertext)` - Check if ciphertext has the flag (throws on invalid format)
- `checkSelfDestruct(ciphertext)` - Check if ciphertext has the flag (returns false on invalid format)

## Security Considerations

### What Self-Destruct Does

- Signals sender's intent for one-time viewing
- Displays a warning to the recipient
- Stored as metadata in the ciphertext format

### What Self-Destruct Does NOT Do

- **Cannot prevent copying** - Recipients can copy the decrypted text
- **Cannot prevent screenshots** - Recipients can capture the screen
- **Cannot enforce deletion** - No technical way to force message deletion
- **Does not expire** - The ciphertext doesn't automatically become invalid

### Threat Model

Self-destruct mode assumes:
- The recipient is generally trustworthy but may need a reminder
- The recipient's device is not compromised
- The recipient respects the sender's wishes

Self-destruct mode does NOT protect against:
- Malicious recipients intentionally saving messages
- Compromised devices logging all activity
- Network interception (mitigated by encryption, not self-destruct)

## Best Practices

1. **Don't rely solely on self-destruct** for sensitive information
2. **Combine with duress passwords** for additional protection
3. **Communicate expectations** with recipients beforehand
4. **Use for appropriate use cases**:
   - Temporary passwords or codes
   - One-time links or credentials
   - Messages meant to be ephemeral
   - Reminders that shouldn't be retained

## Comparison with Other Systems

| Feature | Encyphrix | Signal disappearing messages | Snapchat |
|---------|-----------|------------------------------|----------|
| Technical enforcement | No | No (client-side only) | No |
| Prevents screenshots | No | No | No (on most platforms) |
| Prevents copying | No | No | No |
| Honest indicator | Yes | Yes | Yes |
| Works offline | Yes | Requires server | Requires server |

All "self-destructing" message systems share the same limitation: they rely on client-side cooperation and cannot technically prevent preservation.

## Future Considerations

Potential enhancements (not currently implemented):

- **Time-based expiration**: Include timestamp for when message was created
- **View counter**: Track how many times message has been decrypted
- **Burn after reading**: Client-side suggestion to delete after viewing

These would still be client-side hints, not enforceable restrictions.

## References

- [format.js](../src/format.js) - Ciphertext format specification
- [crypto.js](../src/crypto.js) - Encryption/decryption implementation
- [self-destruct.test.ts](../src/__tests__/self-destruct.test.ts) - Test suite
