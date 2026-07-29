import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';

// Set up encryption key before importing the module
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('AIService - Encryption Helpers', () => {
  it('encrypt/decrypt round-trip preserves the original plaintext', async () => {
    const { encrypt, decrypt } = await import('./ai.service.js');

    const originalKey = 'sk-test-api-key-12345abcdef';
    const encrypted = encrypt(originalKey);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(originalKey);
  });

  it('encrypted output is different from the plaintext', async () => {
    const { encrypt } = await import('./ai.service.js');

    const originalKey = 'sk-test-key';
    const encrypted = encrypt(originalKey);

    // The encrypted buffer should not contain the plaintext bytes
    expect(encrypted.toString('utf8')).not.toBe(originalKey);
    expect(encrypted.toString('utf8')).not.toContain(originalKey);
  });

  it('produces different ciphertexts for the same plaintext (due to random IV)', async () => {
    const { encrypt } = await import('./ai.service.js');

    const key = 'same-api-key-value';
    const encrypted1 = encrypt(key);
    const encrypted2 = encrypt(key);

    expect(encrypted1.equals(encrypted2)).toBe(false);
  });

  it('encrypted buffer has correct structure (IV + authTag + ciphertext)', async () => {
    const { encrypt } = await import('./ai.service.js');

    const key = 'test-key';
    const encrypted = encrypt(key);

    // IV (12) + AuthTag (16) + at least 1 byte of ciphertext
    expect(encrypted.length).toBeGreaterThanOrEqual(12 + 16 + 1);
  });

  it('decrypt throws on tampered data', async () => {
    const { encrypt, decrypt } = await import('./ai.service.js');

    const encrypted = encrypt('test-key');
    // Tamper with the ciphertext portion
    encrypted[encrypted.length - 1] ^= 0xff;

    expect(() => decrypt(encrypted)).toThrow();
  });

  it('decrypt throws on too-short buffer', async () => {
    const { decrypt } = await import('./ai.service.js');

    const shortBuffer = Buffer.alloc(10); // Less than IV + AuthTag + 1
    expect(() => decrypt(shortBuffer)).toThrow('Datos cifrados inválidos.');
  });

  it('throws when ENCRYPTION_KEY is not set', async () => {
    // Reset module cache to test with different env
    vi.resetModules();
    const savedKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;

    const { encrypt } = await import('./ai.service.js');
    expect(() => encrypt('test')).toThrow('Encryption key no configurada correctamente.');

    // Restore
    process.env.ENCRYPTION_KEY = savedKey;
  });

  it('throws when ENCRYPTION_KEY is wrong length', async () => {
    vi.resetModules();
    const savedKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';

    const { encrypt } = await import('./ai.service.js');
    expect(() => encrypt('test')).toThrow('Encryption key no configurada correctamente.');

    // Restore
    process.env.ENCRYPTION_KEY = savedKey;
  });
});

describe('AIService - Validation', () => {
  it('chat rejects empty query', async () => {
    // Mock the db to prevent real database calls
    vi.mock('../db/connection.js', () => ({
      db: {
        select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
      },
    }));

    const { AIService, AIError } = await import('./ai.service.js');

    await expect(AIService.chat('teacher-1', '')).rejects.toThrow('La consulta no puede estar vacía.');
  });

  it('chat rejects query exceeding 2000 chars', async () => {
    const { AIService } = await import('./ai.service.js');
    const longQuery = 'a'.repeat(2001);

    await expect(AIService.chat('teacher-1', longQuery)).rejects.toThrow(
      'La consulta excede el máximo de 2000 caracteres.'
    );
  });

  it('configure rejects empty API key', async () => {
    const { AIService } = await import('./ai.service.js');

    await expect(AIService.configure('teacher-1', 'gemini', '')).rejects.toThrow(
      'La API key no puede estar vacía.'
    );
  });

  it('configure rejects whitespace-only API key', async () => {
    const { AIService } = await import('./ai.service.js');

    await expect(AIService.configure('teacher-1', 'claude', '   ')).rejects.toThrow(
      'La API key no puede estar vacía.'
    );
  });
});
