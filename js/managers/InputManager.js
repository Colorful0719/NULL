export class InputManager {
  constructor({ root, dialogueManager, getMapManager, onControls, onJournal, isModalOpen }) {
    this.root = root; this.dialogueManager = dialogueManager; this.getMapManager = getMapManager;
    this.onControls=onControls;this.onJournal=onJournal;this.isModalOpen=isModalOpen;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerProfileChange = this.onPointerProfileChange.bind(this);
    this.onTouchInteractPointerDown = this.onTouchInteractPointerDown.bind(this);
    this.onTouchInteractClick = this.onTouchInteractClick.bind(this);
    this.onTouchMovePointerDown = this.onTouchMovePointerDown.bind(this);
    this.onTouchMoveClick = this.onTouchMoveClick.bind(this);
    this.lastPointerInteraction=0;this.lastPointerMove=0;
    this.debugTouch=new URLSearchParams(globalThis.location?.search??'').has('debugTouch');
  }
  start() {
    document.addEventListener('keydown', this.onKeyDown);
    this.coarsePointer = window.matchMedia('(pointer: coarse)');
    this.noHover = window.matchMedia('(hover: none)');
    this.coarsePointer.addEventListener?.('change', this.onPointerProfileChange);
    this.noHover.addEventListener?.('change', this.onPointerProfileChange);
    this.touchButton=this.root.querySelector('#touch-interact');
    this.touchButton?.addEventListener('pointerdown',this.onTouchInteractPointerDown);
    this.touchButton?.addEventListener('click',this.onTouchInteractClick);
    this.mapControls=this.root.querySelector('#map-controls');
    this.mapControls?.addEventListener('pointerdown',this.onTouchMovePointerDown);
    this.mapControls?.addEventListener('click',this.onTouchMoveClick);
    this.onPointerProfileChange();
  }
  onPointerProfileChange() {
    const touchCapable = this.coarsePointer?.matches || this.noHover?.matches || navigator.maxTouchPoints > 0;
    this.root.dataset.touchCapable = String(Boolean(touchCapable));
    this.getMapManager()?.refreshInteraction();
  }
  trace(label,value=''){if(this.debugTouch)console.debug(label,value);}
  requestInteraction(source='unknown') {
    const manager=this.getMapManager();
    if(source==='keyboard')this.trace('[KEYBOARD] E_RECEIVED');
    else if(source==='touch')this.trace('[TOUCH] INTERACTION_REQUESTED');
    this.trace('[INTERACTION] REQUESTED',source);
    this.trace('[INTERACTION] TARGET',manager?.currentInteraction?.id??null);
    this.trace('[INTERACTION] TARGET_TYPE',manager?.currentInteraction?.interaction?.kind??manager?.currentInteraction?.type??null);
    this.trace('[INTERACTION] TRIGGER_START',source);
    const success=manager?.interact()??false;
    this.trace('[INTERACTION] SUCCESS',success);
    return success;
  }
  interact() { return this.requestInteraction('programmatic'); }
  move(dx, dy) { return this.getMapManager()?.move(dx, dy) ?? false; }
  onTouchInteractPointerDown(event){if(event.pointerType==='mouse')return;this.trace('[TOUCH] button-pointerdown');this.lastPointerInteraction=performance.now();event.preventDefault();this.requestInteraction('touch');}
  onTouchInteractClick(){this.trace('[TOUCH] button-click');if(performance.now()-this.lastPointerInteraction<500)return;this.requestInteraction('touch');}
  moveFromButton(button,source='touch'){const moves={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};const delta=moves[button?.dataset.move];if(!delta)return false;this.trace('[TOUCH] move',`${button.dataset.move} (${source})`);return this.move(...delta);}
  onTouchMovePointerDown(event){const button=event.target.closest?.('[data-move]');if(!button||event.pointerType==='mouse')return;this.lastPointerMove=performance.now();event.preventDefault();this.moveFromButton(button,'pointerdown');}
  onTouchMoveClick(event){const button=event.target.closest?.('[data-move]');if(!button||performance.now()-this.lastPointerMove<500)return;this.moveFromButton(button,'click');}
  onKeyDown(event) {
    if(this.isModalOpen?.())return;
    if (!this.root.querySelector('#map-screen')?.hidden) {
      const key=String(event.key??'').toLowerCase();
      if(key==='m'){event.preventDefault();this.onControls?.();return;}
      if(key==='j'){event.preventDefault();this.onJournal?.();return;}
      if (event.code === 'KeyE' || key === 'e') { event.preventDefault(); this.requestInteraction('keyboard'); return; }
      const directions = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0], KeyW:[0,-1], KeyS:[0,1], KeyA:[-1,0], KeyD:[1,0] };
      const delta = directions[event.code]??directions[event.key]??directions[key];
      if (delta) { event.preventDefault(); this.move(...delta); }
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
