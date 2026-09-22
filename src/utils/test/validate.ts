import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Validates a plain object against a DTO class using the same options as the global
 * ValidationPipe in main.ts (whitelist + forbidNonWhitelisted) and returns the names of
 * the properties that failed, sorted. An empty array means the payload is valid.
 */
export async function invalidProps<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property).sort();
}
