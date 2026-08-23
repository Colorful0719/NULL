export class SceneManager {
  constructor({ gameState, dialogueManager }) { this.gameState = gameState; this.dialogueManager = dialogueManager; }
  enter(scene, context={}) {
    this.gameState.set('sceneId', scene.id);
    if (scene.dialogueId) this.dialogueManager.start(scene.dialogueId, scene.displayName, context);
  }
}
