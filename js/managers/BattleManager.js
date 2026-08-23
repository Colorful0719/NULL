import { BattleFormula } from '../systems/BattleFormula.js';
import { EmotionSystem } from '../systems/EmotionSystem.js';
import { STATUS_DEFINITIONS, StatusSystem } from '../systems/StatusSystem.js';

export const BATTLE_PHASE = Object.freeze({ START:'BATTLE_START', PLAYER:'PLAYER_TURN', PLAYER_RESOLVE:'PLAYER_ACTION_RESOLVE', ENEMY:'ENEMY_TURN', ENEMY_RESOLVE:'ENEMY_ACTION_RESOLVE', STATUS:'STATUS_RESOLVE', CHECK:'CHECK_END', VICTORY:'VICTORY', DEFEAT:'DEFEAT' });
const LABELS={BATTLE_START:'戰鬥開始',PLAYER_TURN:'玩家回合',PLAYER_ACTION_RESOLVE:'結算玩家行動',ENEMY_TURN:'敵方回合',ENEMY_ACTION_RESOLVE:'結算敵方行動',STATUS_RESOLVE:'狀態結算',CHECK_END:'確認勝敗',VICTORY:'勝利',DEFEAT:'敗北',SPECIAL_VICTORY:'特殊勝利',PHASE_COMPLETE:'第一階段完成'};

export class BattleManager {
  constructor({ gameState, enemies, bosses=[], view, saveManager, onStart, onExit }) { this.gameState=gameState; this.enemies=enemies; this.bosses=bosses; this.view=view; this.saveManager=saveManager; this.onStart=onStart; this.onExit=onExit;this.context={}; }
  start(enemyId,context={}) {
    const source=this.enemies.find((enemy)=>enemy.id===enemyId); if(!source) throw new Error(`找不到敵人：${enemyId}`);
    this.context=context;this.onStart?.(this.context,source);
    const player=this.gameState.get('player');
    this.battle={ phase:BATTLE_PHASE.START, round:1, player:{...player,emotion:this.gameState.get('emotion'),statuses:[]}, enemy:{...source,emotion:source.emotion??'AWARENESS',hp:source.maxHp,statuses:[]}, clue:'', ended:false };
    this.view.resetResult(); this.view.open(); this.view.addLog(`${source.displayName} 出現了。`); this.transition(BATTLE_PHASE.PLAYER);this.persistBattle();
  }
  startBoss(bossId,context={}){const source=this.bosses.find((boss)=>boss.id===bossId);if(!source)throw new Error(`找不到 Boss：${bossId}`);this.context=context;this.onStart?.(this.context,source);const player=this.gameState.get('player');const phaseLimit=context.phaseLimit??null;const phaseIndex=source.phases.findIndex((phase)=>phase.id===phaseLimit);const startResistance=phaseIndex>0?source.phases[phaseIndex-1].minResistance-1:source.maxResistance;this.battle={phase:BATTLE_PHASE.START,round:1,player:{...player,emotion:this.gameState.get('emotion'),statuses:[]},enemy:{...source,maxHp:source.maxResistance,hp:startResistance,statuses:[]},isBoss:true,phaseLimit,bossPhase:null,observeCount:0,communicateCount:0,askFirstUnlocked:false,clue:'',ended:false};this.updateBossPhase(true);this.view.resetResult();this.view.open();this.view.addLog(phaseLimit?`ALBUM 展開「${this.battle.bossPhase.displayName}」屏障。`:'ALBUM 守著所有被分享的照片。');this.transition(BATTLE_PHASE.PLAYER);this.persistBattle();}
  restore(snapshot){const source=snapshot.isBoss?this.bosses.find((item)=>item.id===snapshot.enemyId):this.enemies.find((item)=>item.id===snapshot.enemyId);if(!source)throw new Error(`無法還原戰鬥：${snapshot.enemyId}`);this.context=snapshot.context??{};this.onStart?.(this.context,source);this.battle={phase:BATTLE_PHASE.PLAYER,round:snapshot.round,player:{...this.gameState.get('player'),...snapshot.player,statuses:snapshot.player.statuses??[]},enemy:{...source,maxHp:snapshot.isBoss?source.maxResistance:source.maxHp,hp:snapshot.enemyHp,statuses:[]},isBoss:snapshot.isBoss,phaseLimit:snapshot.phaseLimit??snapshot.context?.phaseLimit??null,observeCount:snapshot.observeCount??0,communicateCount:snapshot.communicateCount??0,askFirstUnlocked:snapshot.askFirstUnlocked??false,clue:snapshot.clue??'',ended:false,bossPhase:null};if(snapshot.isBoss)this.updateBossPhase(true);this.view.resetResult();this.view.open();this.view.addLog(`已還原第 ${snapshot.round} 回合的戰鬥。`);this.transition(BATTLE_PHASE.PLAYER);}
  persistBattle(){if(!this.battle||this.battle.ended)return;this.gameState.set('flags.activeBattle',{enemyId:this.battle.enemy.id,isBoss:Boolean(this.battle.isBoss),phaseLimit:this.battle.phaseLimit??null,round:this.battle.round,enemyHp:this.battle.enemy.hp,player:{hp:this.battle.player.hp,sp:this.battle.player.sp,emotion:this.battle.player.emotion,statuses:this.battle.player.statuses},observeCount:this.battle.observeCount??0,communicateCount:this.battle.communicateCount??0,askFirstUnlocked:this.battle.askFirstUnlocked??false,clue:this.battle.clue,context:this.context});this.saveManager.save();}
  clearBattleCheckpoint(){this.gameState.set('flags.activeBattle',null);}
  updateBossPhase(initial=false){if(!this.battle.isBoss)return;const next=this.battle.enemy.phases.find((phase)=>this.battle.enemy.hp>=phase.minResistance)??this.battle.enemy.phases.at(-1);if(this.battle.bossPhase?.id!==next.id){this.battle.bossPhase=next;Object.assign(this.battle.enemy,{intent:next.intent,actionName:next.actionName,attack:next.attack,inflictedStatus:next.inflictedStatus});if(!initial)this.view.addLog(`ALBUM 進入「${next.displayName}」階段，戰鬥狀態保持不變。`);}}
  transition(phase) { this.battle.phase=phase; this.render(); }
  render() { const phaseNumber=this.battle.isBoss?this.battle.enemy.phases.findIndex((phase)=>phase.id===this.battle.bossPhase?.id)+1:0;const ordinal={1:'一',2:'二',3:'三'}[phaseNumber]??phaseNumber;const phaseLabel=this.battle.phase==='PHASE_COMPLETE'?`第${ordinal}階段完成`:LABELS[this.battle.phase];this.view.render({...this.battle,phaseLabel,canAct:this.battle.phase===BATTLE_PHASE.PLAYER&&!this.battle.ended}); }
  act(action) {
    if(this.battle.phase!==BATTLE_PHASE.PLAYER||this.battle.ended)return;
    this.transition(BATTLE_PHASE.PLAYER_RESOLVE);
    if(action==='ATTACK'){ const emotionMultiplier=EmotionSystem.multiplier(this.battle.player.emotion,this.battle.enemy.emotion); const statusMultiplier=StatusSystem.multiplier(this.battle.player.statuses,'outgoingMultiplier'); const modifiers=this.gameState.get('puzzleProgress.photo_check.battleModifiers')??[];const defModifier=modifiers.some((item)=>item.targetId===this.battle.enemy.id&&item.type==='DEF_PERCENT')?1.15:1; const baseDamage=this.battle.isBoss?12:20;const damage=BattleFormula.damage({baseDamage,emotionMultiplier,defenseMultiplier:defModifier,statusMultiplier}); this.battle.enemy.hp=Math.max(0,this.battle.enemy.hp-damage); this.view.addLog(`PLAYER 以「${EmotionSystem.label(this.battle.player.emotion)}」策略行動，情緒倍率 ${emotionMultiplier}、解謎倍率 ${defModifier}，降低 ${damage} 點${this.battle.isBoss?'抗拒度':'生命值'}。`);this.view.feedback?.('player-attack',{enemyId:this.battle.enemy.id,phaseId:this.battle.bossPhase?.id}); }
    else if(action==='OBSERVE'){if(this.battle.isBoss){const clue=this.battle.enemy.clues[Math.min(this.battle.observeCount,this.battle.enemy.clues.length-1)];this.battle.observeCount+=1;this.battle.clue=clue;this.battle.enemy.hp=Math.max(1,this.battle.enemy.hp-8);this.view.addLog(`觀察成功：${clue}。ALBUM 抗拒度降低 8 點。`);}else{this.battle.clue=this.battle.enemy.weakness;this.view.addLog(`觀察成功：發現「${this.battle.clue}」。`);}this.view.feedback?.('observe',{enemyId:this.battle.enemy.id,phaseId:this.battle.bossPhase?.id});}
    else if(action==='EMOTION'){ this.battle.player.sp=Math.max(0,this.battle.player.sp-5); this.battle.player.emotion=EmotionSystem.next(this.battle.player.emotion); StatusSystem.add(this.battle.player.statuses,'PROTECTED'); this.view.addLog(`PLAYER 切換為「${EmotionSystem.label(this.battle.player.emotion)}」，並進入「受保護」狀態。`);this.view.feedback?.('emotion',{enemyId:this.battle.enemy.id}); }
    else if(action==='COMMUNICATE'&&this.battle.isBoss){this.battle.communicateCount+=1;const puzzleDone=Boolean(this.gameState.get('puzzleProgress.photo_check.completed'));const reduction=puzzleDone?20:8;this.battle.enemy.hp=Math.max(1,this.battle.enemy.hp-reduction);this.view.addLog(puzzleDone?`你說明照片中的人也有決定權，ALBUM 抗拒度降低 ${reduction} 點。`:'缺少照片線索，ALBUM 只稍微動搖。');this.view.feedback?.('communicate',{enemyId:this.battle.enemy.id,phaseId:this.battle.bossPhase?.id});}
    else if(action==='ASK_FIRST'&&this.battle.isBoss&&this.battle.askFirstUnlocked){this.specialVictory();return;}
    if(this.battle.isBoss&&this.checkLimitedPhaseEnd())return;
    if(this.battle.isBoss){this.updateBossPhase();const puzzleDone=Boolean(this.gameState.get('puzzleProgress.photo_check.completed'));this.battle.askFirstUnlocked=puzzleDone&&this.battle.observeCount>=2&&this.battle.communicateCount>=1;}
    this.transition(BATTLE_PHASE.CHECK); if(this.checkEnd())return;
    this.transition(BATTLE_PHASE.ENEMY); this.enemyTurn();
  }
  enemyTurn() {
    const emotionMultiplier=EmotionSystem.multiplier(this.battle.enemy.emotion,this.battle.player.emotion); const statusMultiplier=StatusSystem.multiplier(this.battle.player.statuses,'incomingMultiplier'); const damage=BattleFormula.damage({baseDamage:this.battle.enemy.attack,emotionMultiplier,statusMultiplier});
    const statusId=this.battle.enemy.inflictedStatus??'CONFUSED';const statusName=STATUS_DEFINITIONS[statusId]?.displayName??'混亂';
    this.transition(BATTLE_PHASE.ENEMY_RESOLVE); this.battle.player.hp=Math.max(0,this.battle.player.hp-damage); StatusSystem.add(this.battle.player.statuses,statusId); this.view.addLog(`${this.battle.enemy.displayName} 使用「${this.battle.enemy.actionName??'資料干擾'}」，PLAYER 受到 ${damage} 點傷害並陷入「${statusName}」。`);
    const enemyFeedback=this.battle.enemy.id==='sharer'?'enemy-sharer':this.battle.enemy.id==='tracker'?'enemy-tracker':this.battle.isBoss?'enemy-album':'player-hit';this.view.feedback?.(enemyFeedback,{enemyId:this.battle.enemy.id,phaseId:this.battle.bossPhase?.id});
    this.transition(BATTLE_PHASE.STATUS); this.battle.player.statuses=StatusSystem.tick(this.battle.player.statuses); this.battle.enemy.statuses=StatusSystem.tick(this.battle.enemy.statuses); this.view.addLog('狀態持續時間已結算。');
    this.transition(BATTLE_PHASE.CHECK); if(this.checkEnd())return;
    this.battle.round+=1; this.transition(BATTLE_PHASE.PLAYER);this.persistBattle();
  }
  checkEnd() {
    if(this.battle.enemy.hp<=0){ this.battle.ended=true; this.transition(BATTLE_PHASE.VICTORY); const path=this.battle.isBoss?'defeatedBosses':'defeatedEnemies';this.gameState.update(path,(ids)=>ids.includes(this.battle.enemy.id)?ids:[...ids,this.battle.enemy.id]); this.gameState.set('player.hp',this.battle.player.hp); this.gameState.set('player.sp',this.battle.player.sp); this.gameState.set('emotion',this.battle.player.emotion);this.clearBattleCheckpoint(); this.saveManager.save();this.view.feedback?.(this.battle.isBoss?'album-victory':'victory',{enemyId:this.battle.enemy.id,phaseId:this.battle.bossPhase?.id}); this.view.showResult(this.battle.isBoss?'一般勝利':'戰鬥勝利',`${this.battle.enemy.displayName} 已穩定下來。你可以返回原探索位置。`); return true; }
    if(this.battle.player.hp<=0){ this.battle.ended=true; this.transition(BATTLE_PHASE.DEFEAT);this.clearBattleCheckpoint();this.gameState.set('player.hp',this.battle.player.maxHp);this.saveManager.save(); this.view.showResult('暫時撤退','你被雜訊淹沒了。返回城鎮後可以重新挑戰。'); return true; }
    this.render(); return false;
  }
  checkLimitedPhaseEnd(){
    if(!this.battle.phaseLimit)return false;
    const limitedPhase=this.battle.enemy.phases.find((phase)=>phase.id===this.battle.phaseLimit);
    if(!limitedPhase)return false;
    const isFinalPhase=this.battle.enemy.phases.at(-1)?.id===limitedPhase.id;
    if(isFinalPhase?this.battle.enemy.hp>limitedPhase.minResistance:this.battle.enemy.hp>=limitedPhase.minResistance)return false;
    const completion={phase_1_memory:{flag:'albumPhase1Complete',ordinal:'第一',message:'你理解了回憶與同意可以同時被保留。'},phase_2_exposure:{flag:'albumPhase2Complete',ordinal:'第二',message:'你辨認了公開與轉傳會改變照片的控制範圍。'},phase_3_profile:{flag:'albumPhase3Complete',ordinal:'第三',message:'你拆解了多次分享共同拼出的個人資料輪廓。'}}[limitedPhase.id];
    if(!completion)return false;
    this.battle.ended=true;this.transition('PHASE_COMPLETE');
    this.gameState.set(`flags.${completion.flag}`,true);
    this.gameState.set('player.hp',this.battle.player.hp);this.gameState.set('player.sp',this.battle.player.sp);
    this.clearBattleCheckpoint();this.saveManager.save();
    this.view.showResult(`${completion.ordinal}階段完成`,`${completion.message}戰鬥停在「${limitedPhase.displayName}」，尚未進入下一階段。`);
    return true;
  }
  specialVictory(){this.battle.ended=true;this.transition('SPECIAL_VICTORY');this.gameState.update('defeatedBosses',(ids)=>ids.includes('album')?ids:[...ids,'album']);this.gameState.set('flags.albumSpecialVictory',true);this.gameState.set('player.hp',this.battle.player.hp);this.gameState.set('player.sp',this.battle.player.sp);this.clearBattleCheckpoint();this.saveManager.save();this.view.feedback?.('album-victory',{enemyId:'album',phaseId:this.battle.bossPhase?.id});this.view.showResult('特殊勝利','你與 ALBUM 約定：保存回憶之前，先詢問照片中的人。抗拒度不必歸零。');}
  exit(){ if(!this.battle?.ended)return; const battle=this.battle;const context=this.context;this.view.close();this.battle=null;this.context={};this.onExit?.(battle,context); }
}
