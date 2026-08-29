import { Game } from './core/Game.js?v=task081';

const game = new Game(document.querySelector('#app'));
game.initialize().catch((error) => console.error(error));
