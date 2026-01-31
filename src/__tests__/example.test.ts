import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Project Setup', () => {
  const srcDir = join(import.meta.dir, '..');
  const rootDir = join(srcDir, '..');

  it('should have index.html file', () => {
    const indexPath = join(srcDir, 'index.html');
    expect(existsSync(indexPath)).toBe(true);
  });

  it('should have CSP meta tag in HTML', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    expect(html).toInclude('Content-Security-Policy');
    expect(html).toInclude("default-src 'none'");
    expect(html).toInclude("script-src 'self'");
  });

  it('should have encrypt textarea in HTML', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    expect(html).toInclude('id="plaintext"');
    expect(html).toInclude('id="encrypt-password"');
  });

  it('should have decrypt textarea in HTML', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    expect(html).toInclude('id="ciphertext"');
    expect(html).toInclude('id="decrypt-password"');
  });

  it('should have package.json with bun test script', () => {
    const packagePath = join(rootDir, 'package.json');
    expect(existsSync(packagePath)).toBe(true);
    
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.test).toInclude('bun test');
  });

  it('should have playwright as dev dependency', () => {
    const packagePath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies['@playwright/test']).toBeDefined();
  });
});
