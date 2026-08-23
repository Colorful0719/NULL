export class DialogueManager {
  constructor({ data, view, choiceManager, saveManager, onStart, onComplete, onFinish }) {
    this.data = data; this.view = view; this.choiceManager = choiceManager;
    this.saveManager = saveManager; this.onStart=onStart;this.onComplete = onComplete;this.onFinish=onFinish;
    this.dialogue = null; this.lines=[];this.lineIndex = -1; this.complete = false;this.context={};this.selectedChoice=null;
  }
  start(dialogueId, sceneName, context={}) {
    this.dialogue = this.data.dialogues.find((item) => item.id === dialogueId);
    if (!this.dialogue) throw new Error(`找不到對話：${dialogueId}`);
    const prelude=(this.dialogue.conditionalPreludes??[]).find((item)=>this.choiceManager.gameState.get(`flags.${item.flag}`)===item.equals)?.lines??[];
    this.lines=[...prelude,...this.dialogue.lines];
    this.lineIndex = -1; this.complete = false;this.context=context;this.selectedChoice=null;
    this.onStart?.(context,this.dialogue);
    this.view.open(sceneName,{overlay:Boolean(context.overlay),label:this.dialogue.label??'事件對話',environment:Boolean(context.environment)});
    this.view.renderParticipants(this.dialogue.participants, this.data.characters);
    this.view.renderEnvironment?.(context.environment?this.dialogue:{});
    this.next();
  }
  next() {
    if (!this.dialogue || this.complete) return;
    if (this.view.isTyping()) { this.view.revealLine(); return; }
    this.lineIndex += 1;
    if (this.lineIndex < this.lines.length) {
      const line = this.lines[this.lineIndex];
      this.view.renderLine(line, this.data.characters[line.speakerId]);
      return;
    }
    const choices = (this.dialogue.choices??[]).map((id) => this.data.choices.find((choice) => choice.id === id)).filter(Boolean);
    if(!choices.length){this.complete=true;this.saveManager.save();this.view.showResult(this.dialogue.endText??'對話結束。');this.onComplete?.(null,this.context);return;}
    this.view.showChoices(choices, (choice) => this.select(choice));
  }
  reveal() { this.view.revealLine(); }
  select(choice) {
    const result = this.choiceManager.apply(choice);
    this.selectedChoice=choice;
    this.saveManager.save();
    this.complete = true;
    this.view.showResult(result);
    this.onComplete?.(choice);
  }
  finish() { if (!this.complete||!this.dialogue) return false;const context=this.context;const dialogue=this.dialogue;const selectedChoice=this.selectedChoice;this.view.close();this.dialogue=null;this.lines=[];this.context={};this.complete=false;this.selectedChoice=null;this.onFinish?.(context,dialogue,selectedChoice);return true; }
}
