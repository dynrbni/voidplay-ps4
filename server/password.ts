import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';

const scrypt = promisify(derive);
export const passwordRecordSchema = z.strictObject({ algorithm: z.literal('scrypt'), salt: z.string().regex(/^[a-f0-9]{32}$/), hash: z.string().regex(/^[a-f0-9]{64}$/) });
export type PasswordRecord = z.infer<typeof passwordRecordSchema>;

export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 32) as Buffer;
  return { algorithm: 'scrypt', salt, hash: hash.toString('hex') };
}

export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  if (password.length > 128) return false;
  const hash = await scrypt(password, record.salt, 32) as Buffer;
  return timingSafeEqual(hash, Buffer.from(record.hash, 'hex'));
}
