import {NullBossField} from '../final/NullBossField.js?v=task10master';
import {NullBossView} from '../views/NullBossView.js?v=task10master';
import {connectionEventId,createNullBossNarrativeState,hasNarrativeFired,narrativeEventLines} from '../final/NullBossNarrative.js?v=task10e3';

const DIRECTIONS={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};

export class NullBossManager {
  constructor({root,state,saveManager,onExit}){
    Object.assign(this,{root,state,saveManager,onExit});this.view=new NullBossView(root);this.keys=new Set();this.pointers=new Map();this.phase='CLOSED';this.narrativePaused=false;this.collapseReady=false;
    this.view.action.addEventListener('click',()=>{if(this.narrativePaused)return this.resumeNarrative();if(this.phase==='COMPLETE')return this.exit();this.startDodge();});
    this.view.interact.addEventListener('click',()=>this.interactNode());
    this.keydown=e=>{if(e.code==='KeyE'&&this.phase==='DODGE'&&!this.narrativePaused){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.interactNode();return;}if(this.phase==='CLOSED'||this.narrativePaused)return;if(DIRECTIONS[e.code]){e.preventDefault();e.stopImmediatePropagation();if(this.phase==='DODGE'){this.keys.add(e.code);if(!e.repeat){let x=0,y=0;for(const key of this.keys){x+=DIRECTIONS[key][0];y+=DIRECTIONS[key][1];}this.field.move(Math.sign(x),Math.sign(y),.025);this.view.render(this.field);}}}};
    this.keyup=e=>this.keys.delete(e.code);document.addEventListener('keydown',this.keydown,true);document.addEventListener('keyup',this.keyup,true);
    this.release=()=>{this.keys.clear();this.pointers.clear();this.lastTime=null;};window.addEventListener('blur',this.release);document.addEventListener('visibilitychange',this.release);
    const controls=this.view.screen.querySelector('.null-boss-directions');
    controls.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||this.phase!=='DODGE'||this.narrativePaused)return;e.preventDefault();b.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,[Number(b.dataset.dx),Number(b.dataset.dy)]);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])controls.addEventListener(event,e=>this.pointers.delete(e.pointerId));
    controls.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&this.phase==='DODGE'&&!this.narrativePaused){this.field.move(Number(b.dataset.dx),Number(b.dataset.dy),.12);this.view.render(this.field);}});
  }
  trace(event,extra={}){
    if(!new URLSearchParams(globalThis.location?.search??'').has('bossDebug'))return;
    const entry={event,phase:this.phase,round:this.flow?.round??null,elapsed:this.field?.time??0,profileStability:this.field?.profileStability??this.flow?.profileStability??null,narrativePaused:this.narrativePaused,pending:this.flow?.narrative?.pending?.event??null,inputEnabled:this.phase==='DODGE'&&!this.narrativePaused,collapseReady:this.collapseReady,...extra};
    globalThis.__CH2_BOSS_TRACE__??=[];globalThis.__CH2_BOSS_TRACE__.push(entry);console.debug('[CH2 BOSS]',entry);
  }
  assertInteractiveState(label){
    if(!new URLSearchParams(globalThis.location?.search??'').has('bossDebug'))return;
    const waitingForPlayer=this.phase==='PLAYER'||this.phase==='DODGE';const dialogueActive=this.narrativePaused;const actionAvailable=this.phase==='PLAYER'&&!this.view.action?.hidden;const movementAvailable=this.phase==='DODGE'&&!this.narrativePaused&&Boolean(this.frame);
    if(waitingForPlayer&&!dialogueActive&&!actionAvailable&&!movementAvailable)console.error('CH2_BOSS_INPUT_DEADLOCK',{label,phase:this.phase,round:this.flow?.round});
  }
  open(flow,background){
    this.stop();this.flow={...flow,narrative:createNullBossNarrativeState(flow.narrative)};this.phase=flow.phase==='COMPLETE'?'COMPLETE':'PLAYER';this.narrativePaused=false;this.collapseReady=this.phase==='COMPLETE'&&Boolean(this.state.get('flags.ch2NullProfileCollapsed'));
    this.state.set('mode','NULL_BOSS');this.state.set('playerMovementLocked',true);this.root.dataset.gameMode='null-boss';
    this.root.querySelector('#map-screen').hidden=true;this.root.querySelector('#title-screen').hidden=true;
    this.view.open(background);this.setPhase(this.phase);this.trace('ENTER');
    if(this.phase==='COMPLETE'){
      // Older/interrupted saves could contain a completed flow without the later
      // collapse flag. Normalize that factual boundary instead of exposing a
      // visible return button whose click is rejected forever.
      this.state.set('flags.ch2NullProfileCollapsed',true);this.state.set('flags.ch2NullBossFoundationComplete',true);
      this.flow.phase='COMPLETE';this.collapseReady=true;this.state.set('activeFlow.nullBoss',{...this.flow});this.saveManager.save();
      this.view.completeCollapse?.();this.trace('COLLAPSE_RESTORED');return;
    }
    if(this.phase==='PLAYER'){
      if(this.flow.narrative.pending)this.restorePendingNarrative();
      else if(this.flow.round===1)this.presentNarrative('round1_start','startDodge');
      else if(this.flow.round===2)this.presentNarrative('round2_start','startDodge');
      else if(this.flow.round===3)this.presentNarrative('round3_start','startDodge');
    }
    this.assertInteractiveState('open');
  }
  setPhase(phase){
    this.stop();this.phase=phase;this.flow.phase=phase;this.flow.profileStability??=this.flow.plan?.profileMaxStability??80;this.state.set('activeFlow.nullBoss',{...this.flow});this.saveManager.save();
    this.field=new NullBossField(this.flow.round,{...this.flow.plan,profileStability:this.flow.profileStability},this.flow.progress);this.view.phase(phase,this.flow.round,this.field);this.view.render(this.field);

  }
  presentNarrative(event,next){
    if(!this.flow?.plan||hasNarrativeFired(this.flow.narrative,event))return false;const lines=narrativeEventLines(event,this.flow.plan);if(!lines.length)return false;
    this.flow.narrative.fired.push(event);this.flow.narrative.pending={event,next};this.narrativePaused=true;this.release();this.view.showNarrative?.(lines,event);this.persistBoundary();return true;
  }
  restorePendingNarrative(){const pending=this.flow.narrative.pending;if(!pending)return false;const lines=narrativeEventLines(pending.event,this.flow.plan);if(!lines.length){this.flow.narrative.pending=null;this.narrativePaused=false;this.persistBoundary();if(this.phase==='PLAYER')this.startDodge();return false;}this.narrativePaused=true;this.release();this.view.showNarrative?.(lines,pending.event);this.trace('NARRATIVE_RESTORED',{event:pending.event});return true;}
  resumeNarrative(){if(!this.narrativePaused)return;const next=this.flow.narrative.pending?.next;this.flow.narrative.pending=null;this.narrativePaused=false;this.persistBoundary();this.trace('NARRATIVE_RESUME',{next});if(next==='startDodge'||this.phase==='PLAYER')this.startDodge();this.assertInteractiveState('resumeNarrative');}
  interactNode(){if(this.phase!=='DODGE'||this.narrativePaused||!this.field.interact())return false;this.flow.profileStability=this.field.profileStability;this.view.showReaction?.(['連結鬆開了。資訊仍然存在。'],'node_break');this.persistBoundary();this.view.render(this.field);this.trace('NODE_BROKEN',{node:this.field.resolvedNodes.length});return true;}
  persistBoundary(){if(this.phase==='DODGE'&&this.field)this.flow.progress=this.field.checkpoint();this.state.set('activeFlow.nullBoss',{...this.flow,phase:'PLAYER'});this.saveManager.save();}
  emitReaction(event,context={}){
    if(!this.flow?.plan)return false;this.flow.narrative??=createNullBossNarrativeState();
    const onceKey=context.onceKey??event;if(hasNarrativeFired(this.flow.narrative,onceKey))return false;const lines=narrativeEventLines(event,this.flow.plan,context);if(!lines.length)return false;this.flow.narrative.fired.push(onceKey);this.view.showReaction?.(lines,event);this.persistBoundary();return true;
  }
  processFieldNarrative(){
    if(!this.flow?.plan||this.phase!=='DODGE')return;
    const contact=this.field.lastContact;
    if(contact&&contact.sourceId&&contact.state!=='UNRESOLVED')this.emitReaction('fragment_reaction',{type:contact.semantic,onceKey:`fragment_${contact.sourceId}`});
    for(const pair of this.field.network??[]){
      if(!pair.relation)continue;const eventId=connectionEventId(pair);if(pair.state==='EXPLICIT')this.emitReaction('connection_explicit',{pair,onceKey:eventId});
      else if(pair.state==='CONTEXTUAL')this.emitReaction('first_contextual_connection',{pair});
      else this.emitReaction('first_unresolved_connection',{pair});
      if(pair.state==='EXPLICIT'&&((pair.fromType==='TAG'&&pair.toType==='AUDIENCE')||(pair.fromType==='AUDIENCE'&&pair.toType==='TAG')))this.emitReaction('tag_audience');
    }
    const types=new Set((this.flow.plan.round2??[]).map(item=>item.type));
    if(this.flow.round>=2&&types.has('TAG')&&types.has('AUDIENCE'))this.emitReaction('tag_audience');
    if(this.flow.round>=2&&this.field.time>=1){
      const planned=this.flow.plan.connections??this.flow.plan.pairs??[];
      if(planned.some(pair=>pair.state==='CONTEXTUAL'))this.emitReaction('contextual_connection');
      const hasBackground=(this.flow.plan.round2??[]).some(item=>item.type==='BACKGROUND_CLUE'&&item.state==='CONTEXTUAL');
      const missingLocation=(this.flow.plan.unresolvedNodes??[]).some(id=>id.includes('location'));
      if(this.field.time>=1.8&&hasBackground&&missingLocation)this.emitReaction('background_without_location');
      if(this.field.time>=2.5&&planned.some(pair=>pair.state==='UNRESOLVED'))this.emitReaction('unresolved_connection');
    }
    if(this.flow.round===3&&this.field.profileStability<this.field.profileMaxStability&&!hasNarrativeFired(this.flow.narrative,'stability_midpoint'))this.emitReaction('stability_midpoint');
    if(this.flow.round===3&&this.field.storm)this.emitReaction('pre_resolution');
  }
  startDodge(){
    if(this.phase!=='PLAYER'||this.narrativePaused)return;this.phase='DODGE';this.flow.phase='DODGE';this.field=new NullBossField(this.flow.round,{...this.flow.plan,profileStability:this.flow.profileStability},this.flow.progress);this.view.phase('DODGE',this.flow.round,this.field);this.trace(`ROUND_${this.flow.round}_START`);this.stormTraced=this.field.storm;
    // Save the stable PLAYER boundary. Moving objects and held inputs are never serialized.
    this.state.set('activeFlow.nullBoss',{...this.flow,phase:'PLAYER'});this.saveManager.save();this.lastTime=null;this.lastPersistAt=0;const tick=now=>{
      this.diagnostics?.frame('callback',now);
      if(this.phase!=='DODGE')return;
      if(this.narrativePaused){this.frame=requestAnimationFrame(tick);this.diagnostics?.queued();return;}
      const dt=this.lastTime===null||document.hidden?0:Math.min(.04,(now-this.lastTime)/1000);this.lastTime=now;
      let x=0,y=0;for(const key of this.keys){const d=DIRECTIONS[key];x+=d[0];y+=d[1];}for(const d of this.pointers.values()){x+=d[0];y+=d[1];}
      const done=this.field.step(dt,Math.sign(x),Math.sign(y));this.diagnostics?.frame('step',now,done);this.flow.profileStability=this.field.profileStability;if(this.field.storm&&!this.stormTraced){this.stormTraced=true;this.trace('DATA_STORM_START');this.view.showReaction?.(['連結暫時鬆開，資訊仍在流動。穿過最後一波資料風暴。'],'data_storm');}this.processFieldNarrative();this.view.render(this.field);if(now-this.lastPersistAt>500){this.lastPersistAt=now;this.persistBoundary();}
      if(done){this.lastContacts=this.field.contactsThisPhase;this.flow.profileStability=this.field.profileStability;this.trace(`ROUND_${this.flow.round}_END`);if(this.flow.round<3){this.flow.round++;this.flow.progress=null;this.setPhase('PLAYER');if(!this.presentNarrative(`round${this.flow.round}_start`,'startDodge'))this.assertInteractiveState('round2Transition');}else{this.trace('DATA_STORM_END');this.emitReaction('pre_resolution');this.beginCollapse();}return;}
      this.frame=requestAnimationFrame(tick);this.diagnostics?.queued();
    };this.frame=requestAnimationFrame(tick);this.diagnostics?.queued();this.assertInteractiveState('startDodge');
  }
  stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;this.keys.clear();this.pointers.clear();this.lastTime=null;}
  finishCollapse(){
    if(this.collapseReady)return;this.collapseReady=true;if(this.collapseFrame)cancelAnimationFrame(this.collapseFrame);this.collapseFrame=null;clearTimeout(this.collapseTimer);this.collapseTimer=null;this.view.completeCollapse?.();this.saveManager.save();this.trace('COLLAPSE_END');
  }
  beginCollapse(){
    if(this.phase==='COMPLETE'&&this.collapseReady)return;
    this.stop();this.phase='COMPLETE';this.collapseReady=false;this.flow.phase='COMPLETE';this.flow.profileStability=0;this.trace('COLLAPSE_START');
    this.state.set('flags.ch2NullProfileCollapsed',true);this.state.set('flags.ch2NullBossFoundationComplete',true);
    this.state.set('activeFlow.nullBoss',{...this.flow});this.saveManager.save();
    if(typeof this.view.beginCollapse==='function')this.view.beginCollapse({profileMaxStability:this.flow.plan?.profileMaxStability??0});
    else this.view.phase?.('COMPLETE',this.flow.round,this.field);
    // The simulation is stopped at the collapse boundary; the view keeps a short-lived visual copy.
    if(this.field){this.field.objects=[];this.field.network=[];}
    clearTimeout(this.collapseTimer);if(this.collapseFrame)cancelAnimationFrame(this.collapseFrame);
    const started=performance.now();const advance=now=>{if(now-started>=1700)this.finishCollapse();else this.collapseFrame=requestAnimationFrame(advance);};
    this.collapseFrame=requestAnimationFrame(advance);this.collapseTimer=setTimeout(()=>this.finishCollapse(),2100);
  }
  exit(){const visualReady=this.collapseReady||this.view.screen?.classList?.contains('is-collapsed');if(this.phase!=='COMPLETE'||!visualReady)return;this.trace('RETURN_DATA_WORLD');this.stop();if(this.collapseFrame)cancelAnimationFrame(this.collapseFrame);this.collapseFrame=null;clearTimeout(this.collapseTimer);this.collapseTimer=null;this.phase='CLOSED';this.view.close();this.state.set('activeFlow.nullBoss',null);this.onExit(this.flow.returnContext,{collapsed:true});this.saveManager.save();}
}
