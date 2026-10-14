import { describe, expect, it } from 'vitest';
import { migrateJson, readJson, scopedKey, writeJson } from '../src/lib/storage.js';

function storageMock() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

describe('MarioFit scoped storage', () => {
  it('creates user-scoped keys', () => {
    expect(scopedKey('user-a', 'workout-draft')).toBe('mariofit:v2:user-a:workout-draft');
  });

  it('migrates legacy data without deleting it', () => {
    const storage = storageMock();
    writeJson(storage, 'mariofit_notes_v1', { note: 'test' });
    const result = migrateJson(storage, 'mariofit_notes_v1', scopedKey('user-a', 'notes'), value => value !== null);
    expect(result).toEqual({ note: 'test' });
    expect(readJson(storage, 'mariofit_notes_v1')).toEqual({ note: 'test' });
    expect(readJson(storage, scopedKey('user-a', 'notes'))).toEqual({ note: 'test' });
  });

  it('keeps users isolated', () => {
    const storage = storageMock();
    writeJson(storage, scopedKey('user-a', 'workout-draft'), { value: 10 });
    writeJson(storage, scopedKey('user-b', 'workout-draft'), { value: 20 });
    expect(readJson(storage, scopedKey('user-a', 'workout-draft'))).toEqual({ value: 10 });
    expect(readJson(storage, scopedKey('user-b', 'workout-draft'))).toEqual({ value: 20 });
  });
});
