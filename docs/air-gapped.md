# Air-Gapped Usage Guide

## Overview

Encyphrix is designed to work completely offline without any network connectivity. This guide explains how to use Encyphrix in air-gapped environments for maximum security.

## Why Air-Gapped?

An air-gapped computer:
- Has never been connected to the internet
- Cannot be remotely compromised
- Provides physical isolation from network threats
- Is ideal for high-security encryption operations

## Basic Air-Gapped Setup

### Step 1: Download Encyphrix

On an internet-connected computer:
1. Download the Encyphrix HTML file
2. Verify the file hash (see build verification docs)
3. Copy to a USB drive or other removable media

### Step 2: Transfer to Air-Gapped Machine

1. Insert the USB drive into your air-gapped computer
2. Copy the Encyphrix HTML file to the local disk
3. Eject and remove the USB drive

### Step 3: Use Encyphrix Offline

1. Open the HTML file directly in your browser:
   - Double-click the file, or
   - Use File > Open in your browser
2. The app works completely offline - no network required
3. All encryption/decryption happens locally

## Tails OS Integration

[Tails](https://tails.boum.org/) is a live operating system that you can start on almost any computer from a USB stick or a DVD.

### Using Encyphrix with Tails:

1. Boot Tails from USB
2. Enable Persistent Storage (optional, for saving Encyphrix)
3. Copy Encyphrix HTML to Persistent Storage
4. Use Encyphrix for encryption operations
5. Shutdown Tails - all memory is wiped

### Advantages:
- Leaves no trace on host computer
- All internet connections are blocked by default
- Amnesic - forgets everything after shutdown

## Qubes OS Disposable VM

[Qubes OS](https://www.qubes-os.org/) provides security through isolation using virtualization.

### Setup:

1. Create a disposable VM for Encyphrix
2. Copy Encyphrix HTML to the VM
3. Use the app within the isolated VM
4. Destroy the VM when done - all data is erased

### Command line:
```bash
# In dom0
qvm-create --class DispVM --label red encyphrix-dvm
qvm-copy-to-vm encyphrix-dvm /path/to/encyphrix.html
```

## Security Best Practices

### Physical Security
- Use Encyphrix in a private location
- Prevent shoulder surfing (screen privacy filters)
- Secure the air-gapped machine physically

### Password Entry
- Use a hardware password manager if available
- Type passwords carefully (no paste from clipboard history)
- Clear clipboard after password entry

### Data Handling
- Never connect the air-gapped machine to networks
- Use write-once media (CD-R) for transferring encrypted data
- Destroy media after use if containing sensitive keys

### Browser Considerations
- Use a fresh browser profile
- Disable browser extensions
- Clear browser data after use
- Consider using a dedicated browser just for Encyphrix

## Verification

To verify Encyphrix is truly offline:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Use Encyphrix normally
4. Confirm zero network requests

## Troubleshooting

### File:// Protocol Issues
Some browsers restrict file:// access. Solutions:
- Use Firefox (most permissive)
- Start a local server: `python3 -m http.server 8000`
- Use the Docker container locally

### Web Crypto Not Available
If you get "Web Crypto API not available":
- Use a modern browser (Chrome, Firefox, Edge)
- Enable JavaScript
- Check browser security settings

### WASM Loading Issues
If libsodium.js fails to load:
- Ensure all files are in the same directory
- Check that src/lib/libsodium.mjs exists
- Try a different browser

## Advanced: Complete Air-Gapped Workflow

1. **Generate keys offline** using Encyphrix on air-gapped machine
2. **Encrypt sensitive data** offline
3. **Transfer encrypted data only** via removable media
4. **Decrypt on recipient's air-gapped machine**
5. **Never expose plaintext to networked computers**

This workflow provides maximum security for high-value secrets.
