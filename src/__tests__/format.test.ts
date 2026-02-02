import { describe, it, expect } from 'bun:test';
import {
  serialize,
  deserialize,
  createMetadata,
  VERSION_1,
  KDF_ARGON2ID,
  CIPHER_AES_256_GCM,
  DEFAULT_OPSLIMIT,
  DEFAULT_MEMLIMIT,
  SALT_SIZE,
  NONCE_SIZE,
  AUTH_TAG_SIZE,
  HEADER_SIZE
} from '../format.js';

describe('Algorithm-Agile Ciphertext Format', () => {
  
  describe('Constants', () => {
    it('should have correct version constant', () => {
      expect(VERSION_1).toBe(0x01);
    });
    
    it('should have correct KDF algorithm constant', () => {
      expect(KDF_ARGON2ID).toBe(0x01);
    });
    
    it('should have correct cipher algorithm constant', () => {
      expect(CIPHER_AES_256_GCM).toBe(0x01);
    });
    
    it('should have correct default parameters', () => {
      expect(DEFAULT_OPSLIMIT).toBe(10);
      expect(DEFAULT_MEMLIMIT).toBe(262144);
    });
    
    it('should have correct size constants', () => {
      expect(SALT_SIZE).toBe(16);
      expect(NONCE_SIZE).toBe(12);
      expect(AUTH_TAG_SIZE).toBe(16);
      expect(HEADER_SIZE).toBe(40);
    });
  });
  
  describe('createMetadata', () => {
    it('should create metadata with default parameters', () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(12).fill(0xCD);
      
      const metadata = createMetadata(salt, nonce);
      
      expect(metadata.version).toBe(VERSION_1);
      expect(metadata.kdfAlgorithm).toBe(KDF_ARGON2ID);
      expect(metadata.opslimit).toBe(DEFAULT_OPSLIMIT);
      expect(metadata.memlimit).toBe(DEFAULT_MEMLIMIT);
      expect(metadata.cipherAlgorithm).toBe(CIPHER_AES_256_GCM);
      expect(metadata.salt).toEqual(salt);
      expect(metadata.nonce).toEqual(nonce);
    });
    
    it('should create metadata with custom parameters', () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(12).fill(0xCD);
      
      const metadata = createMetadata(salt, nonce, {
        opslimit: 10,
        memlimit: 131072
      });
      
      expect(metadata.opslimit).toBe(10);
      expect(metadata.memlimit).toBe(131072);
    });
    
    it('should throw error for invalid salt size', () => {
      const invalidSalt = new Uint8Array(8);
      const nonce = new Uint8Array(12);
      
      expect(() => createMetadata(invalidSalt, nonce)).toThrow('Salt must be exactly 16 bytes');
    });
    
    it('should throw error for invalid nonce size', () => {
      const salt = new Uint8Array(16);
      const invalidNonce = new Uint8Array(8);
      
      expect(() => createMetadata(salt, invalidNonce)).toThrow('Nonce must be exactly 12 bytes');
    });
  });
  
  describe('serialize', () => {
    it('should serialize metadata and encrypted data to Base64', () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(12).fill(0xCD);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14]);
      
      const result = serialize(metadata, encryptedData);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      const decoded = atob(result);
      expect(decoded.length).toBe(HEADER_SIZE + encryptedData.length);
    });
    
    it('should produce correct binary format', () => {
      const salt = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]);
      const nonce = new Uint8Array([0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C]);
      const metadata = createMetadata(salt, nonce, { opslimit: 6, memlimit: 65536 });
      const encryptedData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
      
      const result = serialize(metadata, encryptedData);
      const binary = atob(result);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const view = new DataView(bytes.buffer);
      
      expect(bytes[0]).toBe(VERSION_1);
      expect(bytes[1]).toBe(KDF_ARGON2ID);
      expect(view.getUint32(2, false)).toBe(6);
      expect(view.getUint32(6, false)).toBe(65536);
      expect(bytes.slice(10, 26)).toEqual(salt);
      expect(bytes[26]).toBe(CIPHER_AES_256_GCM);
      expect(bytes.slice(27, 39)).toEqual(nonce);
      expect(bytes[39]).toBe(0); // flags byte
      expect(bytes.slice(40)).toEqual(encryptedData);
    });
    
    it('should throw error for unsupported version', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = {
        version: 0x02,
        kdfAlgorithm: KDF_ARGON2ID,
        opslimit: 6,
        memlimit: 65536,
        salt,
        cipherAlgorithm: CIPHER_AES_256_GCM,
        nonce,
        flags: 0
      };
      const encryptedData = new Uint8Array(20);

      expect(() => serialize(metadata, encryptedData)).toThrow('Unsupported version');
    });
    
    it('should throw error for unsupported KDF algorithm', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = {
        version: VERSION_1,
        kdfAlgorithm: 0x02,
        opslimit: 6,
        memlimit: 65536,
        salt,
        cipherAlgorithm: CIPHER_AES_256_GCM,
        nonce,
        flags: 0
      };
      const encryptedData = new Uint8Array(20);

      expect(() => serialize(metadata, encryptedData)).toThrow('Unsupported KDF algorithm');
    });
    
    it('should throw error for unsupported cipher algorithm', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = {
        version: VERSION_1,
        kdfAlgorithm: KDF_ARGON2ID,
        opslimit: 6,
        memlimit: 65536,
        salt,
        cipherAlgorithm: 0x02,
        nonce,
        flags: 0
      };
      const encryptedData = new Uint8Array(20);

      expect(() => serialize(metadata, encryptedData)).toThrow('Unsupported cipher algorithm');
    });
    
    it('should throw error for invalid salt size', () => {
      const salt = new Uint8Array(8);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(new Uint8Array(16), nonce);
      metadata.salt = salt;
      const encryptedData = new Uint8Array(20);
      
      expect(() => serialize(metadata, encryptedData)).toThrow('Salt must be exactly 16 bytes');
    });
    
    it('should throw error for invalid nonce size', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(8);
      const metadata = createMetadata(salt, new Uint8Array(12));
      metadata.nonce = nonce;
      const encryptedData = new Uint8Array(20);
      
      expect(() => serialize(metadata, encryptedData)).toThrow('Nonce must be exactly 12 bytes');
    });
    
    it('should throw error for missing encrypted data', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      
      expect(() => serialize(metadata, new Uint8Array(0))).toThrow('Encrypted data is required');
    });
    
    it('should throw error for missing metadata', () => {
      expect(() => serialize(undefined as any, new Uint8Array(20))).toThrow('Metadata is required');
    });
  });
  
  describe('deserialize', () => {
    it('should deserialize Base64 string to metadata and encrypted data', () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(12).fill(0xCD);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14]);
      
      const serialized = serialize(metadata, encryptedData);
      const deserialized = deserialize(serialized);
      
      expect(deserialized.version).toBe(VERSION_1);
      expect(deserialized.kdfAlgorithm).toBe(KDF_ARGON2ID);
      expect(deserialized.opslimit).toBe(DEFAULT_OPSLIMIT);
      expect(deserialized.memlimit).toBe(DEFAULT_MEMLIMIT);
      expect(deserialized.cipherAlgorithm).toBe(CIPHER_AES_256_GCM);
      expect(deserialized.salt).toEqual(salt);
      expect(deserialized.nonce).toEqual(nonce);
      expect(deserialized.encryptedData).toEqual(encryptedData);
    });
    
    it('should correctly deserialize big-endian integers', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce, { opslimit: 6, memlimit: 65536 });
      const encryptedData = new Uint8Array(20).fill(0xAA);
      
      const serialized = serialize(metadata, encryptedData);
      const deserialized = deserialize(serialized);
      
      expect(deserialized.opslimit).toBe(6);
      expect(deserialized.memlimit).toBe(65536);
    });
    
    it('should throw error for invalid Base64', () => {
      expect(() => deserialize('not-valid-base64!!!')).toThrow('Invalid Base64 encoding');
    });
    
    it('should throw error for too short ciphertext', () => {
      const shortBase64 = btoa(String.fromCharCode(...new Uint8Array(10)));
      expect(() => deserialize(shortBase64)).toThrow('Invalid ciphertext: too short');
    });
    
    it('should throw error for unsupported version', () => {
      const buffer = new ArrayBuffer(HEADER_SIZE + 20);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      
      view.setUint8(0, 0x02);
      view.setUint8(1, KDF_ARGON2ID);
      view.setUint32(2, 6, false);
      view.setUint32(6, 65536, false);
      bytes.set(new Uint8Array(16), 10);
      view.setUint8(26, CIPHER_AES_256_GCM);
      bytes.set(new Uint8Array(12), 27);
      bytes.set(new Uint8Array(20).fill(0xAA), 39);
      
      const base64 = btoa(String.fromCharCode(...bytes));
      
      expect(() => deserialize(base64)).toThrow('Unsupported version');
    });
    
    it('should throw error for unsupported KDF algorithm', () => {
      const buffer = new ArrayBuffer(HEADER_SIZE + 20);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      
      view.setUint8(0, VERSION_1);
      view.setUint8(1, 0x02);
      view.setUint32(2, 6, false);
      view.setUint32(6, 65536, false);
      bytes.set(new Uint8Array(16), 10);
      view.setUint8(26, CIPHER_AES_256_GCM);
      bytes.set(new Uint8Array(12), 27);
      bytes.set(new Uint8Array(20).fill(0xAA), 39);
      
      const base64 = btoa(String.fromCharCode(...bytes));
      
      expect(() => deserialize(base64)).toThrow('Unsupported KDF algorithm');
    });
    
    it('should throw error for unsupported cipher algorithm', () => {
      const buffer = new ArrayBuffer(HEADER_SIZE + 20);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      
      view.setUint8(0, VERSION_1);
      view.setUint8(1, KDF_ARGON2ID);
      view.setUint32(2, 6, false);
      view.setUint32(6, 65536, false);
      bytes.set(new Uint8Array(16), 10);
      view.setUint8(26, 0x02);
      bytes.set(new Uint8Array(12), 27);
      bytes.set(new Uint8Array(20).fill(0xAA), 39);
      
      const base64 = btoa(String.fromCharCode(...bytes));
      
      expect(() => deserialize(base64)).toThrow('Unsupported cipher algorithm');
    });
    
    it('should throw error for missing auth tag', () => {
      const buffer = new ArrayBuffer(HEADER_SIZE + 10);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      
      view.setUint8(0, VERSION_1);
      view.setUint8(1, KDF_ARGON2ID);
      view.setUint32(2, 6, false);
      view.setUint32(6, 65536, false);
      bytes.set(new Uint8Array(16), 10);
      view.setUint8(26, CIPHER_AES_256_GCM);
      bytes.set(new Uint8Array(12), 27);
      bytes.set(new Uint8Array(10).fill(0xAA), 39);
      
      const base64 = btoa(String.fromCharCode(...bytes));
      
      expect(() => deserialize(base64)).toThrow('too short');
    });
    
    it('should throw error for empty input', () => {
      expect(() => deserialize('')).toThrow('Base64 string is required');
      expect(() => deserialize({} as any)).toThrow('Base64 string is required');
    });
  });
  
  describe('Roundtrip', () => {
    it('should correctly roundtrip through serialize and deserialize', () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const metadata = createMetadata(salt, nonce);
      const encryptedData = crypto.getRandomValues(new Uint8Array(32));
      
      const serialized = serialize(metadata, encryptedData);
      const deserialized = deserialize(serialized);
      
      expect(deserialized.version).toBe(metadata.version);
      expect(deserialized.kdfAlgorithm).toBe(metadata.kdfAlgorithm);
      expect(deserialized.opslimit).toBe(metadata.opslimit);
      expect(deserialized.memlimit).toBe(metadata.memlimit);
      expect(deserialized.cipherAlgorithm).toBe(metadata.cipherAlgorithm);
      expect(deserialized.salt).toEqual(metadata.salt);
      expect(deserialized.nonce).toEqual(metadata.nonce);
      expect(deserialized.encryptedData).toEqual(encryptedData);
    });
    
    it('should handle various encrypted data sizes', () => {
      const salt = new Uint8Array(16).fill(0xAA);
      const nonce = new Uint8Array(12).fill(0xBB);
      const metadata = createMetadata(salt, nonce);
      
      const sizes = [17, 32, 64, 128, 256, 512, 1024];
      
      for (const size of sizes) {
        const encryptedData = new Uint8Array(size).fill(0xCC);
        const serialized = serialize(metadata, encryptedData);
        const deserialized = deserialize(serialized);
        
        expect(deserialized.encryptedData.length).toBe(size);
        expect(deserialized.encryptedData).toEqual(encryptedData);
      }
    });
  });
  
  describe('Version byte verification', () => {
    it('should always set version byte to 0x01', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array(20);
      
      const serialized = serialize(metadata, encryptedData);
      const binary = atob(serialized);
      
      expect(binary.charCodeAt(0)).toBe(0x01);
    });
    
    it('should correctly read version byte from deserialized data', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array(20);
      
      const serialized = serialize(metadata, encryptedData);
      const deserialized = deserialize(serialized);
      
      expect(deserialized.version).toBe(0x01);
    });
  });
  
  describe('Base64 encoding', () => {
    it('should produce valid Base64 output', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array(20);
      
      const serialized = serialize(metadata, encryptedData);
      
      expect(() => atob(serialized)).not.toThrow();
    });
    
    it('should handle Base64 with padding correctly', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      
      const sizes = [17, 18, 19, 20, 21, 22, 23];
      
      for (const size of sizes) {
        const encryptedData = new Uint8Array(size);
        const serialized = serialize(metadata, encryptedData);
        const deserialized = deserialize(serialized);
        
        expect(deserialized.encryptedData).toEqual(encryptedData);
      }
    });
  });
  
  describe('Error messages', () => {
    it('should provide descriptive error for corrupted format', () => {
      const validSalt = new Uint8Array(16);
      const validNonce = new Uint8Array(12);
      const metadata = createMetadata(validSalt, validNonce);
      const encryptedData = new Uint8Array(20);
      
      const serialized = serialize(metadata, encryptedData);
      
      const corrupted = serialized.slice(0, 10) + '!!!' + serialized.slice(13);
      
      expect(() => deserialize(corrupted)).toThrow();
    });
    
    it('should provide descriptive error for truncated data', () => {
      const salt = new Uint8Array(16);
      const nonce = new Uint8Array(12);
      const metadata = createMetadata(salt, nonce);
      const encryptedData = new Uint8Array(20);
      
      const serialized = serialize(metadata, encryptedData);
      const truncated = serialized.slice(0, 20);
      
      expect(() => deserialize(truncated)).toThrow('too short');
    });
  });
});
