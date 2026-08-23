import { GAME_MODE } from './GameMode.js';

export const GAME_STATE_VERSION = '0.3.0';

export const initialGameState = Object.freeze({
  version: GAME_STATE_VERSION,
  mode: GAME_MODE.MENU,
  playerMovementLocked: true,
  chapter: 'PROLOGUE',
  sceneId: 'home_intro',
  exploration: {
    mapPositions: {},
    facing: 'down',
    returnContext: null,
    interactionTargetId: null
  },
  activeFlow: { dialogue: null, puzzle: null, memory: null, reflection: null, summary: null },
  player: { name: '主角', level: 1, hp: 100, maxHp: 100, sp: 50, maxSp: 50 },
  stats: { privacyAwareness: 0, digitalFootprint: 0, parentTrust: 50, communication: 0, agency: 0 },
  emotion: 'AWARENESS',
  flags: {},
  choices: [],
  quests: {},
  noticeBoardState: {},
  privacyClues: [],
  inventory: [],
  puzzleProgress: {},
  defeatedEnemies: [],
  defeatedBosses: [],
  reflections: [],
  trace: { photosShared: 0, locationShares: 0, profileDataShared: 0, consentAsked: 0, riskyChoices: 0, safeChoices: 0 }
});

const clone = (value) => structuredClone(value);
const pathParts = (path) => Array.isArray(path) ? path : String(path).split('.').filter(Boolean);

export class GameState {
  #state;

  constructor(seed = initialGameState) { this.#state = clone(seed); }

  get(path) {
    if (!path) return clone(this.#state);
    const value = pathParts(path).reduce((current, key) => current?.[key], this.#state);
    return clone(value);
  }

  set(path, value) {
    const keys = pathParts(path);
    if (!keys.length || keys.includes('__proto__') || keys.includes('constructor') || keys.includes('prototype')) {
      throw new TypeError('GameState 路徑無效。');
    }
    const next = clone(this.#state);
    const leaf = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') current[key] = {};
      return current[key];
    }, next);
    target[leaf] = clone(value);
    this.#state = next;
    return this.get();
  }

  update(path, updater) {
    if (typeof updater !== 'function') throw new TypeError('updater 必須是函式。');
    return this.set(path, updater(this.get(path)));
  }

  replace(nextState) {
    if (!nextState || typeof nextState !== 'object') throw new TypeError('存檔格式無效。');
    this.#state = clone(nextState);
    return this.get();
  }

  reset() { this.#state = clone(initialGameState); return this.get(); }
}
