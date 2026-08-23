export class ChoiceManager {
  constructor(gameState) { this.gameState = gameState; }
  apply(choice) {
    Object.entries(choice.effects ?? {}).forEach(([path, delta]) => {
      this.gameState.update(path, (current = 0) => current + delta);
    });
    Object.entries(choice.set ?? {}).forEach(([path, value]) => {
      this.gameState.set(path, value);
    });
    this.gameState.update('choices', (choices) => [...choices, choice.id]);
    this.gameState.set(`flags.${choice.id}`, true);
    return choice.resultText;
  }
}
