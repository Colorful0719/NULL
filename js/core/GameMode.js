export const GAME_MODE = Object.freeze({
  EXPLORATION: 'EXPLORATION',
  DIALOGUE: 'DIALOGUE',
  PUZZLE: 'PUZZLE',
  BATTLE: 'BATTLE',
  MENU: 'MENU',
  REFLECTION: 'REFLECTION',
  ECHO: 'ECHO',
});

export const GAME_MODES = Object.freeze(Object.values(GAME_MODE));

export const isGameMode = (value) => GAME_MODES.includes(value);
