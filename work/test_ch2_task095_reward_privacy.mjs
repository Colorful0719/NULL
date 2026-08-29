import assert from 'node:assert/strict';
import { Game } from '../js/core/Game.js';
import { GameState } from '../js/core/GameState.js';
import { SaveManager, SAVE_KEY } from '../js/managers/SaveManager.js';

const dummyValues = [
  'TEST_PLAYER_9284',
  'delete-me@example.test',
  '0900-000-999',
  'TEST SCHOOL 9284',
  '2099-12-31',
  'TEST_ACCOUNT_9284'
];

const values = new Map([
  ['nickname', dummyValues[0]],
  ['ageRange', '16-18'],
  ['platform', 'tablet'],
  ['email', dummyValues[1]],
  ['phone', dummyValues[2]],
  ['school', dummyValues[3]],
  ['birthday', dummyValues[4]],
  ['gameId', dummyValues[5]],
  ['reward', 'skin']
]);

class TestFormData {
  constructor(form) { this.form = form; }
  get(name) { return this.form.values.get(name) ?? null; }
}
globalThis.FormData = TestFormData;

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key)
};
const state = new GameState();
const saveManager = new SaveManager(state, storage);
let resetCount = 0;
const form = { values, elements: { reward: { value: 'skin' } }, reset: () => { resetCount += 1; values.clear(); } };
const screen = { hidden: false };
const game = {
  state,
  saveManager,
  root: { querySelector: (selector) => selector === '#survey-form' ? form : selector === '#survey-screen' ? screen : null },
  grantSurveyReward() {},
  openBonusShareOffer() { this.saveManager.save(); }
};

Game.prototype.submitSurveyForm.call(game);
assert.deepEqual(state.get('flags.surveyDataShared'), ['nickname','ageRange','platform','email','phone','school','birthday','gameId']);
assert.equal(resetCount, 1, 'survey form must reset after submit');
assert.equal(screen.hidden, true, 'survey screen must close after submit');

const serializedState = JSON.stringify(state.get());
const serializedSave = storage.getItem(SAVE_KEY);
const serializedEcho = JSON.stringify(state.get('echo'));
for (const value of dummyValues) {
  assert.equal(serializedState.includes(value), false, `GameState persisted raw value: ${value}`);
  assert.equal(serializedSave.includes(value), false, `save persisted raw value: ${value}`);
  assert.equal(serializedEcho.includes(value), false, `ECHO persisted raw value: ${value}`);
}

const reloaded = new GameState();
new SaveManager(reloaded, storage).load();
const reloadedState = JSON.stringify(reloaded.get());
for (const value of dummyValues) assert.equal(reloadedState.includes(value), false, `reload reconstructed raw value: ${value}`);

console.log('TASK 09.5 REWARD BOOTH PRIVACY: PASS (0 persisted raw values)');
