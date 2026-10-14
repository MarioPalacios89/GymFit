const PREFIX = 'mariofit:v2';

export function scopedKey(userId, feature) {
  return `${PREFIX}:${userId || 'anonymous'}:${feature}`;
}

export function readJson(storage, key, fallback = null) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function migrateJson(storage, legacyKey, nextKey, validate = value => value != null) {
  const current = readJson(storage, nextKey);
  if (validate(current)) return current;
  const legacy = readJson(storage, legacyKey);
  if (!validate(legacy)) return null;
  writeJson(storage, nextKey, legacy);
  return legacy;
}
