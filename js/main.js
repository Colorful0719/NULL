import { Game } from './core/Game.js?v=tablethud1';

const game = new Game(document.querySelector('#app'));
game.initialize().catch((error) => console.error(error));
