export class InputManager {
  constructor({ root, dialogueManager, getMapManager, onControls, onJournal, isModalOpen }) {
    this.root = root; this.dialogueManager = dialogueManager; this.getMapManager = getMapManager;
    this.onControls=onControls;this.onJournal=onJournal;this.isModalOpen=isModalOpen;
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  start() { document.addEventListener('keydown', this.onKeyDown); }
  onKeyDown(event) {
    if(this.isModalOpen?.())return;
    if (!this.root.querySelector('#map-screen')?.hidden) {
      if(event.key.toLowerCase()==='m'){event.preventDefault();this.onControls?.();return;}
      if(event.key.toLowerCase()==='j'){event.preventDefault();this.onJournal?.();return;}
      if (event.key.toLowerCase() === 'e') { event.preventDefault(); this.getMapManager()?.interact(); return; }
      const directions = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0], KeyW:[0,-1], KeyS:[0,1], KeyA:[-1,0], KeyD:[1,0] };
      const delta = directions[event.code]??directions[event.key]??directions[event.key.toLowerCase()];
      if (delta) { event.preventDefault(); this.getMapManager()?.move(...delta); }
      return;
    }
    if (this.root.querySelector('#dialogue-scene')?.hidden) return;
    const choiceButtons=[...this.root.querySelectorAll('#dialogue-choices:not([hidden]) button')];
    if(choiceButtons.length&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
      event.preventDefault();const current=choiceButtons.indexOf(document.activeElement);const delta=event.key==='ArrowDown'?1:-1;choiceButtons[(current+delta+choiceButtons.length)%choiceButtons.length].focus();return;
    }
    if (event.key === 'Enter' && !event.target.closest('button')) { event.preventDefault(); this.dialogueManager.next(); }
    if (event.code === 'Space') { event.preventDefault(); this.dialogueManager.reveal(); }
    if (event.key === 'Escape') this.dialogueManager.finish();
  }
}
