import { GAME_STATE_VERSION, initialGameState } from '../core/GameState.js?v=24p10';

export const SAVE_KEY = 'nullPrivacyRpg.save.v1';
export const LEGACY_GAME_STATE_VERSIONS = Object.freeze(['0.1.0','0.2.0','0.3.0']);

const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const mergeState = (defaults, saved) => {
  if (Array.isArray(defaults)) return Array.isArray(saved) ? structuredClone(saved) : structuredClone(defaults);
  if (!isRecord(defaults)) return saved === undefined ? structuredClone(defaults) : structuredClone(saved);
  const result = structuredClone(defaults);
  if (!isRecord(saved)) return result;
  Object.entries(saved).forEach(([key, value]) => {
    if (blockedKeys.has(key)) return;
    result[key] = key in defaults ? mergeState(defaults[key], value) : structuredClone(value);
  });
  return result;
};

export const migrateGameState = (savedState) => {
  if (!isRecord(savedState)) throw new Error('存檔狀態格式無效。');
  if (savedState.version !== GAME_STATE_VERSION && !LEGACY_GAME_STATE_VERSIONS.includes(savedState.version)) {
    throw new Error('存檔版本不相容。');
  }
  const migrated = mergeState(initialGameState, savedState);
  migrated.version = GAME_STATE_VERSION;
  return migrated;
};

export class SaveManager {
  constructor(gameState, storage = window.localStorage) {
    this.gameState = gameState;
    this.storage = storage;
  }

  hasSave() { return this.storage.getItem(SAVE_KEY) !== null; }

  save() {
    const payload = { savedAt: new Date().toISOString(), state: this.gameState.get() };
    this.storage.setItem(SAVE_KEY, JSON.stringify(payload));
    return payload;
  }

  load() {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      if (!payload?.state) throw new Error('存檔內容不完整。');
      const migratedState = migrateGameState(payload.state);
      this.gameState.replace(migratedState);
      if (payload.state.version !== GAME_STATE_VERSION) this.save();
      return payload;
    } catch (error) {
      throw new Error(`無法讀取存檔：${error.message}`);
    }
  }

  reset() {
    this.storage.removeItem(SAVE_KEY);
    this.gameState.replace(initialGameState);
    return this.gameState.get();
  }
}
