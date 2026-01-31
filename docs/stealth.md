# Ciphertext Stealth Features

Encyphrix provides optional stealth modes for encrypted data that help hide the fact that encryption is being used. These features are designed for scenarios where you want to avoid detection or analysis of your encrypted communications.

## Overview

Three stealth modes are available:

1. **Random Noise Mode**: Prepends random bytes to hide ciphertext structure
2. **Padding Mode**: Pads ciphertext to fixed block sizes to hide message length
3. **Combined Mode**: Applies both noise and padding for maximum obfuscation

## Random Noise Mode

### How It Works

Random Noise Mode prepends random bytes before the actual ciphertext, making the output appear as random data with no discernible structure.

**Key Features:**
- The offset to the real ciphertext is derived from your password using a secondary KDF operation
- The derived offset is stored in the first 4 bytes (big-endian uint32)
- Output passes chi-square randomness tests
- No version headers or structure visible at the start

**Format:**
```
[4 bytes: offset to real data][random bytes][actual ciphertext]
```

**Security Properties:**
- Without the correct password, an attacker cannot verify where the real ciphertext begins
- The offset is cryptographically derived from password+salt
- Different passwords produce different offsets
- The random bytes are indistinguishable from the actual ciphertext

### Usage

```javascript
import { encrypt, decrypt } from './crypto.js';
import { STEALTH_NOISE } from './stealth.js';

// Encrypt with noise mode
const ciphertext = await encrypt(plaintext, password, {
  stealthMode: STEALTH_NOISE,
  noiseMinBytes: 64,   // Minimum random bytes (default: 64)
  noiseMaxBytes: 1024  // Maximum random bytes (default: 1024)
});

// Decrypt (automatically detects and removes stealth)
const decrypted = await decrypt(ciphertext, password);
```

### Parameters

- `noiseMinBytes`: Minimum number of random bytes to prepend (default: 64)
- `noiseMaxBytes`: Maximum number of random bytes to prepend (default: 1024)

The actual offset is derived from your password and falls within this range.

## Padding Mode

### How It Works

Padding Mode pads the ciphertext to fixed block sizes, hiding the actual message length. Different messages of varying lengths will produce ciphertexts of the same size.

**Key Features:**
- Pads to the next multiple of block size
- Uses random padding (not just zeros)
- Original length is stored in the first 4 bytes
- Different length messages produce same-size output

**Format:**
```
[4 bytes: original length][ciphertext][random padding]
```

### Usage

```javascript
import { encrypt, decrypt } from './crypto.js';
import { STEALTH_PADDING } from './stealth.js';

// Encrypt with padding mode
const ciphertext = await encrypt(plaintext, password, {
  stealthMode: STEALTH_PADDING,
  paddingBlockSize: 1024,  // Block size in bytes (default: 1024)
  paddingMaxSize: 16384    // Maximum padded size (default: 16384)
});

// Decrypt (automatically detects and removes padding)
const decrypted = await decrypt(ciphertext, password);
```

### Parameters

- `paddingBlockSize`: The block size to pad to (default: 1024 bytes)
- `paddingMaxSize`: Maximum allowed padded size (default: 16384 bytes)

### Example

```javascript
// These will produce the same size output
const shortMsg = await encrypt('Hi', password, { stealthMode: STEALTH_PADDING });
const longMsg = await encrypt('This is a much longer message...', password, { 
  stealthMode: STEALTH_PADDING 
});

console.log(shortMsg.length === longMsg.length); // true
```

## Combined Mode

### How It Works

Combined Mode applies both Random Noise Mode and Padding Mode for maximum obfuscation:
1. First applies noise mode (prepends random bytes)
2. Then applies padding mode (pads to fixed size)

This provides:
- Hidden message structure (noise mode)
- Hidden message length (padding mode)
- Maximum resistance to traffic analysis

### Usage

```javascript
import { encrypt, decrypt } from './crypto.js';
import { STEALTH_COMBINED } from './stealth.js';

// Encrypt with combined mode
const ciphertext = await encrypt(plaintext, password, {
  stealthMode: STEALTH_COMBINED,
  noiseMinBytes: 64,
  noiseMaxBytes: 128,
  paddingBlockSize: 2048,
  paddingMaxSize: 8192
});

// Decrypt (automatically detects and removes both modes)
const decrypted = await decrypt(ciphertext, password);
```

## Backward Compatibility

All stealth modes maintain backward compatibility:

- **Standard decryption works**: Ciphertexts encrypted with stealth mode can be decrypted with the standard `decrypt()` function
- **Auto-detection**: The decrypt function automatically detects and removes stealth modes
- **No default stealth**: Stealth mode is opt-in only (harder to debug if enabled by default)

## Randomness Testing

The stealth module includes functions for testing randomness:

```javascript
import { chiSquareRandomnessTest, passesRandomnessTest, calculateEntropy } from './stealth.js';

// Test if data appears random
const data = new Uint8Array([/* ... */]);
const pValue = chiSquareRandomnessTest(data);
const isRandom = passesRandomnessTest(data, 0.5);

// Calculate entropy (0-8 bits per byte)
const entropy = calculateEntropy(data);
```

### Chi-Square Test

The chi-square test compares the distribution of byte values against a uniform distribution:
- Returns a p-value between 0 and 1
- Values close to 1 indicate high randomness
- Values below 0.01 suggest non-random data

### Entropy Calculation

Entropy measures the unpredictability of data:
- Maximum entropy for random data: 8 bits per byte
- Lower entropy indicates patterns or structure

## Security Considerations

### Random Noise Mode

**Strengths:**
- Output is indistinguishable from random data
- No visible headers or structure
- Offset verification prevents tampering

**Limitations:**
- Slightly larger ciphertext size
- Requires additional computation for offset derivation

### Padding Mode

**Strengths:**
- Hides actual message length
- Different messages produce same-size output
- Resistant to traffic analysis

**Limitations:**
- Larger ciphertext size (padded to block boundary)
- Length is revealed to anyone with the password

### Best Practices

1. **Use Combined Mode** for maximum protection
2. **Choose appropriate block sizes** based on your message sizes
3. **Don't use stealth by default** - it makes debugging harder
4. **Test decryption** before relying on stealth modes

## API Reference

### Constants

```javascript
STEALTH_NONE      // 0x00 - No stealth
STEALTH_NOISE     // 0x01 - Random noise mode
STEALTH_PADDING   // 0x02 - Padding mode
STEALTH_COMBINED  // 0x03 - Both noise and padding
```

### Functions

#### `applyStealth(ciphertext, options)`

Applies stealth mode to a standard ciphertext.

**Parameters:**
- `ciphertext` (string): Base64-encoded ciphertext
- `options` (Object): Stealth options
  - `mode`: Stealth mode constant
  - `password`: Password for noise mode
  - `salt`: Salt for key derivation
  - `kdfFn`: Key derivation function
  - `noiseMinBytes`: Minimum noise bytes
  - `noiseMaxBytes`: Maximum noise bytes
  - `paddingBlockSize`: Block size for padding
  - `paddingMaxSize`: Maximum padded size

#### `removeStealth(ciphertext, options)`

Removes stealth mode from ciphertext.

**Parameters:**
- `ciphertext` (string): Stealth ciphertext
- `options` (Object): Same as applyStealth

**Returns:** Standard base64-encoded ciphertext

#### `detectStealthMode(ciphertext)`

Detects if ciphertext has stealth mode applied.

**Returns:** `{ mode: number, confidence: string }`

## Implementation Details

### Offset Derivation

For noise mode, the offset is derived using:

```javascript
offsetPassword = password + '_STEALTH_NOISE_OFFSET_v1'
offsetKey = KDF(offsetPassword, salt)
offset = minOffset + (offsetKey[0:4] mod (maxOffset - minOffset + 1))
```

This ensures:
- Different passwords produce different offsets
- Same password+salt always produces same offset
- Offset is cryptographically unpredictable without the password

### Padding Algorithm

Padding uses random bytes (not zeros) to avoid patterns:

```javascript
paddedSize = ceil((originalLength + 4) / blockSize) * blockSize
output = [originalLength as uint32BE][ciphertext][randomBytes(paddedSize - 4 - originalLength)]
```

## Testing

Run the stealth mode tests:

```bash
bun test src/__tests__/stealth.test.ts
```

The test suite includes:
- Unit tests for each stealth mode
- Integration tests with encrypt/decrypt
- Randomness tests (chi-square, entropy)
- Security property tests
- Backward compatibility tests
