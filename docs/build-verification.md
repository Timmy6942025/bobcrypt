# Build Verification

## Reproducible Builds

Encyphrix supports reproducible builds - building the same source code should produce bit-for-bit identical output. This allows anyone to verify that the distributed binary matches the source code.

## Why Reproducible Builds Matter

- **Supply chain security**: Verify no malicious code was injected during build
- **Trust minimization**: Don't need to trust the build environment
- **Auditability**: Anyone can reproduce and verify the build
- **Transparency**: Open source means nothing to hide

## Build Process

### Prerequisites

- Bun 1.0.0 or higher
- Node.js 18+ (for some dependencies)
- Git

### Building from Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/encyphrix.git
cd encyphrix
```

2. Install dependencies:
```bash
bun install
```

3. Run the build script:
```bash
bash scripts/build.sh
```

4. The build output will be in `dist/encyphrix.html`

### Verifying the Build

Compare the hash of your build with the official release:

```bash
# Generate SHA-256 hash of your build
sha256sum dist/encyphrix.html

# Compare with official hash (published in releases)
cat dist/encyphrix.html.sha256
```

If the hashes match, your build is identical to the official release.

## SRI Hashes

Subresource Integrity (SRI) hashes are provided for all external resources:

```
sha256-abc123...  libsodium.mjs
sha256-def456...  zxcvbn.js
```

These hashes are embedded in the HTML to ensure loaded resources match expected values.

## Dependency Pinning

All dependencies are pinned to exact versions in `package.json`:

```json
{
  "dependencies": {
    "libsodium-wrappers-sumo": "0.8.2",
    "zxcvbn": "4.4.2"
  }
}
```

This ensures reproducibility - floating versions could produce different builds.

## Build Script Details

The `scripts/build.sh` script:

1. Cleans previous build artifacts
2. Verifies dependency versions
3. Copies libraries to src/lib/
4. Runs tests to ensure functionality
5. Generates SRI hashes
6. Creates distribution package
7. Computes and saves SHA-256 hash

## CI Verification

Our continuous integration:
- Builds the project on every commit
- Verifies the build is reproducible (builds twice, compares)
- Checks all SRI hashes match
- Runs full test suite
- Publishes build artifacts with hashes

## Limitations

### What We Can Verify
- Source code matches distributed binary
- Dependencies are exactly as specified
- No build-time code injection

### What We Cannot Verify
- Cryptographic correctness (requires formal verification)
- Browser security (depends on browser implementation)
- Operating system security
- Hardware security

## Trust Model

Even with reproducible builds, you must trust:
1. The source code (review it!)
2. The compiler (Bun/Node.js)
3. The runtime (browser)
4. The hardware (CPU, memory)

Reproducible builds eliminate trust in the build environment and distribution channel.

## Best Practices for Users

1. **Build yourself**: Don't trust, verify - build from source
2. **Check hashes**: Compare your build with official releases
3. **Review changes**: Read the code before updating
4. **Use stable releases**: Avoid untested development versions

## Reporting Build Issues

If your build doesn't match the official release:
1. Check you're using the exact same dependency versions
2. Verify your Bun/Node.js version matches
3. Check for platform-specific differences
4. File an issue with your build environment details

## Future Improvements

- [ ] Deterministic builds across different platforms
- [ ] GPG-signed release tags
- [ ] Formal verification of cryptographic core
- [ ] Supply chain audit of all dependencies
