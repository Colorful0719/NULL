import { Game } from './core/Game.js?v=task10master';
import { installCh2BossDiagnostics } from './final/Ch2BossDiagnostics.js';

const game = new Game(document.querySelector('#app'));
installCh2BossDiagnostics(game);
if(new URLSearchParams(location.search).has('bossDebug'))globalThis.__CH2_BOSS_DEBUG_GAME__=game;
game.initialize().catch((error) => console.error(error));
