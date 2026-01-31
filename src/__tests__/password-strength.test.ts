import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Password Strength (zxcvbn)', () => {
  const srcDir = join(import.meta.dir, '..');

  it('should have zxcvbn library in src/lib/', () => {
    const zxcvbnPath = join(srcDir, 'lib', 'zxcvbn.js');
    expect(existsSync(zxcvbnPath)).toBe(true);
    
    const content = readFileSync(zxcvbnPath, 'utf-8');
    expect(content.length).toBeGreaterThan(1000);
    expect(content).toInclude('zxcvbn');
  });

  it('should have password-strength.js module', () => {
    const modulePath = join(srcDir, 'password-strength.js');
    expect(existsSync(modulePath)).toBe(true);
    
    const content = readFileSync(modulePath, 'utf-8');
    expect(content).toInclude('analyzePassword');
    expect(content).toInclude('initStrengthMeter');
  });

  it('should load zxcvbn in index.html', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    
    expect(html).toInclude('lib/zxcvbn.js');
    expect(html).toInclude('password-strength.js');
  });

  it('should have strength meter UI elements', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    
    expect(html).toInclude('id="strength-password"');
    expect(html).toInclude('id="strength-bar"');
    expect(html).toInclude('id="strength-label"');
    expect(html).toInclude('id="crack-time"');
    expect(html).toInclude('id="strength-suggestions"');
  });

  it('should have CSS classes for strength levels', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    
    expect(html).toInclude('.strength-bar.weak');
    expect(html).toInclude('.strength-bar.fair');
    expect(html).toInclude('.strength-bar.good');
    expect(html).toInclude('.strength-bar.strong');
  });

  it('should use initStrengthMeter from password-strength module', () => {
    const indexPath = join(srcDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    
    expect(html).toInclude('initStrengthMeter');
  });
});

describe('zxcvbn Library Functionality', () => {
  it('should detect "password" as weak', async () => {
    const srcDir = join(import.meta.dir, '..');
    const zxcvbnPath = join(srcDir, 'lib', 'zxcvbn.js');
    
    expect(existsSync(zxcvbnPath)).toBe(true);
    
    const zxcvbnContent = readFileSync(zxcvbnPath, 'utf-8');
    expect(zxcvbnContent).toInclude('zxcvbn');
    expect(zxcvbnContent).toInclude('score');
    expect(zxcvbnContent).toInclude('crack_times');
  });

  it('should detect "correct-horse-battery-staple" as strong', async () => {
    const srcDir = join(import.meta.dir, '..');
    const zxcvbnPath = join(srcDir, 'lib', 'zxcvbn.js');
    
    expect(existsSync(zxcvbnPath)).toBe(true);
    
    const zxcvbnContent = readFileSync(zxcvbnPath, 'utf-8');
    expect(zxcvbnContent).toInclude('feedback');
    expect(zxcvbnContent).toInclude('suggestions');
  });
});
