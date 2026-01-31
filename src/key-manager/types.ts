export type KeyType = 'passphrase' | '256bit';

export interface KeyEntry {
  id: string;
  name: string;
  type: KeyType;
  value: string; // passphrase or hex-encoded 256-bit key
  createdAt: string; // ISO timestamp
  lastUsed?: string; // ISO timestamp
}

export interface KeyVault {
  version: number; // for future migrations
  keys: KeyEntry[];
  defaultKeyId?: string;
}

export interface EncryptedVault {
  salt: Uint8Array; // 16 bytes
  ciphertext: string; // base64
}

export interface KeyManagerState {
  isUnlocked: boolean;
  keys: KeyEntry[];
  selectedKeyId?: string;
  defaultKeyId?: string;
}
