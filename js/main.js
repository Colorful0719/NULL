import { Game } from './core/Game.js?v=ch2transition2';

const game = new Game(document.querySelector('#app'));
game.initialize().catch((error) => console.error(error));
