import { Game } from './core/Game.js?v=battleui1';

const game = new Game(document.querySelector('#app'));
game.initialize().catch((error) => console.error(error));
