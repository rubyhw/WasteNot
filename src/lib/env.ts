// src/lib/env.ts
export function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length ? v : null;
}
