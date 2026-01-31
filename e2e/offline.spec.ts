import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Offline/Air-gapped functionality tests
 * 
 * These tests verify that the app works completely offline:
 * - No external network requests
 * - Works with file:// protocol
 * - All resources are embedded/local
 */

test.describe('Offline/Air-gapped Functionality', () => {
  test.describe('file:// Protocol Support', () => {
    test('should load successfully via file:// protocol', async ({ page }) => {
      // Get absolute path to index.html
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      // Navigate using file:// protocol
      await page.goto(fileUrl);
      
      // Verify page loaded
      await expect(page).toHaveTitle(/Encyphrix/);
      
      // Verify main elements are visible
      await expect(page.locator('#encrypt-heading')).toBeVisible();
      await expect(page.locator('#decrypt-heading')).toBeVisible();
      
      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/offline-file-protocol.png'),
        fullPage: true
      });
    });

    test('should have zero network requests via file:// protocol', async ({ page }) => {
      const networkRequests: Array<{url: string, type: string}> = [];
      
      page.on('request', request => {
        const url = request.url();
        // Only track http/https requests (not file://, data:, blob:, about:)
        if (url.startsWith('http://') || url.startsWith('https://')) {
          networkRequests.push({
            url: url,
            type: request.resourceType()
          });
        }
      });
      
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      await page.goto(fileUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Should have zero external network requests
      expect(networkRequests).toHaveLength(0);
    });

    test('should initialize crypto via file:// protocol', async ({ page }) => {
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      await page.goto(fileUrl);
      
      // Wait for crypto initialization
      await page.waitForTimeout(3000);
      
      // Check that crypto is initialized by attempting encryption
      await page.fill('#plaintext', 'Test message');
      await page.fill('#encrypt-password', 'test-password-123');
      
      await page.click('#encrypt-btn');
      
      // Wait for encryption to complete
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });
      
      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
      
      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/offline-encryption.png'),
        fullPage: true
      });
    });
  });

  test.describe('Zero External Dependencies', () => {
    test('should not make any external network requests', async ({ page }) => {
      const externalRequests: Array<{url: string, type: string}> = [];
      
      page.on('request', request => {
        const url = request.url();
        const isExternal = url.startsWith('http://') || url.startsWith('https://');
        if (isExternal) {
          externalRequests.push({
            url: url,
            type: request.resourceType()
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      expect(externalRequests).toHaveLength(0);
    });

    test('should not load resources from CDN', async ({ page }) => {
      const cdnRequests: Array<{url: string}> = [];
      
      page.on('request', request => {
        const url = request.url();
        const isCdn = url.includes('cdn.') || 
                      url.includes('unpkg.com') || 
                      url.includes('jsdelivr.net') ||
                      url.includes('cloudflare.com') ||
                      url.includes('googleapis.com');
        if (isCdn) {
          cdnRequests.push({ url });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      expect(cdnRequests).toHaveLength(0);
    });

    test('should not load external fonts', async ({ page }) => {
      const fontRequests: Array<{url: string}> = [];
      
      page.on('request', request => {
        if (request.resourceType() === 'font') {
          fontRequests.push({ url: request.url() });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      expect(fontRequests).toHaveLength(0);
    });
  });

  test.describe('Offline Mode Badge', () => {
    test('should display Offline Mode badge', async ({ page }) => {
      await page.goto('/');
      
      const badge = page.locator('.security-badge');
      await expect(badge).toBeVisible();
      
      const badgeText = await badge.textContent();
      expect(badgeText).toContain('Offline');
    });

    test('should have offline indicator in header', async ({ page }) => {
      await page.goto('/');
      
      const header = page.locator('header');
      await expect(header).toContainText('Offline');
    });
  });

  test.describe('Air-gapped Workflow', () => {
    test('should complete full encrypt-decrypt cycle offline', async ({ page }) => {
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      await page.goto(fileUrl);
      await page.waitForTimeout(3000);
      
      const plaintext = 'Secret message for air-gapped test';
      const password = 'air-gapped-password-2024';
      
      // Encrypt
      await page.fill('#plaintext', plaintext);
      await page.fill('#encrypt-password', password);
      await page.click('#encrypt-btn');
      
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });
      const ciphertext = await page.textContent('#ciphertext-output');
      
      // Decrypt
      await page.fill('#ciphertext', ciphertext!);
      await page.fill('#decrypt-password', password);
      await page.click('#decrypt-btn');
      
      await page.waitForSelector('#plaintext-output:not(:empty)', { timeout: 15000 });
      const decrypted = await page.textContent('#plaintext-output');
      
      expect(decrypted).toBe(plaintext);
      
      await page.screenshot({
        path: join(__dirname, '../.sisyphus/evidence/air-gapped-workflow.png'),
        fullPage: true
      });
    });

    test('should work without internet connection', async ({ page, context }) => {
      // Simulate offline by blocking all network requests
      await context.route('**/*', route => {
        if (route.request().url().startsWith('http')) {
          route.abort('internetdisconnected');
        } else {
          route.continue();
        }
      });
      
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      await page.goto(fileUrl);
      await page.waitForTimeout(3000);
      
      // Should still work even with blocked network
      await page.fill('#plaintext', 'Offline test');
      await page.fill('#encrypt-password', 'offline-password');
      await page.click('#encrypt-btn');
      
      await page.waitForSelector('#ciphertext-output:not(:empty)', { timeout: 15000 });
      const ciphertext = await page.textContent('#ciphertext-output');
      expect(ciphertext!.length).toBeGreaterThan(0);
    });
  });

  test.describe('CSP Compliance Offline', () => {
    test('should have no CSP violations via file:// protocol', async ({ page }) => {
      const cspViolations: Array<{message: string}> = [];
      
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Content Security Policy') || 
            text.includes('Refused to') ||
            text.includes('violation')) {
          cspViolations.push({ message: text });
        }
      });
      
      page.on('pageerror', error => {
        cspViolations.push({ message: error.message });
      });
      
      const indexPath = join(__dirname, '../src/index.html');
      const fileUrl = 'file://' + indexPath;
      
      await page.goto(fileUrl);
      await page.waitForTimeout(2000);
      
      expect(cspViolations).toHaveLength(0);
    });
  });
});
