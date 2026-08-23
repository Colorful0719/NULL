import { GameState } from './GameState.js?v=ch1summary1';
import { GAME_MODE } from './GameMode.js';
import { DATA_MANIFEST, DataLoader } from './DataLoader.js?v=bossreturn2';
import { SaveManager } from '../managers/SaveManager.js?v=24p10';
import { ChoiceManager } from '../managers/ChoiceManager.js?v=rinphoto1';
import { DialogueManager } from '../managers/DialogueManager.js?v=rinphoto1';
import { InputManager } from '../managers/InputManager.js?v=touch1';
import { SceneManager } from '../managers/SceneManager.js?v=24p5';
import { DialogueView } from '../views/DialogueView.js?v=boardphotos1';
import { MapManager } from '../managers/MapManager.js?v=parentfinal1';
import { MapView } from '../views/MapView.js?v=touch1';
import { BattleManager } from '../managers/BattleManager.js?v=battlepolish2';
import { BattleView } from '../views/BattleView.js?v=battleui1';
import { PuzzleManager } from '../managers/PuzzleManager.js?v=rinmulti1';
import { PuzzleView } from '../views/PuzzleView.js?v=rinmulti1';
import { ReflectionManager } from '../managers/ReflectionManager.js?v=act3pk';
import { ReflectionView } from '../views/ReflectionView.js?v=ch1final1';
import { QuestManager } from '../managers/QuestManager.js?v=noticeboards1';
import { MemoryInvestigationManager } from '../managers/MemoryInvestigationManager.js?v=memoryquestions2';
import { MemoryInvestigationView } from '../views/MemoryInvestigationView.js?v=memoryquestions2';
import { AudioManager } from '../audio/AudioManager.js?v=mute1';
import { GuidanceManager } from '../managers/GuidanceManager.js?v=boardside1';
import { GuidanceView } from '../views/GuidanceView.js?v=touch1';
import { ChapterSummaryManager } from '../managers/ChapterSummaryManager.js?v=ending1';
import { ChapterSummaryView } from '../views/ChapterSummaryView.js?v=ending1';

export class Game {
  constructor(root) {
    this.root = root;
    this.state = new GameState();
    this.saveManager = new SaveManager(this.state);
    this.audioManager = new AudioManager();
    this.dataLoader = new DataLoader();
    this.data = null;
  }
  async initialize() {
    if (!this.root) throw new Error('找不到遊戲根節點。');
    this.syncSaveUi();
    this.root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      const status = this.root.querySelector('#save-status');
      try {
        const message = this.handleAction(button.dataset.action);
        if (status && message) status.textContent = message;
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    await this.initializeData();
  }

  async initializeData() {
    const status = this.root.querySelector('#data-status');
    try {
      const data = await this.dataLoader.loadAll();
      this.data = data;
      this.setupStep4();
      const total = Object.keys(DATA_MANIFEST).length;
      if (status) status.textContent = `資料層已載入 ${Object.keys(data).length}/${total}`;
      document.documentElement.dataset.gameReady = 'true';
    } catch (error) {
      if (status) status.textContent = '資料載入失敗';
      this.showDevelopmentError(error.message);
      throw error;
    }
  }

  setupStep4() {
    this.data.dialogues=[...this.data.dialogues,...(this.data.bossDialogues??[]),...(this.data.act3Dialogues??[]),...(this.data.environmentDialogues??[])];
    this.guidanceManager=new GuidanceManager({gameState:this.state,saveManager:this.saveManager,view:new GuidanceView(this.root),getMode:()=>this.state.get('mode'),onIntroComplete:()=>this.startOpeningDialogue(),scenes:this.data.scenes});
    const view = new DialogueView(this.root);
    const choiceManager = new ChoiceManager(this.state);
    this.questManager=new QuestManager({definitions:this.data.quests,gameState:this.state,saveManager:this.saveManager});
    this.reflectionManager=new ReflectionManager({definitions:this.data.reflections,gameState:this.state,view:new ReflectionView(this.root),saveManager:this.saveManager,onStart:(definition)=>this.beginReflection(definition),onExit:()=>this.finishReflection()});
    this.summaryManager=new ChapterSummaryManager({gameState:this.state,saveManager:this.saveManager,view:new ChapterSummaryView(this.root),audioManager:this.audioManager,onMenu:()=>this.returnToMainMenu()});
    this.audioManager.bindSettings(this.root);
    const battleView=new BattleView(this.root,this.data.characters,this.audioManager);
    this.battleManager = new BattleManager({ gameState:this.state, enemies:this.data.enemies, bosses:this.data.bosses, view:battleView, saveManager:this.saveManager, onStart:(context,enemy)=>this.beginBattle(context,enemy),onExit:(battle,context)=>this.finishBattle(battle,context) });
    this.puzzleManager = new PuzzleManager({puzzles:this.data.puzzles,gameState:this.state,view:new PuzzleView(this.root),saveManager:this.saveManager,onStart:(context,puzzle)=>this.beginPuzzle(context,puzzle),onComplete:(puzzle,context)=>this.completePuzzle(puzzle,context),onExit:(puzzle,context,completed)=>this.finishPuzzle(puzzle,context,completed)});
    this.memoryView=new MemoryInvestigationView(this.root);
    this.memoryManager=new MemoryInvestigationManager({definitions:this.data.memories,gameState:this.state,view:this.memoryView,saveManager:this.saveManager,onStart:(context,memory)=>this.beginMemory(context,memory),onComplete:(memory,context)=>this.completeMemory(memory,context),onExit:(memory,context)=>this.finishMemory(memory,context)});
    this.mapManager = new MapManager({ scenes: this.data.scenes, gameState: this.state, view: new MapView(this.root), saveManager:this.saveManager, onEncounter:(enemyId,context)=>this.startBattleFromMap(enemyId,context),onPuzzle:(id)=>this.startPuzzleFromMap(id),onInteract:(target)=>this.handleMapInteraction(target),onEnter:(scene)=>{this.audioManager.playBGM(scene.bgmId??'DAILY_EXPLORATION');this.guidanceManager.onExploration(scene.id);} });
    this.dialogueManager = new DialogueManager({ data: this.data, view, choiceManager, saveManager: this.saveManager, onStart:(context,dialogue)=>this.beginDialogue(context,dialogue),onComplete: () => this.syncSaveUi(),onFinish:(context,dialogue,choice)=>this.finishDialogue(context,dialogue,choice) });
    this.sceneManager = new SceneManager({ gameState: this.state, dialogueManager: this.dialogueManager });
    this.inputManager = new InputManager({ root: this.root, dialogueManager: this.dialogueManager, getMapManager: () => this.mapManager,onControls:()=>this.guidanceManager.openControls(),onJournal:()=>this.guidanceManager.openJournal(),isModalOpen:()=>this.guidanceManager.modalOpen });
    this.inputManager.start();
    this.root.querySelector('#dialogue-advance')?.addEventListener('click', () => this.dialogueManager.next());
    this.root.querySelector('#dialogue-close')?.addEventListener('click', () => {
      this.dialogueManager.finish();
    });
    this.root.querySelector('#map-controls')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-move]'); if (!button) return;
      const moves = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }; this.inputManager.move(...moves[button.dataset.move]);
    });
    this.root.querySelector('#touch-interact')?.addEventListener('click',()=>this.inputManager.interact());
    this.root.querySelector('#battle-commands')?.addEventListener('click',(event)=>{ const button=event.target.closest('[data-battle-action]'); if(button){battleView.playUiSound('ui_confirm');this.battleManager.act(button.dataset.battleAction);} });
    this.root.querySelector('#battle-commands')?.addEventListener('focusin',(event)=>{if(event.target.closest('button:not(:disabled)'))battleView.playUiSound('ui_cursor');});
    this.root.querySelector('#battle-exit')?.addEventListener('click',()=>{battleView.playUiSound('ui_cancel');this.battleManager.exit();});
    this.root.querySelector('#puzzle-submit')?.addEventListener('click',()=>this.puzzleManager.submit());
    this.root.querySelector('#puzzle-retry')?.addEventListener('click',()=>this.puzzleManager.retry());
    this.root.querySelector('#puzzle-exit')?.addEventListener('click',()=>this.puzzleManager.exit());
    this.root.querySelector('#reflection-submit')?.addEventListener('click',()=>this.reflectionManager.submit());
    this.root.querySelector('#reflection-complete')?.addEventListener('click',()=>this.reflectionManager.exit());
    this.root.querySelector('.guide-menu')?.addEventListener('click',(event)=>{const action=event.target.closest('[data-guide-action]')?.dataset.guideAction;if(action==='controls')this.guidanceManager.openControls();if(action==='journal')this.guidanceManager.openJournal();});
  }

  showDevelopmentError(message) {
    const panel = this.root.querySelector('#development-error');
    const detail = panel?.querySelector('[data-error-message]');
    if (detail) detail.textContent = message;
    if (panel) panel.hidden = false;
  }

  handleMapInteraction(target) {
    if(target.interaction?.kind==='quest'){this.questManager.start(target.questId);if(target.stageId)this.questManager.advance(target.questId,target.stageId);return target.interaction.message??'任務已更新。';}
    if(target.interaction?.kind==='memory'){
      const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
      this.memoryManager.start(target.interaction.memoryId,{kind:'exploration',returnContext});
      return '';
    }
    if(target.interaction?.kind==='environment'){
      const observed=Boolean(this.state.get(`flags.${target.interaction.observedFlag}`));
      const dialogueId=observed?target.interaction.repeatDialogueId:target.interaction.dialogueId;
      const dialogue=this.data.dialogues.find((item)=>item.id===dialogueId);
      if(dialogue){
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
        const noticeBoardCount=(this.mapManager.scene.entities??[]).filter((entity)=>entity.interaction?.noticeBoard).length;
        this.dialogueManager.start(dialogue.id,this.mapManager.scene.displayName,{kind:'environment',environment:true,overlay:true,returnContext,observedFlag:target.interaction.observedFlag,setFlag:target.interaction.setFlag??null,noticeBoardId:target.interaction.noticeBoard?target.id:null,noticeBoardMapId:target.interaction.noticeBoard?this.mapManager.scene.id:null,noticeBoardCount});
      }
      return '';
    }
    if(target.interaction?.kind==='talk'){
      const ready=(target.interaction.requiredFlag&&this.state.get(`flags.${target.interaction.requiredFlag}`))||(target.interaction.requiredAnyFlags??[]).some((flag)=>this.state.get(`flags.${flag}`));
      const albumQuest=this.state.get('quests.ch1_album_path')??{};
      const albumParentPending=target.characterId==='parent'&&!this.state.get('flags.albumParentPostBattleComplete')&&Boolean(this.state.get('flags.albumAwaitingParent')||this.state.get('flags.albumPhase3Complete')||this.state.get('flags.albumBattleComplete')||(this.state.get('defeatedBosses')??[]).includes('album')||(albumQuest.completedStages??[]).includes('complete_album_profile_phase')||albumQuest.stageId==='complete_album_profile_phase');
      const conditional=target.characterId==='parent'?albumParentPending:Boolean((target.interaction.conditionalFlag&&this.state.get(`flags.${target.interaction.conditionalFlag}`))||(target.interaction.conditionalAnyFlags??[]).some((flag)=>this.state.get(`flags.${flag}`)));
      const dialogueId=conditional&&target.interaction.dialogueWhenFlagId?target.interaction.dialogueWhenFlagId:(ready&&target.interaction.dialogueWhenReadyId?target.interaction.dialogueWhenReadyId:target.interaction.dialogueId);
      const dialogue=this.data.dialogues.find((item)=>item.id===dialogueId);
      if(dialogue){
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id,characterId:target.characterId};
        this.dialogueManager.start(dialogue.id,this.mapManager.scene.displayName,{kind:'interaction',overlay:true,returnContext});
        return '';
      }
    }
    if(target.interaction?.kind==='clue'){
      const isNew=this.questManager.discoverClue(target.interaction.clueId);
      return isNew?(target.interaction.successMessage??'發現隱私線索。'):'你已經記錄過這項隱私線索。';
    }
    if(target.interaction?.kind==='side_quest'){this.questManager.start('ch1_album_path');return target.interaction.message??'發現支線入口。';}
    if (target.interaction?.message) return target.interaction.message;
    if (target.interaction?.successMessage) return target.interaction.successMessage;
    const character = this.data.characters[target.characterId];
    return character ? `${character.displayName} 注意到了你。` : '你發現了一個可互動物件。';
  }

  beginDialogue(context={},dialogue=null){
    if(context.returnContext)this.state.set('exploration.returnContext',context.returnContext);
    if(dialogue)this.state.set('activeFlow.dialogue',{id:dialogue.id,context});
    this.state.set('mode',GAME_MODE.DIALOGUE);this.state.set('playerMovementLocked',true);this.saveManager.save();
    if(dialogue?.id==='ch1_gallery_keeper_ready'&&!this.state.get('flags.photoKeeperFinalDialogueComplete'))this.memoryView.playMontage(this.data.memories.map((memory)=>memory.image));
    if(dialogue?.id==='ch1_rin_photo_check')this.guidanceManager.discoverRin();
  }

  finishDialogue(context={},dialogue=null,choice=null){
    const returnContext=context.returnContext??this.state.get('exploration.returnContext');
    const sceneId=returnContext?.sceneId??'home_map';
    const galleryKeeperComplete=dialogue?.id==='ch1_gallery_keeper_ready';
    const galleryKeeperAlreadyComplete=this.state.get('flags.photoKeeperFinalDialogueComplete');
    if(dialogue?.id==='ch1_gallery_keeper_wait')this.state.set('flags.memoryInvestigationUnlocked',true);
    if(dialogue?.id==='ch1_album_phase3_complete')this.state.set('flags.albumAwaitingParent',true);
    if(context.kind==='environment'&&context.observedFlag)this.state.set(`flags.${context.observedFlag}`,true);
    if(context.kind==='environment'&&context.setFlag)this.state.set(`flags.${context.setFlag}`,true);
    const noticeDiscovery=context.noticeBoardId?this.questManager.recordNoticeBoard?.(context.noticeBoardMapId??sceneId,context.noticeBoardId,context.noticeBoardCount??1):null;
    if(galleryKeeperComplete)this.state.set('flags.photoKeeperFinalDialogueComplete',true);
    let questMessage=galleryKeeperComplete&&!galleryKeeperAlreadyComplete?this.questManager.completeGalleryKeeper():(context.kind==='interaction'&&returnContext?.characterId?this.questManager.recordNpcTalk(returnContext.characterId):(context.questMessage??''));
    if(dialogue?.id==='ch1_album_parent_post_battle'){
      this.state.set('flags.albumParentPostBattleComplete',true);
      this.state.set('flags.albumBattleComplete',true);
      this.state.set('flags.albumAwaitingParent',false);
      this.questManager.advance('ch1_album_path','speak_parent_after_album');
    }
    if(choice?.id==='rin_photo_inspection_accept'){this.state.set('sideQuests.rinPhotoInspection.status','ACTIVE');this.state.set('sideQuests.rinPhotoInspection.currentStage','inspect_photos');}
    if(choice?.id==='rin_photo_inspection_later'){this.state.set('sideQuests.rinPhotoInspection.status','AVAILABLE');this.state.set('sideQuests.rinPhotoInspection.currentStage','talk_to_rin');}
    if(dialogue?.id==='ch1_rin_photo_check_result'){
      const alreadyCompleted=Boolean(this.state.get('sideQuests.rinPhotoInspection.completed'));
      this.state.set('sideQuests.rinPhotoInspection.completed',true);this.state.set('sideQuests.rinPhotoInspection.status','COMPLETED');this.state.set('sideQuests.rinPhotoInspection.currentStage','completed');
      if(!alreadyCompleted){
        this.state.set('player.hp',this.state.get('player.maxHp'));
        this.state.set('sideQuests.rinPhotoInspection.hpRecoveryClaimed',true);
        questMessage=[questMessage,'支線任務完成：生命值已完全恢復。'].filter(Boolean).join('\n');
      }
    }
    this.state.set('activeFlow.dialogue',null);
    const next=choice?.next??dialogue?.next;
    if(next?.type==='puzzle'){
      this.puzzleManager.start(next.id,{kind:'dialogue',returnContext,afterDialogueId:next.afterDialogueId,questMessage});
      return;
    }
    if(next?.type==='battle'){
      const battleContext={kind:'dialogue',returnContext,afterDialogueId:next.afterDialogueId,phaseLimit:next.phaseLimit??null,questMessage};
      if(next.isBoss)this.battleManager.startBoss(next.id,battleContext);else this.battleManager.start(next.id,battleContext);
      return;
    }
    if(next?.type==='dialogue'){
      this.dialogueManager.start(next.id,this.data.scenes.find((item)=>item.id===sceneId)?.displayName??'探索場景',{kind:'dialogue_chain',overlay:true,returnContext,questMessage});
      return;
    }
    if(next?.type==='reflection'){
      this.startReflection(next.id);
      return;
    }
    this.mapManager.enter(sceneId,{position:returnContext?.position??null,direction:returnContext?.facing??null});
    this.state.set('exploration.returnContext',null);this.saveManager.save();
    if(dialogue?.id==='ch1_album_phase3_complete')this.mapManager.view.showMessage?.('ALBUM 的屏障已平靜。沿原路回家，去找 PARENT 談談照片與分享的約定。');
    else if(noticeDiscovery?.message)this.mapManager.view.showMessage?.(noticeDiscovery.message);
    else if(questMessage)this.mapManager.view.showMessage?.(questMessage);
    if(noticeDiscovery?.isNew){const sideObjective=this.guidanceManager?.noticeBoardSideObjective(sceneId);if(sideObjective)this.guidanceManager?.queueNotice(`支線任務：${sideObjective}`);}
    this.guidanceManager?.flushNotice();
  }

  startPuzzleFromMap(id){
    const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:id};
    this.puzzleManager.start(id,{kind:'exploration',returnContext});
  }

  beginMemory(context={},memory=null){
    if(context.returnContext)this.state.set('exploration.returnContext',context.returnContext);
    if(memory)this.state.set('activeFlow.memory',{id:memory.id,context});
    this.state.set('mode',GAME_MODE.PUZZLE);this.state.set('playerMovementLocked',true);this.saveManager.save();
  }

  completeMemory(memory){
    this.questManager.recordMemory(memory.legacyMemoryId);
    this.saveManager.save();
  }

  finishMemory(memory,context={}){
    const returnContext=context.returnContext??this.state.get('exploration.returnContext');
    this.state.set('activeFlow.memory',null);
    this.mapManager.enter(returnContext?.sceneId??'memory_gallery',{position:returnContext?.position??null,direction:returnContext?.facing??null});
    this.state.set('exploration.returnContext',null);this.saveManager.save();
    if(this.state.get('flags.allMemoriesComplete'))this.mapManager.view.showMessage?.('三組回憶都已調查，請自行返回 PHOTO KEEPER。');
  }

  beginPuzzle(context={},puzzle=null){
    if(context.returnContext)this.state.set('exploration.returnContext',context.returnContext);
    if(puzzle)this.state.set('activeFlow.puzzle',{id:puzzle.id,context});
    this.state.set('mode',GAME_MODE.PUZZLE);this.state.set('playerMovementLocked',true);this.saveManager.save();
  }

  completePuzzle(puzzle){
    this.state.set(`flags.puzzles.${puzzle.id}Completed`,true);
    if(puzzle.optionalSideQuest){
      this.state.set(`sideQuests.${puzzle.optionalSideQuest}.inspectionComplete`,true);
      this.state.set(`sideQuests.${puzzle.optionalSideQuest}.available`,false);
      this.state.set(`sideQuests.${puzzle.optionalSideQuest}.status`,'ACTIVE');
      this.state.set(`sideQuests.${puzzle.optionalSideQuest}.currentStage`,'return_to_rin');
      this.saveManager.save();
      return;
    }
    for(const clueId of puzzle.privacyClues??[])this.questManager.discoverClue(clueId);
    if(puzzle.questUpdate)this.questManager.advance(puzzle.questUpdate.questId,puzzle.questUpdate.stageId);
    this.questManager.refreshBossUnlock();
    this.saveManager.save();
  }

  finishPuzzle(puzzle,context={},completed=false){
    this.state.set('activeFlow.puzzle',null);
    const returnContext=context.returnContext??this.state.get('exploration.returnContext');
    if(completed&&context.afterDialogueId){
      this.dialogueManager.start(context.afterDialogueId,this.data.scenes.find((item)=>item.id===returnContext?.sceneId)?.displayName??'探索場景',{kind:'puzzle_result',overlay:true,returnContext,questMessage:context.questMessage});
      return;
    }
    this.mapManager.enter(returnContext?.sceneId??'album_town');
    this.state.set('exploration.returnContext',null);this.saveManager.save();
    if(completed)this.mapManager.view.showMessage?.(puzzle?.optionalSideQuest?'RIN 的照片檢查已完成。':'照片檢查完成，任務與隱私線索已更新。');
  }

  startBattleFromMap(enemyId,encounterContext={}){
    if(enemyId==='album'&&this.state.get('flags.albumPhase3Complete')){
      this.mapManager.view.showMessage?.('ALBUM 的三層屏障都已完成。');
      return;
    }
    const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:encounterContext.roamingEnemyId??enemyId,roamingEnemyId:encounterContext.roamingEnemyId??null};
    const context={kind:'exploration',returnContext,enemyId};
    if(enemyId==='album'){
      const dialogueId=this.state.get('flags.albumPhase2Complete')?'ch1_album_phase3_pre_battle':this.state.get('flags.albumPhase1Complete')?'ch1_album_phase2_pre_battle':'ch1_album_pre_battle';
      this.dialogueManager.start(dialogueId,this.mapManager.scene.displayName,{kind:'boss_event',overlay:true,returnContext});
      return;
    }
    this.battleManager.start(enemyId,context);
  }

  beginBattle(context={},enemy=null){
    if(context.returnContext)this.state.set('exploration.returnContext',context.returnContext);
    this.audioManager.playBGM(enemy?.phases?'ALBUM':'BATTLE',{fade:550});
    this.state.set('mode',GAME_MODE.BATTLE);this.state.set('playerMovementLocked',true);this.saveManager.save();
    if(enemy&&!enemy.phases)this.guidanceManager.onBattle(enemy.id);
  }

  finishBattle(battle,context={}){
    const returnContext=context.returnContext??this.state.get('exploration.returnContext');
    if(returnContext?.roamingEnemyId&&battle?.phase==='VICTORY')this.mapManager.roamingEnemies.markDefeated(returnContext.roamingEnemyId);
    if(returnContext?.roamingEnemyId)this.state.set('flags.encounterImmunityUntil',Date.now()+1200);
    if(battle?.phase==='PHASE_COMPLETE'){
      const stageId=battle.phaseLimit==='phase_3_profile'?'complete_album_profile_phase':battle.phaseLimit==='phase_2_exposure'?'complete_album_exposure_phase':'complete_album_memory_phase';
      this.questManager.advance('ch1_album_path',stageId);
      if(battle.phaseLimit==='phase_3_profile')this.state.set('flags.albumAwaitingParent',true);
    }
    if(battle?.isBoss&&battle.phase==='DEFEAT'){
      this.mapManager.enter(returnContext?.sceneId??'album_town');this.state.set('exploration.returnContext',null);this.saveManager.save();this.mapManager.view.showMessage?.('你暫時撤退，相簿房間仍可再次挑戰。');return;
    }
    if(context.afterDialogueId){
      this.dialogueManager.start(context.afterDialogueId,this.data.scenes.find((item)=>item.id===returnContext?.sceneId)?.displayName??'探索場景',{kind:'battle_result',overlay:true,returnContext,questMessage:context.questMessage});
      return;
    }
    this.mapManager.enter(returnContext?.sceneId??'album_town');
    this.state.set('exploration.returnContext',null);this.saveManager.save();
    this.mapManager.view.showMessage?.(battle?.phase==='DEFEAT'?'你暫時撤退，已返回原本位置。':'戰鬥結束，已返回原本位置。');
  }

  startReflection(id){this.audioManager.playBGM('REFLECTION');this.reflectionManager.start(id);}
  beginReflection(definition){this.state.set('activeFlow.reflection',{id:definition.id});this.state.set('mode',GAME_MODE.REFLECTION);this.state.set('playerMovementLocked',true);this.saveManager.save();}
  finishReflection(){this.state.set('activeFlow.reflection',null);this.state.set('exploration.returnContext',null);this.saveManager.save();this.summaryManager.start();}

  returnToMainMenu(){['#dialogue-scene','#map-screen','#battle-screen','#puzzle-screen','#memory-investigation-screen','#reflection-screen','#chapter-summary-screen'].forEach((selector)=>{const node=this.root.querySelector(selector);if(node)node.hidden=true;});this.root.querySelector('#title-screen').hidden=false;this.audioManager.stopBGM({fade:500});this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);this.saveManager.save();this.syncSaveUi();}

  handleAction(action) {
    if (action === 'start') {
      this.state.reset();
      this.guidanceManager.startIntro();
      return '故事介紹已開始。';
    }
    if (action === 'continue') {
      const payload = this.saveManager.load();
      if(payload)this.resumeFromState();
      return payload ? `已讀取存檔：${this.state.get('chapter')}／${this.state.get('sceneId')}` : '找不到存檔。';
    }
    if (action === 'settings') {
      this.root.querySelector('#save-tools')?.toggleAttribute('hidden');
      return '存檔工具已開啟。';
    }
    if (action === 'save') {
      this.saveManager.save(); this.syncSaveUi(); return '進度已儲存。';
    }
    if (action === 'load') {
      const payload=this.saveManager.load();if(payload)this.resumeFromState();return payload?'進度已讀取。':'找不到存檔。';
    }
    if (action === 'reset') {
      this.saveManager.reset(); this.syncSaveUi(); return '存檔已重設。';
    }
    return '';
  }

  startOpeningDialogue(){this.audioManager.playBGM('DAILY_EXPLORATION');const scene=this.data?.scenes.find((item)=>item.id==='home_intro');if(scene)this.sceneManager.enter(scene,{kind:'forced',overlay:false,returnContext:{mode:'EXPLORATION',sceneId:'home_map',position:null,facing:'down',sourceId:scene.id}});}

  resumeFromState(){
    const activeBattle=this.state.get('flags.activeBattle');
    if(activeBattle){this.battleManager.restore(activeBattle);return;}
    const dialogueFlow=this.state.get('activeFlow.dialogue');
    if(dialogueFlow?.id){const sceneName=this.data.scenes.find((item)=>item.id===dialogueFlow.context?.returnContext?.sceneId)?.displayName??'事件場景';this.dialogueManager.start(dialogueFlow.id,sceneName,dialogueFlow.context??{});return;}
    const puzzleFlow=this.state.get('activeFlow.puzzle');
    if(puzzleFlow?.id){this.puzzleManager.start(puzzleFlow.id,puzzleFlow.context??{});return;}
    const memoryFlow=this.state.get('activeFlow.memory');
    if(memoryFlow?.id){this.memoryManager.start(memoryFlow.id,memoryFlow.context??{});return;}
    const reflectionFlow=this.state.get('activeFlow.reflection');
    if(reflectionFlow?.id){this.startReflection(reflectionFlow.id);return;}
    const summaryFlow=this.state.get('activeFlow.summary');
    if(summaryFlow){this.summaryManager.start({index:summaryFlow.index??0});return;}
    if(this.state.get('flags.ch1Complete')){this.summaryManager.start({final:true});return;}
    if(this.state.get('flags.albumReflectionComplete')){this.summaryManager.start();return;}
    const albumQuest=this.state.get('quests.ch1_album_path')??{};
    const albumResolved=(this.state.get('defeatedBosses')??[]).includes('album');
    const albumParentPending=!this.state.get('flags.albumParentPostBattleComplete')&&Boolean(this.state.get('flags.albumAwaitingParent')||this.state.get('flags.albumPhase3Complete')||this.state.get('flags.albumBattleComplete')||albumResolved||(albumQuest.completedStages??[]).includes('complete_album_profile_phase')||albumQuest.stageId==='complete_album_profile_phase');
    if(albumParentPending)this.state.set('flags.albumAwaitingParent',true);
    if(albumResolved&&!albumParentPending&&!this.state.get('flags.albumReflectionComplete')){this.startReflection('album_reflection');return;}
    const sceneId=this.state.get('sceneId');
    const scene=this.data.scenes.find((item)=>item.id===sceneId);
    if(scene?.type==='map'){this.mapManager.enter(scene.id);return;}
    if(scene?.dialogueId){this.sceneManager.enter(scene,{kind:'forced',overlay:false,returnContext:{mode:'EXPLORATION',sceneId:'home_map',position:null,facing:'down',sourceId:scene.id}});return;}
    this.mapManager.enter('home_map');
  }

  syncSaveUi() {
    const hasSave = this.saveManager.hasSave();
    const continueButton = this.root.querySelector('[data-action="continue"]');
    if (continueButton) continueButton.disabled = !hasSave;
    const tools = this.root.querySelectorAll('[data-requires-save]');
    tools.forEach((button) => { button.disabled = !hasSave; });
  }
}
