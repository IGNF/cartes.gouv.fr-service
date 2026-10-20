import { vi } from 'vitest';

export function createStorage() {
  const entries = new Map();
  return {
    get length() { return entries.size; },
    key: vi.fn((index) => Array.from(entries.keys()).at(index) ?? null),
    getItem: vi.fn((key) => entries.get(key) ?? null),
    setItem: vi.fn((key, value) => { entries.set(key, String(value)); }),
    removeItem: vi.fn((key) => { entries.delete(key); })
  };
}
