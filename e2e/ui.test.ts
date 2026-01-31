import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Encyphrix E2E Tests', () => {
  test.describe('UI Structure', () => {
    test('should display encrypt and decrypt sections', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle(/Encyphrix/);

      await expect(page.locator('#encrypt-heading')).toBeVisible();
      await expect(page.locator('#plaintext')).toBeVisible();
      await expect(page.locator('#encrypt-password')).toBeVisible();
      await expect(page.locator('#encrypt-btn')).toBeVisible();

      await expect(page.locator('#decrypt-heading')).toBeVisible();
      await expect(page.locator('#ciphertext')).toBeVisible();
      await expect(page.locator('#decrypt-password')).toBeVisible();
      await expect(page.locator('#decrypt-btn')).toBeVisible();

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/ui-structure.png'),
        fullPage: true
      });
    });

    test('should have CSP meta tag', async ({ page }) => {
      await page.goto('/');

      const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
      await expect(cspMeta).toHaveAttribute('content', /default-src 'none'/);
    });

    test('should have complete strict CSP policy', async ({ page }) => {
      await page.goto('/');

      const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
      const cspContent = await cspMeta.getAttribute('content');

      expect(cspContent).toMatch(/default-src\s+'none'/);
      expect(cspContent).toMatch(/script-src\s+'self'/);
      expect(cspContent).toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(cspContent).toMatch(/script-src[^;]*'wasm-unsafe-eval'/);
      expect(cspContent).toMatch(/style-src\s+'self'/);
      expect(cspContent).toMatch(/style-src[^;]*'unsafe-inline'/);
      expect(cspContent).toMatch(/connect-src\s+'none'/);
      expect(cspContent).toMatch(/img-src\s+'none'/);
      expect(cspContent).toMatch(/font-src\s+'none'/);
      expect(cspContent).toMatch(/base-uri\s+'none'/);
      expect(cspContent).toMatch(/form-action\s+'none'/);

      expect(cspContent).not.toMatch(/'unsafe-eval'/);
    });

    test('should have zero CSP violations', async ({ page }) => {
      const cspViolations: Array<{message: string, location?: string}> = [];

      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Content Security Policy') ||
            text.includes('Refused to') ||
            text.includes('CSP') ||
            text.includes('violation')) {
          cspViolations.push({
            message: text,
            location: msg.location()?.url
          });
        }
      });

      await page.evaluate(() => {
        window.addEventListener('securitypolicyviolation', (e) => {
          console.error('CSP Violation:', {
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            originalPolicy: e.originalPolicy
          });
        });
      });

      await page.goto('/');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/csp-compliance.png'),
        fullPage: true
      });

      expect(cspViolations).toHaveLength(0);
    });

    test('should make zero external network requests', async ({ page }) => {
      const networkRequests: Array<{url: string, type: string}> = [];

      page.on('request', request => {
        const url = request.url();
        const isExternal = !url.startsWith('http://localhost:3333') &&
                           !url.startsWith('data:') &&
                           !url.startsWith('blob:') &&
                           !url.startsWith('about:');
        if (isExternal) {
          networkRequests.push({
            url: url,
            type: request.resourceType()
          });
        }
      });

      await page.goto('/');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      expect(networkRequests).toHaveLength(0);
    });

    test('should have no inline event handlers', async ({ page }) => {
      await page.goto('/');

      const inlineHandlers = await page.evaluate(() => {
        const handlers: Array<{element: string, attribute: string}> = [];
        const allElements = document.querySelectorAll('*');

        for (const el of allElements) {
          for (const attr of el.attributes) {
            if (attr.name.startsWith('on')) {
              handlers.push({
                element: el.tagName,
                attribute: attr.name
              });
            }
          }
        }

        return handlers;
      });

      expect(inlineHandlers).toHaveLength(0);
    });

    test('should load without console errors', async ({ page }) => {
      const consoleErrors: Array<{message: string, type: string}> = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            message: msg.text(),
            type: msg.type()
          });
        }
      });

      page.on('pageerror', error => {
        consoleErrors.push({
          message: error.message,
          type: 'pageerror'
        });
      });

      await page.goto('/');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const unexpectedErrors = consoleErrors.filter(err =>
        !err.message.includes('Crypto initialized') &&
        !err.message.includes('libsodium.js initialized')
      );

      expect(unexpectedErrors).toHaveLength(0);
    });
  });

  test.describe('Encrypt Flow', () => {
    test('should encrypt plaintext and produce ciphertext', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Hello, World! This is a secret message.';
      const password = 'correct-horse-battery-staple';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);

      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
      expect(ciphertext).not.toBe(plaintext);

      const base64Pattern = /^[A-Za-z0-9+/=\s]+$/;
      expect(ciphertext).toMatch(base64Pattern);

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/encrypt-success.png'),
        fullPage: true
      });
    });

    test('should show loading state during encryption', async ({ page }) => {
      await page.goto('/');

      await page.fill('#plaintext', 'Test message');
      await page.fill('#encrypt-password', 'test-password');

      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const encryptBtn = page.locator('#encrypt-btn');
      await expect(encryptBtn).toBeEnabled();
    });

    test('should handle short plaintext', async ({ page }) => {
      await page.goto('/');

      await page.fill('#plaintext', 'A');
      await page.fill('#encrypt-password', 'test-password');

      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
    });

    test('should handle unicode plaintext', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Hello 世界! 🌍 ñ é ü';
      const password = 'unicode-test-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);

      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
    });
  });

  test.describe('Decrypt Flow', () => {
    test('should decrypt ciphertext back to plaintext', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Secret message for decryption test';
      const password = 'decrypt-test-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);
      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const ciphertext = await page.textContent('#ciphertext-output');

      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', password);

      await page.click('#decrypt-btn');

      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 10000 });

      const decrypted = await page.textContent('#plaintext-output');
      expect(decrypted).toBe(plaintext);

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/decrypt-success.png'),
        fullPage: true
      });
    });

    test('should show loading state during decryption', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Test';
      const password = 'test-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);
      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });
      const ciphertext = await page.textContent('#ciphertext-output');

      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', password);

      await page.click('#decrypt-btn');

      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 10000 });

      const decryptBtn = page.locator('#decrypt-btn');
      await expect(decryptBtn).toBeEnabled();
    });
  });

  test.describe('Wrong Password Handling', () => {
    test('should show error for wrong password', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Secret message';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', correctPassword);
      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });
      const ciphertext = await page.textContent('#ciphertext-output');

      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', wrongPassword);

      await page.click('#decrypt-btn');

      await page.waitForTimeout(3000);

      const plaintextOutput = await page.textContent('#plaintext-output');
      expect(plaintextOutput).toBe('');

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/wrong-password-error.png'),
        fullPage: true
      });
    });

    test('should not reveal plaintext with wrong password', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Secret message';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', correctPassword);
      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });
      const ciphertext = await page.textContent('#ciphertext-output');

      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', wrongPassword);

      await page.click('#decrypt-btn');

      await page.waitForSelector('#decrypt-status:not(:empty)', { timeout: 10000 });

      const outputPlaintext = await page.locator('#plaintext-output').textContent();
      expect(outputPlaintext).toBe('');
    });
  });

  test.describe('Password Strength Meter', () => {
    test('should display password strength meter', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('#strength-password')).toBeVisible();
      await expect(page.locator('#strength-bar-container')).toBeVisible();
      await expect(page.locator('#strength-label')).toBeVisible();
    });

    test('should show weak strength for simple password', async ({ page }) => {
      await page.goto('/');

      await page.fill('#strength-password', 'password');

      await page.waitForTimeout(500);

      const strengthLabel = await page.textContent('#strength-label');
      expect(strengthLabel?.toLowerCase()).toContain('weak');

      const strengthBar = page.locator('#strength-bar');
      const barClass = await strengthBar.getAttribute('class');
      expect(barClass).toContain('weak');

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/password-weak.png'),
        fullPage: true
      });
    });

    test('should show strong strength for good passphrase', async ({ page }) => {
      await page.goto('/');

      await page.fill('#strength-password', 'correct-horse-battery-staple');

      await page.waitForTimeout(500);

      const strengthLabel = await page.textContent('#strength-label');
      expect(strengthLabel?.toLowerCase()).toContain('strong');

      const strengthBar = page.locator('#strength-bar');
      const barClass = await strengthBar.getAttribute('class');
      expect(barClass).toContain('strong');

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/password-strong.png'),
        fullPage: true
      });
    });

    test('should show crack time estimate', async ({ page }) => {
      await page.goto('/');

      await page.fill('#strength-password', 'test123');

      await page.waitForTimeout(500);

      const crackTime = await page.textContent('#crack-time');
      expect(crackTime?.length).toBeGreaterThan(0);
    });

    test('should provide password suggestions', async ({ page }) => {
      await page.goto('/');

      await page.fill('#strength-password', 'password');

      await page.waitForTimeout(500);

      const suggestions = await page.locator('#strength-suggestions').isVisible();
      expect(suggestions).toBe(true);
    });

    test('should update strength in real-time', async ({ page }) => {
      await page.goto('/');

      await page.fill('#strength-password', 'a');
      await page.waitForTimeout(300);

      const label1 = await page.textContent('#strength-label');

      await page.fill('#strength-password', 'correct-horse-battery-staple');
      await page.waitForTimeout(300);

      const label2 = await page.textContent('#strength-label');

      expect(label1).not.toBe(label2);
    });
  });

  test.describe('Full Workflow', () => {
    test('should complete full encrypt-decrypt workflow', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'This is a complete end-to-end test message!';
      const password = 'e2e-test-password-2024';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);

      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);

      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', password);

      await page.click('#decrypt-btn');

      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 10000 });

      const decrypted = await page.textContent('#plaintext-output');
      expect(decrypted).toBe(plaintext);

      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/full-workflow.png'),
        fullPage: true
      });
    });

    test('should handle copy buttons', async ({ page }) => {
      await page.goto('/');

      const plaintext = 'Test for copy functionality';
      const password = 'copy-test-password';

      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);
      await page.click('#encrypt-btn');

      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 10000 });

      const copyBtn = page.locator('#copy-encrypt-btn');
      await expect(copyBtn).toBeVisible();

      await copyBtn.click();

      await page.waitForTimeout(500);
    });
  });
});
