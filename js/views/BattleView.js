import { EmotionSystem } from '../systems/EmotionSystem.js';
import { StatusSystem } from '../systems/StatusSystem.js';
export class BattleView {
  constructor(root, characters={}, audioManager=null) {
    this.root=root; this.screen=root.querySelector('#battle-screen');
    this.characters=characters;this.enemyArt=root.querySelector('#battle-enemy-art');this.noiseArt=root.querySelector('.noise-enemy');this.playerPortrait=root.querySelector('#battle-player-portrait');
    this.enemyName=root.querySelector('#enemy-name'); this.enemyHp=root.querySelector('#enemy-hp');
    this.playerHp=root.querySelector('#player-hp'); this.playerSp=root.querySelector('#player-sp');
    this.turn=root.querySelector('#battle-turn'); this.phase=root.querySelector('#battle-phase');
    this.intent=root.querySelector('#enemy-intent'); this.clue=root.querySelector('#battle-clue');
    this.log=root.querySelector('#battle-log'); this.commands=root.querySelector('#battle-commands');
    this.playerEmotion=root.querySelector('#player-emotion'); this.playerStatuses=root.querySelector('#player-statuses'); this.enemyEmotion=root.querySelector('#enemy-emotion');
    this.progressLabel=root.querySelector('#enemy-progress-label');this.bossPhase=root.querySelector('#boss-phase');this.askFirst=root.querySelector('[data-battle-action="ASK_FIRST"]');this.communicate=root.querySelector('[data-battle-action="COMMUNICATE"]');
    this.exitButton=root.querySelector('#battle-exit');this.effects=root.querySelector('#battle-effects');this.message=root.querySelector('#battle-message');this.tip=root.querySelector('#battle-tip');this.logPanel=root.querySelector('#battle-log-panel');this.logToggle=root.querySelector('#battle-log-toggle');this.audio=audioManager;this.effectTimer=null;this.effectQueue=[];this.feedbackActive=false;this.lastBattleKey='';this.lastBossPhase='';
    this.logToggle?.addEventListener('click',()=>{const expanded=this.logToggle.getAttribute('aria-expanded')==='true';this.logToggle.setAttribute('aria-expanded',String(!expanded));this.logToggle.textContent=expanded?'戰鬥紀錄':'關閉紀錄';this.logPanel.hidden=expanded;});
  }
  open() { this.root.querySelector('#title-screen').hidden=true;this.root.querySelector('#map-screen').hidden=true;this.root.querySelector('#reflection-screen').hidden=true; this.screen.hidden=false; }
  render(model) {
    const bossVisual=model.isBoss?model.enemy.visuals?.[model.bossPhase?.id]:null;const enemyVisual=bossVisual??model.enemy.battleArt??null;
    this.enemyArt.hidden=!enemyVisual;this.noiseArt.hidden=Boolean(enemyVisual);
    if(enemyVisual){this.currentBossVisuals=model.isBoss?model.enemy.visuals:null;this.enemyArt.src=enemyVisual;this.enemyArt.alt=model.isBoss?`${model.enemy.displayName}：${model.bossPhase.displayName}`:`${model.enemy.displayName} 戰鬥立繪`;}
    const player=this.characters.player;if(player)this.playerPortrait.src=player.portraits.neutral??player.portraits[player.defaultPortrait];
    this.enemyName.textContent=model.enemy.displayName;
    this.enemyHp.textContent=`${model.enemy.hp}／${model.enemy.maxHp}`;
    this.progressLabel.textContent=model.isBoss?'抗拒度':'生命值';this.bossPhase.textContent=model.isBoss?`目前階段：${model.bossPhase.displayName}`:'';this.screen.dataset.bossPhase=model.bossPhase?.id??'';
    this.exitButton.textContent=model.isBoss?'繼續戰後事件':'返回探索地圖';
    this.enemyHp.closest('section').querySelector('.enemy-bar').style.setProperty('--value',`${model.enemy.hp/model.enemy.maxHp*100}%`);
    this.playerHp.textContent=`${model.player.hp}／${model.player.maxHp}`;
    this.playerSp.textContent=`${model.player.sp}／${model.player.maxSp}`;
    this.playerEmotion.textContent=EmotionSystem.label(model.player.emotion); this.enemyEmotion.textContent=EmotionSystem.label(model.enemy.emotion);
    const statuses=StatusSystem.describe(model.player.statuses); this.playerStatuses.textContent=statuses.length?statuses.join('、'):'無';
    this.turn.textContent=String(model.round); this.phase.textContent=model.phaseLabel;
    this.intent.textContent=model.enemy.intent; this.clue.textContent=model.clue || '尚未發現';
    const tips={sharer:'照片可能被快速複製；觀察能幫你理解它的行動。',tracker:'不同資訊正在被連結；觀察可能揭露新的線索。',album:'每一階段呈現不同的照片問題，留意目前的變化。'};this.tip.textContent=`提示：${tips[model.enemy.id]??'觀察可能揭露新的資訊。'}`;
    this.commands.querySelectorAll('button').forEach((button)=>{ button.disabled=!model.canAct || button.dataset.locked==='true'; });this.communicate.disabled=!model.canAct||!model.isBoss;this.askFirst.hidden=!model.isBoss;this.askFirst.disabled=!model.canAct||!model.askFirstUnlocked;
    const battleKey=`${model.enemy.id}:${model.phaseLimit??'normal'}`;if(this.lastBattleKey!==battleKey){this.lastBattleKey=battleKey;this.feedback('battle-enter',{enemyId:model.enemy.id,phaseId:model.bossPhase?.id});}
    if(model.isBoss&&this.lastBossPhase&&this.lastBossPhase!==model.bossPhase?.id)this.feedback('phase-transition',{phaseId:model.bossPhase?.id});
    if(model.isBoss)this.lastBossPhase=model.bossPhase?.id??this.lastBossPhase;
  }
  addLog(message) { const item=document.createElement('li'); item.textContent=message; this.log.prepend(item);if(this.message)this.message.textContent=message; }
  showResult(title, detail) { const phaseComplete=title.endsWith('階段完成');const playerRetreated=title==='暫時撤退';if(this.currentBossVisuals&&!phaseComplete&&!playerRetreated){const resultVisual=this.currentBossVisuals.resolve;if(resultVisual){this.enemyArt.src=resultVisual;this.enemyArt.alt='ALBUM 和解狀態';}}if(playerRetreated)this.enemyArt.alt=`${this.enemyName.textContent}：維持目前階段`;if(phaseComplete)this.exitButton.textContent='繼續階段事件';this.root.querySelector('#battle-result-title').textContent=title; this.root.querySelector('#battle-result-text').textContent=detail; this.root.querySelector('#battle-result').hidden=false; this.commands.hidden=true; }
  resetResult() { this.root.querySelector('#battle-result').hidden=true; this.commands.hidden=false; this.log.replaceChildren();if(this.message)this.message.textContent='戰鬥開始。選擇這一回合的行動。';if(this.logPanel)this.logPanel.hidden=true;if(this.logToggle){this.logToggle.setAttribute('aria-expanded','false');this.logToggle.textContent='戰鬥紀錄';} }
  feedback(type,detail={}){if(!this.effects)return;if(this.feedbackActive){if(this.effectQueue.length<4)this.effectQueue.push({type,detail});return;}this.feedbackActive=true;const enemyId=detail.enemyId??this.enemyName.textContent.toLowerCase();this.screen.dataset.feedback=type;this.effects.className=`battle-effects effect--${type} enemy--${enemyId} phase--${detail.phaseId??this.screen.dataset.bossPhase??''}`;this.effects.replaceChildren(...Array.from({length:type==='enemy-sharer'?6:type==='enemy-tracker'||type==='phase-profile'?5:4},(_,index)=>{const fragment=document.createElement('i');fragment.style.setProperty('--i',index);return fragment;}));const sounds={
      'battle-enter':['battle_enter'],'player-attack':['enemy_hit'],'observe':['scan'],'communicate':['communicate'],'emotion':['ui_confirm'],'player-hit':['player_hit'],
      'enemy-sharer':['photo_snap','digital_copy','share_whoosh','player_hit'],'enemy-tracker':['scan','data_connect','tracker_lock','player_hit'],
      'enemy-album':['player_hit'],'phase-transition':['phase_transition'],'victory':['victory'],'album-victory':['phase_transition','victory']
    }[type]??[];const addPhaseSounds=()=>{if(detail.phaseId==='phase_1_memory')sounds.push('photo_snap','scan');if(detail.phaseId==='phase_2_exposure')sounds.push('digital_copy','share_whoosh');if(detail.phaseId==='phase_3_profile')sounds.push('scan','data_connect','tracker_lock');};if(type==='battle-enter'||type==='phase-transition'||type==='enemy-album')addPhaseSounds();sounds.forEach((id,index)=>this.audio?.playSFX(id,{delay:index*140,volume:type==='album-victory'?.72:1}));this.effectTimer=setTimeout(()=>{this.screen.dataset.feedback='';this.effects.className='battle-effects';this.effects.replaceChildren();this.feedbackActive=false;const next=this.effectQueue.shift();if(next)this.feedback(next.type,next.detail);},document.documentElement.classList.contains('reduced-effects')?220:type==='phase-transition'?1200:760);}
  playUiSound(id){this.audio?.playSFX(id);}
  close() { clearTimeout(this.effectTimer);this.effectQueue.length=0;this.feedbackActive=false;this.audio?.stopAll();this.effects?.replaceChildren();this.screen.dataset.feedback='';this.lastBattleKey='';if(this.logPanel)this.logPanel.hidden=true;if(this.logToggle){this.logToggle.setAttribute('aria-expanded','false');this.logToggle.textContent='戰鬥紀錄';}this.screen.hidden=true; }
}
