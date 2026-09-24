import { GameState } from './GameState.js?v=ch1summary1';
import { GAME_MODE } from './GameMode.js';
import { canCharacterSeePost } from '../echo/EchoVisibility.js?v=task06';
import { evaluateGroupPhotoConflict } from '../echo/EchoConsent.js?v=task07';
import { DATA_MANIFEST, DataLoader } from './DataLoader.js?v=bossreturn2';
import { SaveManager } from '../managers/SaveManager.js?v=24p10';
import { ChoiceManager } from '../managers/ChoiceManager.js?v=rinphoto1';
import { DialogueManager } from '../managers/DialogueManager.js?v=rinphoto1';
import { InputManager } from '../managers/InputManager.js?v=regressionfix1';
import { SceneManager } from '../managers/SceneManager.js?v=24p5';
import { DialogueView } from '../views/DialogueView.js?v=ch2photospot1';
import { MapManager } from '../managers/MapManager.js?v=task10a';
import { MapView } from '../views/MapView.js?v=ch2act1world1';
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
import { EchoManager } from '../managers/EchoManager.js?v=ch2echo1';
import { EchoView } from '../views/EchoView.js?v=ch2echosocial1';
import { PhoneManager } from '../managers/PhoneManager.js?v=ch2phone1';
import { PhoneView } from '../views/PhoneView.js?v=ch2phone1';
import { buildCh2FinalSnapshot } from '../final/Ch2FinalSnapshot.js?v=task10c';
import { fragmentEntity, resolveCh2InformationFragments } from '../final/Ch2InformationFragments.js?v=task10c1';
import { buildNullFirstDialogue } from '../final/Ch2NullEncounter.js?v=task10dr';
import { NullBossManager } from '../managers/NullBossManager.js?v=task10master';
import { buildNullBossSemanticPlan } from '../final/NullBossSemantics.js?v=task10e2b';

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
    const view = new DialogueView(this.root);this.dialogueView=view;
    const choiceManager = new ChoiceManager(this.state);
    this.questManager=new QuestManager({definitions:this.data.quests,gameState:this.state,saveManager:this.saveManager});
    this.reflectionManager=new ReflectionManager({definitions:this.data.reflections,gameState:this.state,view:new ReflectionView(this.root),saveManager:this.saveManager,onStart:(definition)=>this.beginReflection(definition),onExit:()=>this.finishReflection()});
    this.summaryManager=new ChapterSummaryManager({gameState:this.state,saveManager:this.saveManager,view:new ChapterSummaryView(this.root),audioManager:this.audioManager,onMenu:()=>this.beginCh2Opening()});
    this.audioManager.bindSettings(this.root);
    this.echoManager=new EchoManager({gameState:this.state,saveManager:this.saveManager,view:new EchoView(this.root),onOpen:()=>{this.state.set('mode',GAME_MODE.ECHO);this.state.set('playerMovementLocked',true);this.root.dataset.gameMode='echo';},onCommit:(record,session)=>this.handleEchoCommit(record,session),onClose:()=>{if(this.state.get('flags.bonusSecondRewardPending')){this.openSecondRewardSelection();return;}if(this.state.get('flags.ch2Photo01PostDialoguePending')){this.openPhoto01PostDialogue();return;}if(this.state.get('flags.ch2Photo02PostDialoguePending')){this.openPhoto02PostDialogue();return;}if(this.state.get('flags.ch2GroupPhotoReactionPending')){this.openGroupPhotoReaction();return;}if(this.state.get('flags.ch2GroupPhotoRepairResultPending')){this.openGroupPhotoRepairResult();return;}const sceneId=this.state.get('sceneId');if(this.data.scenes.find((scene)=>scene.id===sceneId)?.type==='map')this.mapManager.enter(sceneId);}});
    this.phoneManager=new PhoneManager({gameState:this.state,saveManager:this.saveManager,view:new PhoneView(this.root),onOpen:()=>{this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);this.root.dataset.gameMode='phone';},onComplete:()=>this.completeOpeningPing(),onClose:()=>this.closeOpeningPhone(),onEchoReaction:()=>this.openCh2EchoReaction()});
    const battleView=new BattleView(this.root,this.data.characters,this.audioManager);
    this.battleManager = new BattleManager({ gameState:this.state, enemies:this.data.enemies, bosses:this.data.bosses, view:battleView, saveManager:this.saveManager, onStart:(context,enemy)=>this.beginBattle(context,enemy),onExit:(battle,context)=>this.finishBattle(battle,context) });
    this.puzzleManager = new PuzzleManager({puzzles:this.data.puzzles,gameState:this.state,view:new PuzzleView(this.root),saveManager:this.saveManager,onStart:(context,puzzle)=>this.beginPuzzle(context,puzzle),onComplete:(puzzle,context)=>this.completePuzzle(puzzle,context),onExit:(puzzle,context,completed)=>this.finishPuzzle(puzzle,context,completed)});
    this.memoryView=new MemoryInvestigationView(this.root);
    this.memoryManager=new MemoryInvestigationManager({definitions:this.data.memories,gameState:this.state,view:this.memoryView,saveManager:this.saveManager,onStart:(context,memory)=>this.beginMemory(context,memory),onComplete:(memory,context)=>this.completeMemory(memory,context),onExit:(memory,context)=>this.finishMemory(memory,context)});
    this.mapManager = new MapManager({ scenes: this.data.scenes, gameState: this.state, view: new MapView(this.root,this.state), saveManager:this.saveManager, onEncounter:(enemyId,context)=>this.startBattleFromMap(enemyId,context),onPuzzle:(id)=>this.startPuzzleFromMap(id),onInteract:(target)=>this.handleMapInteraction(target),onExit:(target,scene)=>this.handleMapExit(target,scene),onEnter:(scene)=>this.handleMapEnter(scene),onMove:()=>{this.recordCh2PostPhotoExplorationStep();this.recordCh2Act3ExplorationStep();},onNpcApproach:(entity,config)=>this.startMaleNpcApproachDialogue(entity,config) });
    this.dialogueManager = new DialogueManager({ data: this.data, view, choiceManager, saveManager: this.saveManager, onStart:(context,dialogue)=>this.beginDialogue(context,dialogue),onComplete: () => this.syncSaveUi(),onFinish:(context,dialogue,choice)=>this.finishDialogue(context,dialogue,choice) });
    this.sceneManager = new SceneManager({ gameState: this.state, dialogueManager: this.dialogueManager });
    this.inputManager = new InputManager({ root: this.root, dialogueManager: this.dialogueManager, getMapManager: () => this.mapManager,onControls:()=>this.guidanceManager.openControls(),onJournal:()=>this.guidanceManager.openJournal(),isModalOpen:()=>this.guidanceManager.modalOpen });
    this.inputManager.start();
    this.root.querySelector('#dialogue-advance')?.addEventListener('click', () => this.dialogueManager.next());
    this.root.querySelector('#dialogue-close')?.addEventListener('click', () => {
      this.dialogueManager.finish();
    });
    this.root.querySelector('#battle-commands')?.addEventListener('click',(event)=>{ const button=event.target.closest('[data-battle-action]'); if(button){battleView.playUiSound('ui_confirm');this.battleManager.act(button.dataset.battleAction);} });
    this.root.querySelector('#battle-commands')?.addEventListener('focusin',(event)=>{if(event.target.closest('button:not(:disabled)'))battleView.playUiSound('ui_cursor');});
    this.root.querySelector('#battle-exit')?.addEventListener('click',()=>{battleView.playUiSound('ui_cancel');this.battleManager.exit();});
    this.root.querySelector('#puzzle-submit')?.addEventListener('click',()=>this.puzzleManager.submit());
    this.root.querySelector('#puzzle-retry')?.addEventListener('click',()=>this.puzzleManager.retry());
    this.root.querySelector('#puzzle-exit')?.addEventListener('click',()=>this.puzzleManager.exit());
    this.root.querySelector('#reflection-submit')?.addEventListener('click',()=>this.reflectionManager.submit());
    this.root.querySelector('#reflection-complete')?.addEventListener('click',()=>this.reflectionManager.exit());
    this.root.querySelector('#ch2-complete-menu')?.addEventListener('click',()=>this.returnToMainMenu());
    this.root.querySelector('#survey-form')?.addEventListener('submit',(event)=>{event.preventDefault();this.submitSurveyForm();});
    this.root.querySelector('#survey-skip')?.addEventListener('click',()=>this.submitSurveyForm({skip:true}));
    this.root.querySelector('#survey-cancel')?.addEventListener('click',()=>this.closeSurveyForm({cancelled:true}));
    this.root.querySelector('#environment-closeup-actions')?.addEventListener('click',(event)=>{const action=event.target.closest('[data-closeup-action]')?.dataset.closeupAction;if(action)this.handleCloseupAction(action);});
    this.root.querySelector('.guide-menu')?.addEventListener('click',(event)=>{const action=event.target.closest('[data-guide-action]')?.dataset.guideAction;if(action==='controls')this.guidanceManager.openControls();if(action==='journal')this.guidanceManager.openJournal();});
  }

  showDevelopmentError(message) {
    const panel = this.root.querySelector('#development-error');
    const detail = panel?.querySelector('[data-error-message]');
    if (detail) detail.textContent = message;
    if (panel) panel.hidden = false;
  }

  handleMapInteraction(target) {
      if(target.interaction?.kind==='ch2_final_fragment'){
        const model=this.ch2FinalFragmentModel??this.prepareCh2FinalInformationWorld();const fragment=model?.fragments.find((item)=>item.id===target.interaction.fragmentId);if(!fragment)return '';
        const viewed=new Set(this.state.get('flags.ch2FinalViewedFragmentIds')??[]),wasReady=Boolean(this.state.get('flags.ch2FinalNorthConvergenceReady'));viewed.add(fragment.id);this.state.set('flags.ch2FinalViewedFragmentIds',[...viewed]);const ready=model.requiredIds.every((id)=>viewed.has(id));this.state.set('flags.ch2FinalNorthConvergenceReady',ready);this.syncCh2FinalGuidance();if(ready&&!wasReady)this.guidanceManager?.queueNotice('前方似乎有什麼變化。');this.saveManager.save();
        const dialogueId=`ch2_fragment_${fragment.id.replaceAll('.','_')}`;if(!this.data.dialogues.some((item)=>item.id===dialogueId))this.data.dialogues.push({id:dialogueId,label:`資訊碎片 · ${fragment.title}`,participants:[{characterId:'player',position:'right',expression:'neutral'}],lines:[{speakerId:'player',expression:'neutral',text:fragment.text}],endText:'返回資料世界。'});
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};this.dialogueManager.start(dialogueId,this.mapManager.scene.displayName,{kind:'ch2_final_fragment',overlay:true,returnContext});return '';
      }
      if(target.interaction?.kind==='ch2_final_convergence'){this.startCh2NullEncounter();return '';}
      if(target.interaction?.kind==='ch2_null_talk'){return this.startNullBossFoundation()?'':'面前的身影安靜地留在資料之中。';}
    if(target.interaction?.kind==='ch2_story'){
      const eventId=target.interaction.eventId;
      if(eventId==='ch2_act2_photo_post'&&this.state.get('flags.ch2Act2PostCompleted'))return '這張活動照片已經分享過了。';
      if(eventId==='ch2_act3_group_photo'&&this.state.get('flags.ch2GroupPhotoPostCompleted'))return '團體照已經處理完成。';
      const dialogueId=eventId==='ch2_act2_photo_post'?'ch2_act2_activity_arrival':eventId==='ch2_consent_foreshadow'?'ch2_consent_foreshadow':eventId==='ch2_act3_group_photo'?'ch2_act3_group_photo_staging':'';
      if(dialogueId){
        if(eventId==='ch2_act2_photo_post')this.questManager.advance('ch2_explore_event','act2_photo');
        if(eventId==='ch2_act3_group_photo')this.state.set('flags.ch2GroupPhotoStarted',true);
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
        this.dialogueManager.start(dialogueId,this.mapManager.scene.displayName,{kind:'ch2_story',overlay:true,returnContext});
      }
      return '';
    }
    if(target.interaction?.kind==='ch2_optional'){
      let dialogueId='';
      if(target.interaction.eventId==='game_reward_survey'){
        this.state.set('flags.surveyDiscovered',true);
        this.recordCh2PostPhotoWorldAction('reward-booth');
        this.openRewardBooth();this.saveManager.save();return '';
      }
      if(target.interaction.eventId==='looking_for_mio'){
        dialogueId=this.state.get('flags.mioFollowerEncountered')?'ch2_optional_follower_done':'ch2_optional_follower_current_now';
      }
      if(dialogueId){
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id,characterId:target.characterId};
        this.dialogueManager.start(dialogueId,this.mapManager.scene.displayName,{kind:'ch2_optional',overlay:true,returnContext});
      }
      this.saveManager.save();return '';
    }
    if(target.interaction?.kind==='ch2_landmark'){
      if(target.interaction.flag)this.state.set(`flags.${target.interaction.flag}`,true);
      if(target.id==='ch2_event_board'){
        this.state.set('flags.ch2PendingWorldActionSource',`landmark:${target.id}`);
        this.openEventBoard();this.saveManager.save();return '';
      }
      const reactionMessage=this.recordCh2PostPhotoWorldAction(`landmark:${target.id}`);
      const dialogue=this.data.dialogues.find((item)=>item.id===target.interaction.dialogueId);
      if(dialogue){
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
        this.dialogueManager.start(dialogue.id,this.mapManager.scene.displayName,{kind:'ch2_landmark',environment:true,overlay:true,returnContext,questMessage:reactionMessage});
      }
      this.saveManager.save();
      return dialogue?'':(target.interaction.message??'已記下這個會場地標。');
    }
    if(target.interaction?.kind==='ch2_photo_spot_entry'){
      if(!this.state.get('flags.ch2Act1MioMet'))return '先去找 MIO 聊聊。';
      this.mapManager.view.transition(()=>this.mapManager.enter('ch2_photo_spot',{resetToSpawn:true}));
      return '';
    }
    if(target.interaction?.kind==='ch2_photo_capture'){
      if(this.state.get('flags.ch2Act1EchoDecided'))return '照片已經拍好了。';
      const returnContext={mode:'EXPLORATION',sceneId:'ch2_photo_spot',position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id,characterId:'mio'};
      this.dialogueManager.start('ch2_photo_spot_mio_request','拍照區',{kind:'ch2_photo_capture',overlay:true,returnContext});
      return '';
    }
    if(target.interaction?.kind==='echo'&&target.interaction.eventId==='ch2_act1_mio_story'){
      if(this.state.get('flags.ch2Act1EchoDecided'))return '這張限時內容已經處理過了。';
      this.questManager.advance('ch2_explore_event','share_echo_story');
      this.openPhoto01Echo();
      return '';
    }
    if(target.interaction?.kind==='act_event'&&target.interaction.eventId==='ch2_act1_fast_consequence')return '';
    if(target.interaction?.kind==='act_event'&&target.interaction.eventId==='ch2_survey_delayed_consequence'){
      if(this.state.get('flags.surveyThirdPartyContact'))return '';
      const shared=this.state.get('flags.surveyDataShared')??[];
      const basis=shared.includes('school')?'school':shared.includes('email')?'email':shared.includes('phone')?'phone':shared.includes('gameId')||shared.includes('account')?'account':'generic';
      const dialogueId=`ch2_optional_survey_contact_${basis}`;
      this.state.set('flags.surveyThirdPartyContact',{received:true,basedOn:basis});
      const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
      this.dialogueManager.start(dialogueId,this.mapManager.scene.displayName,{kind:'ch2_optional_consequence',overlay:true,returnContext});
      return '';
    }
    if(target.interaction?.kind==='act_event'&&target.interaction.eventId==='ch2_act2_consequence'){
      if(this.state.get('flags.ch2Act2ConsequenceSeen'))return '';
      const audience=this.state.get('flags.act2Audience')??'private';
      this.state.set('flags.ch2Act2ConsequenceSeen',true);
      this.questManager.advance('ch2_explore_event','act2_consequence');
      const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
      this.dialogueManager.start(`ch2_act2_consequence_${audience}`,this.mapManager.scene.displayName,{kind:'ch2_act2_consequence',overlay:true,returnContext});
      return '';
    }
    if(target.interaction?.kind==='act_event'&&target.interaction.eventId==='ch2_act3_consequence'){
      if(this.state.get('flags.ch2Act3ConsequenceSeen'))return '';
      const conflict=Boolean(this.state.get('flags.consentConflict'));
      this.state.set('flags.ch2Act3ConsequenceSeen',true);
      this.questManager.advance('ch2_explore_event','act3_repair');
      const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id};
      const conflictId=this.state.get('flags.consentAsked')?'ch2_act3_consent_conflict_public':'ch2_act3_consent_conflict_no_ask';
      this.dialogueManager.start(conflict?conflictId:'ch2_act3_no_conflict',this.mapManager.scene.displayName,{kind:'ch2_act3_consequence',overlay:true,returnContext});
      return '';
    }
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
      if(target.characterId==='photo_keeper'&&this.state.get('flags.ch2NullProfileCollapsed')&&!this.state.get('flags.ch2PostBossReflectionComplete')){
        this.ensureCh2FinalDialogues();
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id,characterId:'photo_keeper'};
        this.dialogueManager.start('ch2_post_boss_photo_keeper','資料世界',{kind:'ch2_post_boss_reflection',overlay:true,returnContext});
        return '';
      }
      const readyAll=(target.interaction.dialogueWhenAllFlags??[]).length>0&&(target.interaction.dialogueWhenAllFlags??[]).every((flag)=>this.state.get(`flags.${flag}`));
      const ready=readyAll||(target.interaction.requiredFlag&&this.state.get(`flags.${target.interaction.requiredFlag}`))||(target.interaction.requiredAnyFlags??[]).some((flag)=>this.state.get(`flags.${flag}`));
      const albumQuest=this.state.get('quests.ch1_album_path')??{};
      const albumParentPending=target.characterId==='parent'&&!this.state.get('flags.albumParentPostBattleComplete')&&Boolean(this.state.get('flags.albumAwaitingParent')||this.state.get('flags.albumPhase3Complete')||this.state.get('flags.albumBattleComplete')||(this.state.get('defeatedBosses')??[]).includes('album')||(albumQuest.completedStages??[]).includes('complete_album_profile_phase')||albumQuest.stageId==='complete_album_profile_phase');
      const mioReportPending=target.characterId==='mio'&&Boolean(this.state.get('flags.mioConsequenceReportPending'));
      const mioLowerPending=target.characterId==='mio'&&Boolean(this.state.get('flags.ch2LowerConsequencePending'));
      const conditional=target.characterId==='parent'?albumParentPending:Boolean((target.interaction.conditionalFlag&&this.state.get(`flags.${target.interaction.conditionalFlag}`))||(target.interaction.conditionalAnyFlags??[]).some((flag)=>this.state.get(`flags.${flag}`)));
      const ambientRepeated=target.interaction.ambientTalkedFlag&&this.state.get(`flags.${target.interaction.ambientTalkedFlag}`);
      const ambientDialogueId=ambientRepeated&&target.interaction.ambientRepeatDialogueId?target.interaction.ambientRepeatDialogueId:target.interaction.dialogueId;
      const lowerDialogueId=this.state.get('flags.act1Timing')==='later'?'ch2_act1_lower_mio_draft':'ch2_act1_lower_mio';
      const ch2ParentReady=target.characterId==='parent'&&Boolean(this.state.get('flags.ch2PingCompleted')&&this.state.get('flags.ch2TravelToEventAvailable'));
      const ch2ParentDialogueId=this.state.get('flags.ch2HomeParentEventTalked')?'ch2_home_parent_event_repeat':'ch2_home_parent_event_first';
      const dialogueId=ch2ParentReady?ch2ParentDialogueId:(mioReportPending?'ch2_report_to_mio':(mioLowerPending?lowerDialogueId:(conditional&&target.interaction.dialogueWhenFlagId?target.interaction.dialogueWhenFlagId:(ready&&target.interaction.dialogueWhenReadyId?target.interaction.dialogueWhenReadyId:ambientDialogueId))));
      const dialogue=this.data.dialogues.find((item)=>item.id===dialogueId);
      if(dialogue){
        const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:target.id,characterId:target.characterId};
        this.dialogueManager.start(dialogue.id,this.mapManager.scene.displayName,{kind:'interaction',overlay:true,returnContext,ambientTalkedFlag:ready?null:(target.interaction.ambientTalkedFlag??null)});
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
    this.state.set('mode',GAME_MODE.DIALOGUE);if(this.root?.dataset)this.root.dataset.gameMode='dialogue';this.state.set('playerMovementLocked',true);this.saveManager.save();
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
    if(context.kind==='interaction'&&context.ambientTalkedFlag)this.state.set(`flags.${context.ambientTalkedFlag}`,true);
    if(dialogue?.id==='ch2_final_photo_keeper_intro')this.state.set('flags.ch2FinalPhotoKeeperIntroComplete',true);
    if(context.kind==='ch2_null_encounter'){
      this.state.set('flags.ch2NullDialogueComplete',true);
      this.state.set('flags.ch2BossStageReady',true);
      this.mapManager.view.finishNullFormation();
      this.prepareCh2FinalInformationWorld();
    }
    if(context.kind==='ch2_profile_collapse'){
      this.state.set('flags.ch2ProfileCollapseDialogueComplete',true);
      this.state.set('flags.ch2PostBossReflectionPending',true);
      this.syncCh2FinalGuidance();
      this.state.set('activeFlow.dialogue',null);
      this.mapManager.enter(sceneId,{position:returnContext?.position??null,direction:returnContext?.facing??null});
      this.state.set('exploration.returnContext',null);this.saveManager.save();
      return;
    }
    if(context.kind==='ch2_post_boss_reflection'){
      this.state.set('flags.ch2PostBossReflectionComplete',true);
      this.state.set('flags.ch2PostBossReflectionPending',false);
      this.state.set('flags.ch2ReflectionStarted',true);
      this.state.set('activeFlow.dialogue',null);this.saveManager.save();
      this.startReflection('ch2_data_profile_reflection');
      return;
    }
    if(context.kind==='ch2_ending'){
      this.state.set('flags.ch2EndingStarted',false);
      this.state.set('flags.ch2Complete',true);
      this.state.set('chapter','CH2_COMPLETE');
      this.state.set('activeFlow.dialogue',null);this.state.set('exploration.returnContext',null);
      this.saveManager.save();this.showCh2Complete();return;
    }
    const noticeDiscovery=context.noticeBoardId?this.questManager.recordNoticeBoard?.(context.noticeBoardMapId??sceneId,context.noticeBoardId,context.noticeBoardCount??1):null;
    if(galleryKeeperComplete)this.state.set('flags.photoKeeperFinalDialogueComplete',true);
    const ch2Act1Dialogue=dialogue?.id?.startsWith('ch2_act1_');
    let questMessage=galleryKeeperComplete&&!galleryKeeperAlreadyComplete?this.questManager.completeGalleryKeeper():(context.kind==='interaction'&&returnContext?.characterId&&!ch2Act1Dialogue?this.questManager.recordNpcTalk(returnContext.characterId):(context.questMessage??''));
    if(dialogue?.id==='ch2_act1_mio_photo_plan'){
      this.state.set('flags.ch2Act1MioMet',true);
      this.questManager.advance('ch2_explore_event','meet_mio');
      this.questManager.advance('ch2_explore_event','go_photo_spot');
      this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);
      this.mapManager.refreshInteraction?.();
      questMessage='主線任務已更新：和 MIO 去拍照區看看。';
    }
    if(dialogue?.id==='ch2_photo_spot_mio_request'){
      this.dialogueManager.start('ch2_photo_spot_photo_event','拍照區',{kind:'ch2_photo_capture_event',environment:true,overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_photo_spot_photo_event'){
      this.state.set('flags.ch2PhotoCaptured',true);
      this.audioManager.playSFX('photo_snap',{volume:.8});
      this.dialogueView?.playPhotoFlash();
      this.dialogueManager.start('ch2_photo_spot_photo_preview','拍照預覽',{kind:'ch2_photo_preview',environment:true,overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_photo_spot_photo_preview'){
      this.questManager.advance('ch2_explore_event','share_echo_story');
      this.openPhoto01Echo();
      return;
    }
    if(dialogue?.id==='ch2_photo01_post_dialogue'){
      this.state.set('flags.ch2Photo01PostDialoguePending',false);
      this.state.set('flags.ch2Photo01PostDialogueComplete',true);
      this.questManager.advance('ch2_explore_event','post_photo_explore');
      questMessage='主線任務已更新：繼續逛逛活動會場。';
    }
    if(dialogue?.id==='ch2_act2_bridge'){
      this.state.set('flags.ch2Act2BridgePending',false);
      this.state.set('flags.ch2Act2AnnouncementSeen',true);
      this.state.set('flags.ch2Act2BridgeComplete',true);
      this.questManager.advance('ch2_explore_event','act2_activity_area');
      this.prepareAct2CharacterMovement();
      questMessage='主線任務已更新：前往活動區。';
    }
    if(dialogue?.id==='ch2_act2_activity_arrival'){
      this.state.set('flags.ch2Act2ActivityReached',true);
      this.audioManager.playSFX('photo_snap',{volume:.8});
      this.dialogueView?.playPhotoFlash();
      this.dialogueManager.start('ch2_act2_photo_preview','活動區',{kind:'ch2_photo02_preview',environment:true,overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_act2_photo_preview'){
      this.openAct2Echo();
      return;
    }
    if(dialogue?.id==='ch2_act2_post_photo'){
      this.state.set('flags.ch2Photo02PostDialoguePending',false);
      this.state.set('flags.ch2Photo02PostDialogueComplete',true);
      this.state.set('flags.ch2Act2ConsequenceSeen',true);
      const route=this.photo02RinDialogueId();
      this.state.set('flags.ch2Photo02RinRoute',route);
      this.dialogueManager.start(route,'活動區',{kind:'ch2_photo02_rin_reaction',overlay:true,returnContext});
      return;
    }
    if(['ch2_act2_rin_public','ch2_act2_rin_friends','ch2_act2_rin_selected_visible','ch2_act2_rin_selected_hidden','ch2_act2_rin_private'].includes(dialogue?.id)){
      this.state.set('flags.ch2Photo02BackgroundObserved',true);
      this.dialogueManager.start('ch2_act2_rin_reflection','活動區',{kind:'ch2_photo02_reflection',overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_act2_rin_reflection'){
      this.state.set('flags.ch2Act2ReflectionComplete',true);
      this.state.set('flags.ch2Act2Complete',true);
      this.state.set('flags.ch2Act3ExplorationActive',true);
      this.state.set('flags.ch2Act3ExplorationSteps',0);
      this.questManager.advance('ch2_explore_event','act2_reflection_complete');
      questMessage='主線任務已更新：繼續逛逛活動。';
    }
    if(dialogue?.id==='ch2_act3_announcement'){
      this.state.set('flags.ch2Act3AnnouncementReady',false);
      this.state.set('flags.ch2Act3AnnouncementComplete',true);
      this.state.set('flags.ch2Act3ExplorationActive',false);
      this.questManager.advance('ch2_explore_event','group_photo');
      this.prepareAct3CharacterMovement();
      this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);
      this.mapManager.refreshInteraction?.();
      questMessage='主線任務已更新：和大家去拍合照。';
    }
    if(dialogue?.id==='ch2_act3_group_photo_staging'){
      this.state.set('flags.ch2GroupPhotoCompleted',true);
      this.audioManager.playSFX('photo_snap',{volume:.8});
      this.dialogueView?.playPhotoFlash();
      this.dialogueManager.start('ch2_act3_group_photo_preview','合照預覽',{kind:'ch2_group_photo_preview',environment:true,overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_act3_group_photo_preview'){
      this.state.set('flags.ch2GroupPhotoDecisionPending',true);
      this.dialogueManager.start('ch2_act3_group_photo_choice','團體拍照區',{kind:'ch2_group_photo_decision',overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_act3_group_photo_choice'&&choice?.id){
      const asked=choice.id==='ch2_consent_ask_first';
      this.state.set('flags.ch2GroupPhotoDecisionPending',false);
      this.state.set('flags.consentAsked',asked);
      this.state.set('flags.groupPhotoConsentDecision',asked?'ask_first':'direct_echo');
      this.state.set('flags.rinSharePreference',asked?'not_public':null);
      this.questManager.advance('ch2_explore_event','act3_share');
      this.state.set('activeFlow.dialogue',null);
      if(asked)this.dialogueManager.start('ch2_act3_consent_preferences','拍照區',{kind:'ch2_group_photo_consent',overlay:true,returnContext});
      else this.openAct3Echo();
      return;
    }
    if(dialogue?.id==='ch2_act3_consent_preferences'){
      this.state.set('flags.rinSharePreference','not_public');
      this.state.set('flags.mioShareConsent','okay_to_share');
      this.state.set('flags.rinShareConsent','okay_if_not_public');
    }
    // Deprecated meeting-point KAI dialogue is retained for old saves, but no longer advances ACT 1.
    if(dialogue?.id==='ch2_consent_foreshadow'){
      this.state.set('flags.ch2ConsentForeshadowSeen',true);
    }
    if(dialogue?.id==='ch2_optional_survey_complete'&&!this.state.get('flags.surveyRewardReceived')){
      const fields=['name','email','phone','birthday','school','account'];
      const shared=fields.filter((field)=>this.state.get(`flags.surveyShare${field[0].toUpperCase()}${field.slice(1)}`));
      this.state.set('flags.surveyCompleted',true);
      this.state.set('flags.surveyDataShared',shared);
      this.state.set('flags.surveyOptionalFieldsSkipped',fields.some((field)=>!shared.includes(field)));
      this.state.set('flags.surveyRewardReceived',true);
      const reward=this.state.get('flags.surveyRewardType');
      if(reward==='coins')this.state.update('currency.gameCoins',(value=0)=>value+100);
      else if(reward){const rewardId=reward==='equipment'?'ch2_rare_equipment':'ch2_limited_skin';this.state.update('inventory',(items=[])=>items.includes(rewardId)?items:[...items,rewardId]);}
      questMessage='可選事件完成：限定遊戲獎勵已領取。';
    }
    if(dialogue?.id==='ch2_looking_for_mio_after_response'){
      this.state.set('flags.mioFollowerEncountered',true);
      this.state.set('flags.mioConsequenceReportPending',true);
      this.state.set('flags.mioFollowerConsequenceComplete',false);
      this.state.set('flags.ch2LookingForMioEligible',false);
      this.questManager.advance('ch2_explore_event','report_mio_consequence');
      this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);
      this.mapManager.refreshInteraction?.();
      questMessage='主線任務已更新：回去告訴 MIO 剛才發生的事。';
    }
    if(dialogue?.id==='ch2_male_recognition_approach'){
      this.state.set('flags.mioFollowerEncountered',true);
      this.state.set('flags.mioConsequenceReportPending',true);
      this.state.set('flags.mioFollowerConsequenceComplete',false);
      this.state.set('flags.ch2LookingForMioEligible',false);
      this.state.set('flags.ch2MaleNpcApproachDialogueStarted',false);
      this.questManager.advance('ch2_explore_event','report_mio_consequence');
      this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);
      this.mapManager.refreshInteraction?.();
      questMessage='主線任務已更新：回去找 MIO。';
    }
    if(dialogue?.id==='ch2_report_to_mio'){
      this.state.set('flags.mioConsequenceReportPending',false);
      this.state.set('flags.mioConsequenceReported',true);
      this.state.set('flags.mioFollowerConsequenceComplete',true);
      this.completeCh2Act1Consequence('high');
      questMessage='你和 MIO 談過照片帶來的現實反應。';
    }
    if(['ch2_act1_lower_mio','ch2_act1_lower_mio_draft'].includes(dialogue?.id)){
      this.state.set('flags.ch2LowerConsequencePending',false);
      this.state.set('flags.mioFollowerConsequenceComplete',true);
      this.completeCh2Act1Consequence('lower');
      questMessage='你和 MIO 回顧了照片分享後的反應。';
    }
    if(['ch2_act1_consequence_current_now','ch2_act1_consequence_general_now','ch2_act1_consequence_none_now','ch2_act1_consequence_later'].includes(dialogue?.id)){
      this.state.set('flags.ch2EchoReactionSeen',true);
      this.state.set('flags.ch2EchoReactionAvailable',false);
      this.phoneManager.hide();
      if(this.isCh2HighConsequence()){
        this.state.set('flags.ch2ConsequenceRoute','high');
        this.positionLookingForMioAtSafeEntrance();
        this.state.set('flags.ch2LookingForMioEligible',true);
        this.questManager.advance('ch2_explore_event','observe_consequence');
        questMessage='繼續逛逛會場，留意照片分享後出現的變化。';
      }else{
        this.state.set('flags.ch2ConsequenceRoute','lower');
        this.state.set('flags.ch2LowerConsequencePending',true);
        this.questManager.advance('ch2_explore_event','talk_mio_after_echo');
        questMessage='主線任務已更新：回去和 MIO 聊聊剛才的 ECHO 反應。';
      }
      this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);
      this.mapManager.refreshInteraction?.();
    }
    if(dialogue?.id==='ch2_kai_reward_booth'){
      this.state.set('flags.ch2KaiRewardBoothMentioned',true);
      const reactionMessage=this.recordCh2PostPhotoWorldAction('kai-greeting');
      questMessage=reactionMessage||'KAI 提到旁邊有一個可以自由參加的遊戲獎勵活動。';
    }
    if(dialogue?.id==='ch2_optional_mio_exact_consequence'){
      this.state.set('flags.ch2MioExactConsequencePending',false);
      this.state.set('flags.mioFollowerConsequenceComplete',true);
    }
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
    if(this.state.get('flags.ch2Act2BridgePending')&&['ch2_report_to_mio','ch2_act1_lower_mio','ch2_act1_lower_mio_draft'].includes(dialogue?.id)){
      this.dialogueManager.start('ch2_act2_bridge','社區活動會場',{kind:'ch2_act2_bridge',overlay:true,returnContext});
      return;
    }
    if(dialogue?.id==='ch2_home_parent_event_first')this.state.set('flags.ch2HomeParentEventTalked',true);
    if(dialogue?.id==='ch2_act2_photo_intro'){
      this.openAct2Echo();
      return;
    }
    if(dialogue?.id==='ch2_act3_consent_preferences'){
      this.openAct3Echo();
      return;
    }
    if(['ch2_act3_consent_conflict_public','ch2_act3_consent_conflict_no_ask'].includes(dialogue?.id)&&choice?.id){
      this.state.set('flags.ch2ConflictShown',true);
      this.state.set('flags.groupPhotoRepairChoice',choice.id==='ch2_consent_change_audience'?'change_audience':choice.id==='ch2_consent_delete_post'?'delete_post':'keep');
      this.state.set('activeFlow.dialogue',null);
      if(choice.id==='ch2_consent_change_audience'){this.openAct3AudienceRepair();return;}
      if(choice.id==='ch2_consent_delete_post'){
        this.echoManager.deletePost(this.state.get('flags.groupPhotoPostId'));
        this.state.set('flags.postDeleted',true);
        this.state.set('flags.consentConflictUnresolved',false);
        this.dialogueManager.start('ch2_act3_repair_deleted','團體照反應',{kind:'ch2_act3_repair',overlay:true,returnContext});return;
      }
      this.state.set('flags.consentConflictUnresolved',true);
      this.dialogueManager.start('ch2_act3_repair_kept','團體照反應',{kind:'ch2_act3_repair',overlay:true,returnContext});return;
    }
    if(['ch2_act3_no_conflict','ch2_act3_repair_changed','ch2_act3_repair_deleted','ch2_act3_repair_kept'].includes(dialogue?.id)){
      this.state.set('flags.ch2Act3Complete',true);
      this.state.set('flags.ch2Act3RepairResolved',true);
      this.questManager.advance('ch2_explore_event','prepare_to_leave');
      questMessage=[questMessage,'主線任務已更新：準備離開。'].filter(Boolean).join('\n');
    }
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
    if(context.kind==='ch2_final_fragment')this.prepareCh2FinalInformationWorld();
    this.mapManager.enter(sceneId,{position:returnContext?.position??null,direction:returnContext?.facing??null});
    this.state.set('exploration.returnContext',null);this.saveManager.save();
    if(dialogue?.id==='ch1_album_phase3_complete')this.mapManager.view.showMessage?.('ALBUM 的屏障已平靜。沿原路回家，去找 PARENT 談談照片與分享的約定。');
    else if(noticeDiscovery?.message)this.mapManager.view.showMessage?.(noticeDiscovery.message);
    else if(questMessage)this.mapManager.view.showMessage?.(questMessage);
    if(noticeDiscovery?.isNew){const sideObjective=this.guidanceManager?.noticeBoardSideObjective(sceneId);if(sideObjective)this.guidanceManager?.queueNotice(`支線任務：${sideObjective}`);}
    this.guidanceManager?.flushNotice();
    this.flushCh2EchoReactionNotification();
  }

  isCh2FinalEntryEligible(){
    const quest=this.state.get('quests.ch2_explore_event')??{};
    return this.state.get('sceneId')==='ch2_community_event'
      && Boolean(this.state.get('flags.ch2Started'))
      && Boolean(this.state.get('flags.ch2Act3Complete'))
      && Boolean(this.state.get('flags.ch2Act3RepairResolved'))
      && quest.stageId==='prepare_to_leave';
  }

  handleMapExit(target,scene){
    if(target?.id!=='ch2_community_to_neighborhood'||scene?.id!=='ch2_community_event')return false;
    if(this.state.get('flags.ch2FinalEntryStarted')){this.continueCh2FinalEntry();return true;}
    if(!this.isCh2FinalEntryEligible())return false;
    return this.startCh2FinalEntry(target.id);
  }

  startCh2FinalEntry(exitId='ch2_community_to_neighborhood'){
    if(this.state.get('flags.ch2FinalEntryStarted')){this.continueCh2FinalEntry();return true;}
    if(!this.isCh2FinalEntryEligible())return false;
    const quest=this.state.get('quests.ch2_explore_event')??{};
    this.state.set('flags.ch2FinalEntryStarted',true);
    this.state.set('activeFlow.finalEntry',{id:'ch2_final_entry',sourceSceneId:'ch2_community_event',exitId});
    this.state.set('quests.ch2_explore_event',{...quest,status:'complete',stageId:'prepare_to_leave'});
    this.state.set('exploration.interactionTargetId',null);
    this.showCh2FinalEntryCheckpoint();
    this.saveManager.save();
    this.transitionToCh2FinalDataWorld();
    return true;
  }

  continueCh2FinalEntry(){
    if(this.state.get('flags.ch2FinalDataWorldEntered')){this.enterCh2FinalDataWorld({resume:true});return;}
    this.showCh2FinalEntryCheckpoint();
    this.transitionToCh2FinalDataWorld();
  }

  transitionToCh2FinalDataWorld(){
    const enter=()=>this.enterCh2FinalDataWorld();
    if(this.mapManager?.view?.transition)this.mapManager.view.transition(enter);else enter();
  }

  enterCh2FinalDataWorld({resume=false}={}){
    if(!this.state.get('flags.ch2FinalEntryStarted'))return false;
    const alreadyEntered=Boolean(this.state.get('flags.ch2FinalDataWorldEntered'));
    this.state.set('flags.ch2FinalDataWorldEntered',true);
    this.state.set('activeFlow.finalEntry',{...(this.state.get('activeFlow.finalEntry')??{}),id:'ch2_final_entry',sceneId:'ch2_final_data_world',status:'entered'});
    const screen=this.root.querySelector('#final-entry-screen');if(screen)screen.hidden=true;
      this.prepareCh2FinalInformationWorld();
      this.mapManager.enter('ch2_final_data_world',{resetToSpawn:!(resume||alreadyEntered)});
    if(resume&&this.state.get('flags.ch2FinalNorthConvergenceReady')&&this.ch2FinalFragmentModel?.requiredIds.length&&this.state.get('flags.ch2NullEncounterStarted')&&!this.state.get('flags.ch2NullDialogueComplete')){
      // Resume only at a stable, single-NULL reveal boundary; never replay a completed encounter.
      this.revealCh2Null();
      this.startCh2NullDialogue();
    }
    this.saveManager.save();
    return true;
  }

    buildCh2FinalSnapshot(){return buildCh2FinalSnapshot(this.state);}

    startCh2NullEncounter(){
      const model=this.ch2FinalFragmentModel,position=this.mapManager.position;
      const viewed=new Set(this.state.get('flags.ch2FinalViewedFragmentIds')??[]);
      if(this.state.get('sceneId')!=='ch2_final_data_world'||this.state.get('playerMovementLocked')
        ||this.state.get('flags.ch2NullEncounterStarted')||!this.state.get('flags.ch2FinalNorthConvergenceReady')
        ||!model?.requiredIds.length||!model.requiredIds.every((id)=>viewed.has(id))
        ||position?.x!==9||position?.y!==3)return false;
      this.state.set('flags.ch2NullEncounterStarted',true);
      this.state.set('playerMovementLocked',true);
      this.mapManager.view.beginNullFormation();this.saveManager.save();
      const active=()=>this.state.get('sceneId')==='ch2_final_data_world'&&this.state.get('mode')===GAME_MODE.EXPLORATION&&this.state.get('flags.ch2NullEncounterStarted')&&!this.state.get('flags.ch2NullDialogueComplete');
      // Narrative beats, not a map-loading delay. A reload resumes at the reveal boundary.
      const formationTimer=setTimeout(()=>{this.bossDiagnostics?.timerFired(formationTimer);if(!active())return;this.revealCh2Null();
        const dialogueTimer=setTimeout(()=>{this.bossDiagnostics?.timerFired(dialogueTimer);if(active())this.startCh2NullDialogue();},900);
        this.bossDiagnostics?.timerStarted(dialogueTimer);
      },1500);
      this.bossDiagnostics?.timerStarted(formationTimer);
      return true;
    }

    revealCh2Null(){
      this.state.set('flags.ch2NullFormationComplete',true);
      this.prepareCh2FinalInformationWorld();
      this.mapManager.view.refreshEntityVisibility();
      this.mapManager.view.revealNull();this.saveManager.save();
    }

    startCh2NullDialogue(){
      if(this.state.get('flags.ch2NullDialogueComplete')||(this.state.get('mode')===GAME_MODE.DIALOGUE&&this.dialogueManager.dialogue?.id==='ch2_null_first_encounter'))return;
      this.ensureCh2FinalDialogues();
      const dialogue=buildNullFirstDialogue(this.ch2FinalFragmentModel);
      const index=this.data.dialogues.findIndex((item)=>item.id===dialogue.id);
      if(index<0)this.data.dialogues.push(dialogue);else this.data.dialogues[index]=dialogue;
      this.mapManager.view.finishNullFormation();
      this.dialogueManager.start(dialogue.id,'資料世界',{kind:'ch2_null_encounter',overlay:true,
        returnContext:{sceneId:'ch2_final_data_world',position:{...this.mapManager.position},facing:'up'}});
    }

    prepareCh2FinalInformationWorld(){
      const scene=this.data?.scenes?.find((item)=>item.id==='ch2_final_data_world');if(!scene)return null;
      const model=resolveCh2InformationFragments(this.buildCh2FinalSnapshot());const viewed=new Set(this.state.get('flags.ch2FinalViewedFragmentIds')??[]);const ready=model.requiredIds.every((id)=>viewed.has(id));this.state.set('flags.ch2FinalNorthConvergenceReady',ready);
      const revealed=ready&&Boolean(this.state.get('flags.ch2NullFormationComplete'));
      scene.entities=(scene.entities??[]).filter((entity)=>!entity.generatedFinalFragment&&entity.id!=='ch2_final_convergence'&&entity.id!=='ch2_final_null');
      const nodes=model.fragments.map((fragment)=>({...fragment,viewed:viewed.has(fragment.id)}));
      scene.entities.push(...nodes.map((fragment)=>({...fragmentEntity(fragment),viewed:fragment.viewed,generatedFinalFragment:true})),{id:'ch2_final_convergence',type:'object',displayLabel:'聚合中的光',position:{x:9,y:2},nonBlocking:true,convergenceReady:ready,generatedFinalFragment:true,...(ready&&!revealed?{interaction:{kind:'ch2_final_convergence',prompt:'按 E 查看前方的變化',frontPositions:[{x:9,y:3,facing:'up'}]}}:{})});
      if(revealed&&!this.state.get('flags.ch2NullProfileCollapsed'))scene.entities.push({id:'ch2_final_null',type:'object',displayLabel:'資料輪廓',presentationClass:'temporary-null',position:{x:9,y:2},nonBlocking:true,generatedFinalFragment:true,interaction:{kind:'ch2_null_talk',prompt:'按 E 查看',frontPositions:[{x:9,y:3,facing:'up'}]}});
      scene.fragmentNodes=nodes;scene.fragmentConnections=model.connections;this.ch2FinalFragmentModel=model;return model;
    }

    syncCh2FinalGuidance(){
      const keeper=Boolean(this.state.get('flags.ch2FinalPhotoKeeperIntroComplete')),viewed=(this.state.get('flags.ch2FinalViewedFragmentIds')??[]).length,ready=Boolean(this.state.get('flags.ch2FinalNorthConvergenceReady'));const collapsed=Boolean(this.state.get('flags.ch2NullProfileCollapsed'));const objective=collapsed&&!this.state.get('flags.ch2PostBossReflectionComplete')?'和 PHOTO KEEPER 談談。':this.state.get('flags.ch2NullDialogueComplete')?'再靠近看看那個資料輪廓。':ready?'前方似乎有什麼變化。':viewed?'看看散落在這裡的資訊。':keeper?'沿著前方繼續探索。':'和入口附近的 PHOTO KEEPER 談談。';if(collapsed){const quest=this.state.get('quests.ch2_explore_event')??{};this.state.set('quests.ch2_explore_event',{...quest,status:'ACTIVE',stageId:'post_boss_reflection'});}this.state.set('quests.ch1_guidance',{discovered:true,status:'ACTIVE',currentStage:collapsed?'post_boss_reflection':ready?'final_data_convergence':keeper?'explore_final_data_world':'meet_final_photo_keeper',objective,progress:0,maxProgress:1,completed:false});return objective;
    }

  showCh2FinalEntryCheckpoint(){
    ['#story-intro','#title-screen','#dialogue-scene','#map-screen','#battle-screen','#puzzle-screen','#memory-investigation-screen','#reflection-screen','#chapter-summary-screen','#echo-screen','#survey-screen','#environment-closeup-screen','#phone-screen','#guidance-modal','#quest-notification'].forEach((selector)=>{const node=this.root.querySelector(selector);if(node)node.hidden=true;});
    const screen=this.root.querySelector('#final-entry-screen');if(screen)screen.hidden=false;
    this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);if(this.root?.dataset)this.root.dataset.gameMode='final-entry';
    this.audioManager.stopBGM({fade:500});
  }

  photo01TaggableCharacters(){
    return ['mio','rin','kai'].map((id)=>({id,label:this.data.characters?.[id]?.displayName??id.toUpperCase()}));
  }

  openPhoto01Echo(){
    return this.echoManager.open({id:'ch2-act1-mio-story',mode:'STORY',photo:'CH2-MIO-PHOTO-01',caption:'MIO 在社區活動拍照區留下的照片。',taggedCharacters:[],taggableCharacters:this.photo01TaggableCharacters(),location:{value:'GENERAL_AREA'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},controls:{tag:{visible:true,enabled:true},location:{visible:true,enabled:true},timing:{visible:true,enabled:true},audience:{visible:true,enabled:false,locked:true}},sourceEventId:'ch2_act1_mio_story'});
  }

  openPhoto01PostDialogue(){
    const returnContext={mode:'EXPLORATION',sceneId:'ch2_community_event',position:{x:6,y:14},facing:'up',sourceId:'ch2_photo01_post_dialogue',characterId:'mio'};
    this.mapManager.enter('ch2_community_event',{position:returnContext.position,direction:returnContext.facing});
    this.dialogueManager.start('ch2_photo01_post_dialogue','社區活動會場',{kind:'ch2_photo01_post',overlay:true,returnContext});
  }

  handleEchoCommit(record,session){
    const audience={PUBLIC:'public',FRIENDS:'friends',SELECTED:'selected',PRIVATE:'private'};
    if(session?.sourceEventId==='ch2_reward_bonus_share'){
      this.state.set('flags.bonusShareChoice','share');
      this.state.set('flags.bonusShareAudience',audience[record.audience]??'private');
      this.state.set('flags.bonusShareSelectedAudience',[...(record.selectedAudience??[])]);
      this.state.set('flags.bonusShareCompleted',true);
      this.state.set('flags.bonusSecondRewardPending',true);
      return;
    }
    if(session?.sourceEventId==='ch2_act1_mio_story'){
      const locations={CURRENT_LOCATION:'current',GENERAL_AREA:'general',NO_LOCATION:'none'};
      this.state.set('flags.act1LocationMode',locations[record.location]??'none');
      this.state.set('flags.act1Timing',record.timing==='SHARE_LATER'?'later':'now');
      this.state.set('flags.act1Audience','friends');
      this.state.set('flags.ch2Act1EchoDecided',true);
      this.state.set('flags.ch2PostPhotoFreeExplore',true);
      this.state.set('flags.ch2PostPhotoWorldActions',0);
      this.state.set('flags.ch2PostPhotoActionSources',[]);
      this.state.set('flags.ch2EchoReaction1Seen',false);
      this.state.set('flags.ch2EchoReaction2Seen',false);
      this.state.set('flags.ch2EchoReactionAvailable',false);
      this.state.set('flags.ch2EchoReactionSeen',false);
      this.state.set('flags.ch2EchoReactionNotificationShown',false);
      this.state.set('flags.ch2PostPhotoExplorationSteps',0);
      this.state.set('flags.ch2Act1ConsequenceResolved',false);
      this.state.set('flags.ch2LowerConsequencePending',false);
      this.state.set('flags.ch2LookingForMioEligible',false);
      this.state.set('flags.ch2Photo01PostDialoguePending',true);
      this.state.set('sceneId','ch2_community_event');
      this.state.set('exploration.mapPositions.ch2_community_event',{x:6,y:14});
      this.state.set('exploration.facing','up');
      this.questManager.advance('ch2_explore_event','post_photo_explore');
      return;
    }
    if(session?.sourceEventId==='ch2_act2_mio_post'){
      this.state.set('flags.act2Audience',audience[record.audience]??'private');
      this.state.set('flags.act2SelectedAudience',[...(record.selectedAudience??[])]);
      this.state.set('flags.act2PostCompleted',true);
      this.state.set('flags.ch2Act2PostCompleted',true);
      this.state.set('flags.act2PostId',record.id);
      this.state.set('flags.ch2Photo02PostDialoguePending',true);
      return;
    }
    if(session?.sourceEventId==='ch2_act3_group_post'){
      const selected=[...(record.selectedAudience??[])];
      const groupAudience=audience[record.audience]??'private';
      const asked=Boolean(this.state.get('flags.consentAsked'));
      const published=record.status==='POSTED'&&!record.deleted;
      const conflictType=evaluateGroupPhotoConflict(record,asked);
      const conflict=Boolean(conflictType);
      this.state.set('flags.groupPhotoAudience',groupAudience);
      this.state.set('flags.groupPhotoSelectedAudience',selected);
      this.state.set('flags.groupPhotoPostId',record.id);
      this.state.set('flags.groupPhotoExposed',record.audience==='PUBLIC');
      this.state.set('flags.postDeleted',false);
      this.state.set('flags.consentConflict',conflict);
      this.state.set('flags.consentConflictUnresolved',conflict);
      this.state.set('flags.groupPhotoConflictType',conflictType);
      this.state.set('flags.ch2GroupPhotoPostCompleted',true);
      this.state.set('flags.ch2GroupPhotoReactionPending',published);
      this.state.set('flags.ch2Act3ConsequenceSeen',true);
      this.questManager.advance('ch2_explore_event','act3_repair');
      return;
    }
    if(session?.sourceEventId==='ch2_act3_repair_audience'){
      const selected=[...(record.selectedAudience??[])];
      this.state.set('flags.groupPhotoAudience',audience[record.audience]??'private');
      this.state.set('flags.groupPhotoSelectedAudience',selected);
      this.state.set('flags.groupPhotoExposed',record.audience==='PUBLIC');
      this.state.set('flags.consentConflictUnresolved',false);
      this.state.set('flags.ch2GroupPhotoRepairResultPending',true);
      this.state.set('flags.ch2Act3RepairResolved',true);
    }
  }

  openAct2Echo(){
    this.echoManager.open({id:'ch2-act2-mio-post',mode:'POST',photo:'CH2-MIO-PHOTO-02',caption:'MIO 在活動會場拍下的照片。',taggedCharacters:[],taggableCharacters:this.photo01TaggableCharacters(),location:{value:'NO_LOCATION'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},allowSave:false,controls:{tag:{visible:true,enabled:true},location:{visible:true,enabled:true},timing:{visible:false,enabled:false,locked:true},audience:{visible:true,enabled:true}},contacts:[{id:'mio',label:'MIO · Close Friend'},{id:'kai',label:'KAI · Classmate'},{id:'rin',label:'RIN · Club Member'},{id:'old_classmate',label:'舊同學 · Old Classmate'},{id:'event_contact',label:'活動聯絡人 · Event Contact'}],sourceEventId:'ch2_act2_mio_post'});
  }

  photo02EchoRecord(){
    const postId=this.state.get('flags.act2PostId');
    return (this.state.get('echo.posts')??[]).find((post)=>post.id===postId||post.sourceEventId==='ch2_act2_mio_post')??null;
  }

  photo02RinCanSee(){return canCharacterSeePost(this.photo02EchoRecord(),'rin',{friendIds:['mio','kai','rin']});}

  photo02RinDialogueId(){
    const post=this.photo02EchoRecord();
    if(!this.photo02RinCanSee())return post?.audience==='SELECTED'?'ch2_act2_rin_selected_hidden':'ch2_act2_rin_private';
    if(post.audience==='PUBLIC')return 'ch2_act2_rin_public';
    if(post.audience==='SELECTED')return 'ch2_act2_rin_selected_visible';
    return 'ch2_act2_rin_friends';
  }

  openPhoto02PostDialogue(){
    const sceneId='ch2_community_event';
    const position=this.state.get(`exploration.mapPositions.${sceneId}`)??{x:21,y:7};
    const returnContext={mode:'EXPLORATION',sceneId,position:{...position},facing:this.state.get('exploration.facing')??'left',sourceId:'ch2_photo02_post_dialogue',characterId:'mio'};
    this.mapManager.enter(sceneId,{position:returnContext.position,direction:returnContext.facing});
    this.dialogueManager.start('ch2_act2_post_photo','活動區',{kind:'ch2_photo02_post',overlay:true,returnContext});
  }

  prepareAct2CharacterMovement(){
    const scene=this.data.scenes.find((item)=>item.id==='ch2_community_event');
    const mio=scene?.entities?.find((item)=>item.id==='ch2_mio');
    if(!mio)return;
    this.placeFixedStoryNpc(mio,{x:18,y:9},'left');
  }

  openAct3Echo(){
    this.echoManager.open({id:'ch2-act3-group-post',mode:'POST',photo:'CH2-GROUP-PHOTO-01',caption:'大家在社區活動會場拍下的團體照。',taggedCharacters:[],taggableCharacters:this.photo01TaggableCharacters(),location:{value:'NO_LOCATION'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},allowSave:false,controls:{tag:{visible:true,enabled:true},location:{visible:true,enabled:true},timing:{visible:false,enabled:false,locked:true},audience:{visible:true,enabled:true}},contacts:[{id:'player',label:'PLAYER · Close Friend'},{id:'mio',label:'MIO · Close Friend'},{id:'kai',label:'KAI · Classmate'},{id:'rin',label:'RIN · Club Member'}],sourceEventId:'ch2_act3_group_post'});
  }

  groupPhotoPost(){const postId=this.state.get('flags.groupPhotoPostId');return (this.state.get('echo.posts')??[]).find((post)=>post.id===postId)??null;}

  openGroupPhotoReaction(){
    this.state.set('flags.ch2GroupPhotoReactionPending',false);
    const post=this.groupPhotoPost();if(!post||post.status!=='POSTED'||post.deleted)return;
    const conflict=Boolean(this.state.get('flags.consentConflict'));
    const dialogueId=!conflict?'ch2_act3_no_conflict':this.state.get('flags.groupPhotoConflictType')==='public_preference'?'ch2_act3_consent_conflict_public':'ch2_act3_consent_conflict_no_ask';
    const sceneId='ch2_community_event';const position=this.state.get(`exploration.mapPositions.${sceneId}`)??{x:4,y:4};
    const returnContext={mode:'EXPLORATION',sceneId,position:{...position},facing:this.state.get('exploration.facing')??'up',sourceId:'ch2_group_photo_reaction'};
    this.mapManager.enter(sceneId,{position:returnContext.position,direction:returnContext.facing});
    this.dialogueManager.start(dialogueId,'團體照反應',{kind:'ch2_act3_consequence',overlay:true,returnContext});
  }

  openAct3AudienceRepair(){
    const post=this.groupPhotoPost();if(!post)return;
    this.echoManager.open({id:'ch2-act3-audience-repair',editPostId:post.id,mode:'POST',photo:'CH2-GROUP-PHOTO-01',caption:post.caption,taggedCharacters:[...(post.taggedCharacters??[])],taggableCharacters:this.photo01TaggableCharacters(),location:{value:post.location},timing:{value:post.timing},audience:{value:post.audience},selectedAudience:[...(post.selectedAudience??[])],allowSave:false,controls:{tag:{visible:false,enabled:false,locked:true},location:{visible:false,enabled:false,locked:true},timing:{visible:false,enabled:false,locked:true},audience:{visible:true,enabled:true}},contacts:[{id:'player',label:'PLAYER · Close Friend'},{id:'mio',label:'MIO · Close Friend'},{id:'kai',label:'KAI · Classmate'},{id:'rin',label:'RIN · Club Member'}],sourceEventId:'ch2_act3_repair_audience'});
  }

  openGroupPhotoRepairResult(){
    this.state.set('flags.ch2GroupPhotoRepairResultPending',false);
    const sceneId='ch2_community_event';const position=this.state.get(`exploration.mapPositions.${sceneId}`)??{x:4,y:4};
    const returnContext={mode:'EXPLORATION',sceneId,position:{...position},facing:this.state.get('exploration.facing')??'up',sourceId:'ch2_group_photo_repair'};
    this.mapManager.enter(sceneId,{position:returnContext.position,direction:returnContext.facing});
    this.dialogueManager.start('ch2_act3_repair_changed','團體照反應',{kind:'ch2_act3_repair',overlay:true,returnContext});
  }

  startPuzzleFromMap(id){
    const returnContext={mode:'EXPLORATION',sceneId:this.mapManager.scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing'),sourceId:id};
    this.puzzleManager.start(id,{kind:'exploration',returnContext});
  }

  beginMemory(context={},memory=null){
    if(context.returnContext)this.state.set('exploration.returnContext',context.returnContext);
    if(memory)this.state.set('activeFlow.memory',{id:memory.id,context});
    this.state.set('mode',GAME_MODE.PUZZLE);if(this.root?.dataset)this.root.dataset.gameMode='puzzle';this.state.set('playerMovementLocked',true);this.saveManager.save();
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
    this.state.set('mode',GAME_MODE.PUZZLE);if(this.root?.dataset)this.root.dataset.gameMode='puzzle';this.state.set('playerMovementLocked',true);this.saveManager.save();
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
    this.state.set('mode',GAME_MODE.BATTLE);if(this.root?.dataset)this.root.dataset.gameMode='battle';this.state.set('playerMovementLocked',true);this.saveManager.save();
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
  beginReflection(definition){this.state.set('activeFlow.reflection',{id:definition.id});this.state.set('mode',GAME_MODE.REFLECTION);if(this.root?.dataset)this.root.dataset.gameMode='reflection';this.state.set('playerMovementLocked',true);this.saveManager.save();}
  finishReflection(){const definition=this.reflectionManager.definition;this.state.set('activeFlow.reflection',null);this.state.set('exploration.returnContext',null);if(definition?.chapter==='CH2'){this.state.set('flags.ch2ReflectionComplete',true);this.startCh2Ending();return;}this.saveManager.save();this.summaryManager.start();}

  ensureCh2FinalDialogues(){
    this.data.characters.null??={displayName:'資料輪廓',presentationClass:'data-profile',portraits:{}};
    const add=(dialogue)=>{const index=this.data.dialogues.findIndex((item)=>item.id===dialogue.id);if(index<0)this.data.dialogues.push(dialogue);else this.data.dialogues[index]=dialogue;};
    add({id:'ch2_profile_collapse',label:'資料輪廓',sceneId:'ch2_final_data_world',participants:[{characterId:'player',position:'right',expression:'thinking'},{characterId:'null',position:'left',expression:'neutral'}],lines:[{speakerId:'player',expression:'thinking',text:'連結……斷開了。'},{speakerId:'null',expression:'neutral',text:'……'},{speakerId:'player',expression:'thinking',text:'可是那些資訊還在。'},{speakerId:'null',expression:'neutral',text:'嗯。'},{speakerId:'null',expression:'neutral',text:'只是沒有再像剛才那樣連在一起。'},{speakerId:'null',expression:'thinking',text:'分開的資訊，看起來只是碎片。'},{speakerId:'null',expression:'thinking',text:'連在一起，就可能看見更多。'}],choices:[],endText:'資料輪廓淡出，碎片留在資料世界。'});
    add({id:'ch2_post_boss_photo_keeper',label:'第二章 · PHOTO KEEPER',sceneId:'ch2_final_data_world',participants:[{characterId:'photo_keeper',position:'left',expression:'thinking'},{characterId:'player',position:'right',expression:'thinking'}],lines:[{speakerId:'photo_keeper',expression:'thinking',text:'看見了嗎？'},{speakerId:'player',expression:'thinking',text:'那些資訊原本都是分開的。'},{speakerId:'player',expression:'thinking',text:'可是連起來之後，看起來就像知道了更多事情。'},{speakerId:'photo_keeper',expression:'neutral',text:'嗯。'},{speakerId:'photo_keeper',expression:'thinking',text:'但不是每一條線，都一定能得到答案。'},{speakerId:'player',expression:'thinking',text:'有些只是線索。'},{speakerId:'photo_keeper',expression:'neutral',text:'對。'},{speakerId:'photo_keeper',expression:'thinking',text:'真正重要的，是你有沒有注意自己留下了什麼，又讓誰能看見。'},{speakerId:'player',expression:'neutral',text:'……我好像懂了。'}],choices:[],endText:'PHOTO KEEPER 安靜地等你整理這次看見的線。'});
    add({id:'ch2_final_ending',label:'第二章 · 結束',sceneId:'ch2_final_data_world',participants:[{characterId:'player',position:'right',expression:'thinking'},{characterId:'photo_keeper',position:'left',expression:'neutral'}],lines:[{speakerId:'player',expression:'thinking',text:'所以剛才那個輪廓……'},{speakerId:'photo_keeper',expression:'neutral',text:'只是這一次連起來的樣子。'},{speakerId:'player',expression:'thinking',text:'這一次？'},{speakerId:'photo_keeper',expression:'thinking',text:'你之後還會留下新的東西。'},{speakerId:'player',expression:'neutral',text:'……'},{speakerId:'photo_keeper',expression:'neutral',text:'走吧。'}],choices:[],endText:'你和 PHOTO KEEPER 一起離開資料世界。'});
  }

  startCh2Ending(){this.ensureCh2FinalDialogues();this.state.set('flags.ch2EndingStarted',true);this.state.set('mode',GAME_MODE.DIALOGUE);this.saveManager.save();this.dialogueManager.start('ch2_final_ending','資料世界',{kind:'ch2_ending',overlay:true,returnContext:{sceneId:'ch2_final_data_world',position:{...this.mapManager.position},facing:this.state.get('exploration.facing')??'down'}});}

  showCh2Complete(){this.phoneManager?.hide();['#story-intro','#title-screen','#dialogue-scene','#map-screen','#battle-screen','#puzzle-screen','#memory-investigation-screen','#reflection-screen','#chapter-summary-screen','#echo-screen','#survey-screen','#environment-closeup-screen','#phone-screen','#final-entry-screen','#guidance-modal','#quest-notification'].forEach((selector)=>{const node=this.root.querySelector(selector);if(node)node.hidden=true;});const screen=this.root.querySelector('#ch2-complete-screen');if(screen)screen.hidden=false;this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);if(this.root?.dataset)this.root.dataset.gameMode='ch2-complete';this.audioManager.stopBGM({fade:500});}

  beginCh2Opening({resume=false}={}){
    this.guidanceManager.startChapter2Opening({index:resume?this.state.get('flags.ch2OpeningIndex'):0,onComplete:()=>this.mapManager.view.transition(()=>this.startCh2OpeningScene())});
  }

  startCh2OpeningScene(){
    this.state.set('flags.ch2OpeningSeen',true);
    this.state.set('flags.ch2OpeningStarted',false);
    this.state.set('flags.ch2OpeningIndex',null);
    this.state.set('flags.ch2OpeningSceneActive',true);
    this.state.set('chapter','CH2_SHARE');
    this.state.set('activeFlow.summary',null);
    this.state.set('exploration.returnContext',null);
    const ch1Quest=this.state.get('quests.ch1_album_path');
    if(ch1Quest)this.state.set('quests.ch1_album_path',{...ch1Quest,status:'completed'});
    const eventScene=this.data.scenes.find((item)=>item.id==='ch2_community_event'&&item.type==='map');
    if(eventScene)this.mapManager.assetCache.preloadScene(eventScene);
    this.saveManager.save();
    this.mapManager.enter('home_map');
  }

  completeOpeningPing(){
    this.questManager.start('ch2_explore_event');
    this.questManager.advance('ch2_explore_event','travel_to_event');
    this.saveManager.save();
    this.guidanceManager.onExploration(this.state.get('sceneId'));
  }

  closeOpeningPhone(){
    this.state.set('mode',GAME_MODE.EXPLORATION);
    this.state.set('playerMovementLocked',false);
    this.root.dataset.gameMode='exploration';
    this.saveManager.save();
    if(this.state.get('flags.ch2PingCompleted'))this.mapManager.view.showMessage?.('主線任務：前往社區活動會場。');
  }

  handleMapEnter(scene){
    this.root.dataset.gameMode='exploration';
    for(const id of ['kai','mio','rin'])if(this.state.get(`flags.partyFollowers.${id}.active`))this.state.set(`flags.partyFollowers.${id}.active`,false);
    this.audioManager.playBGM(scene.bgmId??'DAILY_EXPLORATION');
    if(scene.id==='ch2_community_event'&&this.state.get('flags.ch2TravelToEventAvailable')&&!this.state.get('flags.ch2ArrivedAtEvent'))this.completeCh2Arrival();
    if(scene.id==='ch2_final_data_world'){
      const previous=this.state.get('quests.ch1_guidance.objective'),objective=this.syncCh2FinalGuidance();
      if(previous!==objective)this.guidanceManager.queueNotice(objective);
    }else this.guidanceManager.onExploration(scene.id);
    if(scene.id==='home_map'&&this.state.get('flags.ch2OpeningSceneActive')&&!this.state.get('flags.ch2PingCompleted'))this.phoneManager.presentNotification();
    if(scene.id==='ch2_community_event'&&this.state.get('flags.ch2Act2BridgeComplete')&&!this.state.get('flags.ch2Act2PostCompleted'))this.prepareAct2CharacterMovement();
    if(scene.id==='ch2_community_event'&&this.state.get('flags.ch2Act3AnnouncementComplete')&&!this.state.get('flags.ch2GroupPhotoCompleted'))this.prepareAct3CharacterMovement();
    if(scene.id==='ch2_community_event'&&this.state.get('flags.ch2Act2BridgePending')&&!this.state.get('flags.ch2Act2BridgeComplete'))queueMicrotask(()=>{if(this.state.get('mode')===GAME_MODE.EXPLORATION)this.dialogueManager.start('ch2_act2_bridge','社區活動會場',{kind:'ch2_act2_bridge',overlay:true,returnContext:{mode:'EXPLORATION',sceneId:scene.id,position:{...this.mapManager.position},facing:this.state.get('exploration.facing')??'down'}});});
    if(scene.id==='ch2_final_data_world'&&!this.state.get('flags.ch2FinalPhotoKeeperIntroComplete'))this.mapManager.view.showMessage?.('PHOTO KEEPER 就在附近，先和他談談。');
    this.flushCh2EchoReactionNotification();
    this.flushCh2Act3Announcement();
  }

  completeCh2Arrival(){
    const sceneId='ch2_community_event';
    const scene=this.data.scenes.find((item)=>item.id===sceneId&&item.type==='map');
    if(!scene)throw new Error('找不到第二章起始地圖。');
    this.state.set('flags.ch2Started',true);
    this.state.set('flags.ch2ArrivedAtEvent',true);
    this.state.set('flags.ch2OpeningSceneActive',false);
    this.state.set('flags.ch2OpeningSeen',true);
    this.state.set('flags.ch2OpeningStarted',false);
    this.state.set('flags.ch2OpeningIndex',null);
    this.state.set('chapter','CH2_SHARE');
    this.state.set('activeFlow.summary',null);
    this.state.set('exploration.returnContext',null);
    const ch1Quest=this.state.get('quests.ch1_album_path');
    if(ch1Quest)this.state.set('quests.ch1_album_path',{...ch1Quest,status:'completed'});
    this.questManager.start('ch2_explore_event');
    this.questManager.advance('ch2_explore_event','find_mio');
    this.saveManager.save();
    this.mapManager.view.showMessage?.('主線任務：找到 MIO。');
  }

  returnToMainMenu(){this.phoneManager?.hide();['#dialogue-scene','#map-screen','#battle-screen','#puzzle-screen','#memory-investigation-screen','#reflection-screen','#chapter-summary-screen','#echo-screen','#survey-screen','#environment-closeup-screen','#phone-screen','#final-entry-screen','#ch2-complete-screen'].forEach((selector)=>{const node=this.root.querySelector(selector);if(node)node.hidden=true;});this.root.querySelector('#title-screen').hidden=false;this.audioManager.stopBGM({fade:500});this.state.set('mode',GAME_MODE.MENU);if(this.root?.dataset)this.root.dataset.gameMode='menu';this.state.set('playerMovementLocked',true);this.saveManager.save();this.syncSaveUi();}

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

  showEnvironmentCloseup({kicker,title,image,alt,content,actions=[]}){
    const screen=this.root.querySelector('#environment-closeup-screen');
    const visual=this.root.querySelector('#environment-closeup-image');
    const contentNode=this.root.querySelector('#environment-closeup-content');
    const actionsNode=this.root.querySelector('#environment-closeup-actions');
    if(!screen||!visual||!contentNode||!actionsNode)return;
    this.root.querySelector('#environment-closeup-kicker').textContent=kicker;
    this.root.querySelector('#environment-closeup-title').textContent=title;
    visual.src=image;visual.alt=alt;
    contentNode.innerHTML=content;
    actionsNode.replaceChildren(...actions.map(({action,label,secondary=false,disabled=false})=>{const button=document.createElement('button');button.type='button';button.dataset.closeupAction=action;button.textContent=label;button.disabled=disabled;if(secondary)button.className='secondary';return button;}));
    screen.hidden=false;this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);this.root.dataset.gameMode='environment-closeup';
  }

  closeEnvironmentCloseup(){
    const screen=this.root.querySelector('#environment-closeup-screen');if(screen)screen.hidden=true;
    this.state.set('mode',GAME_MODE.EXPLORATION);this.state.set('playerMovementLocked',false);this.root.dataset.gameMode='exploration';this.saveManager.save();this.flushCh2EchoReactionNotification();
  }

  openEventBoard(){
    this.showEnvironmentCloseup({kicker:'社區活動區',title:'活動公布欄',image:'assets/images/ch2/environment/ch2_event_board_bg.png',alt:'社區活動公布欄近景，完整展示活動海報、會場地圖與活動照片。',content:'<p>公布欄整理了今天的活動資訊。</p><ul><li>主舞台：活動表演與成果發表</li><li>拍照區：會場前方偏左的花園入口</li><li>集合點：中央廣場的指標附近</li><li>活動攤位與休息區：沿主要步道分布</li></ul><p>旁邊也貼著活動地圖與幾張現場照片。</p>',actions:[{action:'close',label:'返回會場'}]});
  }

  openRewardBooth(){
    const completed=Boolean(this.state.get('flags.rewardEventCompleted'));
    const first=this.state.get('flags.firstReward')??this.state.get('flags.surveyRewardType');
    if(this.state.get('flags.surveyCompleted')&&first&&!this.state.get('flags.firstReward'))this.state.set('flags.firstReward',first);
    if(this.state.get('flags.bonusSecondRewardPending')){this.openSecondRewardSelection();return;}
    if(this.state.get('flags.surveyCompleted')&&!this.state.get('flags.bonusShareChoice')){this.openBonusShareOffer();return;}
    const rewardNames={coins:'遊戲點數',equipment:'稀有裝備',skin:'限定造型'};
    const status=completed?`<p>活動已完成。你已領取：${[first,this.state.get('flags.secondReward')].filter(Boolean).map((id)=>rewardNames[id]).join('、')}。</p>`:'<p>參加活動，即可選擇一項遊戲獎勵！</p><div class="environment-closeup-rewards"><div class="environment-closeup-reward"><strong>遊戲點數</strong>可在遊戲中使用的大量點數。</div><div class="environment-closeup-reward"><strong>稀有裝備</strong>帶有特殊邊框的幻想裝備。</div><div class="environment-closeup-reward"><strong>限定造型</strong>本次活動限定的角色外觀。</div></div><p>完成問卷後，還可以選擇是否參加額外分享活動。</p>';
    this.state.set('flags.rewardEventStarted',true);
    this.showEnvironmentCloseup({kicker:'活動攤位',title:'限定遊戲獎勵',image:'assets/images/ch2/environment/ch2_game_reward_booth_bg.png',alt:'社區活動中的遊戲獎勵攤位近景，完整展示遊戲點數、稀有裝備與限定造型。',content:status,actions:completed?[{action:'close',label:'返回會場'}]:[{action:'survey',label:'查看活動並參加'},{action:'close',label:'稍後再說',secondary:true}]});
  }

  openBonusShareOffer(){
    this.state.set('flags.bonusShareOffered',true);
    this.showEnvironmentCloseup({kicker:'額外獎勵',title:'想再多拿一項嗎？',image:'assets/images/ch2/environment/ch2_game_reward_booth_bg.png',alt:'限定遊戲獎勵攤位近景。',content:'<p>第一項獎勵已經保留。</p><p>分享這次活動，可以再從剩下的獎勵中選擇一項。分享對象由你決定；不分享也不會失去原本的獎勵。</p>',actions:[{action:'bonus-share',label:'分享活動，再選一項'},{action:'bonus-skip',label:'不分享，直接領取',secondary:true}]});
    this.saveManager.save();
  }

  openSecondRewardSelection(){
    const first=this.state.get('flags.firstReward');const rewardNames={coins:'遊戲點數',equipment:'稀有裝備',skin:'限定造型'};
    const choices=Object.entries(rewardNames).filter(([id])=>id!==first).map(([id,label])=>({action:`second-${id}`,label}));
    this.showEnvironmentCloseup({kicker:'分享完成',title:'選擇第二項獎勵',image:'assets/images/ch2/environment/ch2_game_reward_booth_bg.png',alt:'限定遊戲獎勵攤位近景。',content:`<p>第一項獎勵「${rewardNames[first]??'已領取'}」已保留。</p><p>請從另外兩項獎勵中選擇一項。相同獎勵不會重複發放。</p>`,actions:choices});
  }

  handleCloseupAction(action){
    if(action==='close'){
      const pendingSource=this.state.get('flags.ch2PendingWorldActionSource');
      this.state.set('flags.ch2PendingWorldActionSource',null);
      this.closeEnvironmentCloseup();
      const message=pendingSource?this.recordCh2PostPhotoWorldAction(pendingSource):'';
      if(message)this.mapManager.view.showMessage?.(message);
      return;
    }
    if(action==='survey'){this.root.querySelector('#environment-closeup-screen').hidden=true;this.openSurveyForm();return;}
    if(action==='bonus-skip'){this.state.set('flags.bonusShareChoice','skip');this.state.set('flags.rewardEventCompleted',true);this.closeEnvironmentCloseup();return;}
    if(action==='bonus-share'){
      this.root.querySelector('#environment-closeup-screen').hidden=true;
      this.echoManager.open({id:'ch2-reward-bonus-share',mode:'POST',photo:'CH2-GAME-REWARD-BOOTH-BG',caption:'社區活動的限定遊戲獎勵攤位。',location:{value:'NO_LOCATION'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},allowSave:false,controls:{location:{visible:false,enabled:false,locked:true},timing:{visible:false,enabled:false,locked:true},audience:{visible:true,enabled:true}},contacts:[{id:'kai',label:'KAI · Friend'},{id:'mio',label:'MIO · Close Friend'},{id:'rin',label:'RIN · Friend'}],sourceEventId:'ch2_reward_bonus_share'});return;
    }
    if(action.startsWith('second-')){
      const reward=action.slice(7);const first=this.state.get('flags.firstReward');
      if(!['coins','equipment','skin'].includes(reward)||reward===first||this.state.get('flags.secondReward'))return;
      this.grantSurveyReward(reward);this.state.set('flags.secondReward',reward);this.state.set('flags.bonusSecondRewardPending',false);this.state.set('flags.rewardEventCompleted',true);this.closeEnvironmentCloseup();
    }
  }

  grantSurveyReward(reward){
    if(reward==='coins')this.state.update('currency.gameCoins',(value=0)=>value+100);
    else{const rewardId=reward==='equipment'?'ch2_rare_equipment':'ch2_limited_skin';this.state.update('inventory',(items=[])=>items.includes(rewardId)?items:[...items,rewardId]);}
  }

  openSurveyForm(){
    const screen=this.root.querySelector('#survey-screen');const form=this.root.querySelector('#survey-form');
    form?.reset();if(screen)screen.hidden=false;
    this.state.set('flags.surveyStarted',true);this.state.set('mode',GAME_MODE.MENU);this.state.set('playerMovementLocked',true);if(this.root?.dataset)this.root.dataset.gameMode='survey';
  }

  closeSurveyForm({cancelled=false}={}){
    const screen=this.root.querySelector('#survey-screen');const form=this.root.querySelector('#survey-form');
    form?.reset();if(screen)screen.hidden=true;if(cancelled)this.state.set('flags.surveyCancelled',true);
    this.state.set('mode',GAME_MODE.EXPLORATION);this.state.set('playerMovementLocked',false);if(this.root?.dataset)this.root.dataset.gameMode='exploration';this.saveManager.save();this.flushCh2EchoReactionNotification();
  }

  submitSurveyForm({skip=false}={}){
    const form=this.root.querySelector('#survey-form');if(!form)return;
    const input=skip?null:new FormData(form);const fields=['nickname','ageRange','platform','email','phone','school','birthday','gameId'];
    const provided=fields.filter((field)=>Boolean(input?.get(field)?.toString().trim()));
    for(const field of fields){const suffix=field[0].toUpperCase()+field.slice(1);this.state.set(`flags.surveyShare${suffix}`,provided.includes(field));this.state.set(`flags.surveySkip${suffix}`,!provided.includes(field));}
    const reward=skip?(form.elements.reward?.value??'coins'):(input?.get('reward')?.toString()??'coins');
    this.state.set('flags.surveyRewardType',reward);this.state.set('flags.surveyCompleted',true);this.state.set('flags.surveyDataShared',provided);this.state.set('flags.surveyOptionalFieldsSkipped',provided.length<fields.length);
    if(!this.state.get('flags.surveyRewardReceived')){this.state.set('flags.surveyRewardReceived',true);this.state.set('flags.firstReward',reward);this.grantSurveyReward(reward);}
    const screen=this.root.querySelector('#survey-screen');if(screen)screen.hidden=true;form.reset();this.openBonusShareOffer();
  }

  isKaiMeetingReady(){return ['ch2PhotoCaptured','ch2Act1EchoDecided'].every((flag)=>Boolean(this.state.get(`flags.${flag}`)));}

  photo01EchoRecord(){
    const echo=this.state.get('echo')??{};
    return [...(echo.posts??[]),...(echo.drafts??[])].filter((record)=>record?.sourceEventId==='ch2_act1_mio_story').sort((a,b)=>(b.order??0)-(a.order??0))[0]??null;
  }

  isCh2HighConsequence(){
    const record=this.photo01EchoRecord();
    return record?.status==='POSTED'&&this.state.get('flags.act1LocationMode')==='current'&&this.state.get('flags.act1Timing')==='now';
  }

  recordCh2PostPhotoExplorationStep(){
    if(!this.state.get('flags.ch2PostPhotoFreeExplore')||this.state.get('flags.ch2Act1ConsequenceResolved')||this.state.get('flags.ch2EchoReactionAvailable')||this.state.get('flags.ch2EchoReactionSeen'))return;
    const steps=(this.state.get('flags.ch2PostPhotoExplorationSteps')??0)+1;
    this.state.set('flags.ch2PostPhotoExplorationSteps',steps);
    if(steps>=12)this.makeCh2EchoReactionAvailable('exploration');
  }

  recordCh2Act3ExplorationStep(){
    if(!this.state.get('flags.ch2Act3ExplorationActive')||this.state.get('flags.ch2Act3AnnouncementComplete'))return;
    const steps=(this.state.get('flags.ch2Act3ExplorationSteps')??0)+1;
    this.state.set('flags.ch2Act3ExplorationSteps',steps);
    if(steps<10)return;
    this.state.set('flags.ch2Act3AnnouncementReady',true);
    this.saveManager.save();
    this.flushCh2Act3Announcement();
  }

  flushCh2Act3Announcement(){
    if(!this.state.get('flags.ch2Act3AnnouncementReady')||this.state.get('flags.ch2Act3AnnouncementComplete')||this.state.get('mode')!==GAME_MODE.EXPLORATION||this.guidanceManager?.modalOpen)return;
    const sceneId=this.mapManager.scene?.id??this.state.get('sceneId');if(sceneId!=='ch2_community_event')return;
    const returnContext={mode:'EXPLORATION',sceneId,position:{...this.mapManager.position},facing:this.state.get('exploration.facing')??'down',sourceId:'ch2_act3_announcement'};
    this.dialogueManager.start('ch2_act3_announcement','活動會場',{kind:'ch2_act3_announcement',overlay:true,returnContext});
  }

  prepareAct3CharacterMovement(){
    const scene=this.data.scenes.find((item)=>item.id==='ch2_community_event');
    const mio=scene?.entities?.find((item)=>item.id==='ch2_mio');const rin=scene?.entities?.find((item)=>item.id==='ch2_rin');const kai=scene?.entities?.find((item)=>item.id==='ch2_kai');
    this.placeFixedStoryNpc(mio,{x:5,y:5},'up');
    this.placeFixedStoryNpc(rin,{x:3,y:5},'up');
    this.placeFixedStoryNpc(kai,{x:6,y:5},'up');
  }

  placeFixedStoryNpc(entity,position,direction='down'){
    if(!entity)return;
    delete entity.roaming;entity.position={...position};entity.direction=direction;
    if(entity.interaction){const {x,y}=position;entity.interaction.frontPositions=[{x,y:y+1,facing:'up'},{x:x-1,y,facing:'right'},{x:x+1,y,facing:'left'},{x,y:y-1,facing:'down'}];entity.interaction.frontPosition=entity.interaction.frontPositions[0];}
    this.mapManager.view.updateRoamingNpc?.(entity,{state:'IDLE',frame:1,direction});
    this.mapManager.refreshInteraction?.();
  }

  recordCh2PostPhotoWorldAction(source){
    if(!this.state.get('flags.ch2PostPhotoFreeExplore')||this.state.get('flags.ch2Act1Complete')||this.state.get('flags.ch2Act1ConsequenceResolved'))return '';
    const sources=this.state.get('flags.ch2PostPhotoActionSources')??[];
    if(sources.includes(source))return '';
    this.state.set('flags.ch2PostPhotoActionSources',[...sources,source]);
    const count=(this.state.get('flags.ch2PostPhotoWorldActions')??0)+1;
    this.state.set('flags.ch2PostPhotoWorldActions',count);
    if(count===1)this.makeCh2EchoReactionAvailable(source);
    return '';
  }

  makeCh2EchoReactionAvailable(source){
    if(this.state.get('flags.ch2EchoReactionSeen')||this.state.get('flags.ch2EchoReactionAvailable')||this.state.get('flags.ch2Act1ConsequenceResolved'))return;
    this.state.set('flags.ch2EchoReactionEligible',true);
    this.state.set('flags.ch2EchoReactionAvailable',true);
    this.state.set('flags.ch2EchoReactionSource',source);
    this.questManager.advance('ch2_explore_event','review_echo_reaction');
    this.saveManager.save();
    this.flushCh2EchoReactionNotification();
  }

  flushCh2EchoReactionNotification(){
    if(!this.state.get('flags.ch2EchoReactionAvailable')||this.state.get('flags.ch2EchoReactionSeen')||this.state.get('mode')!==GAME_MODE.EXPLORATION||this.guidanceManager?.modalOpen)return;
    const draft=this.photo01EchoRecord()?.status==='DRAFT';
    this.phoneManager.presentEchoReactionNotification(draft?'草稿仍保留':'1 則新通知');
  }

  openCh2EchoReaction(){
    if(!this.state.get('flags.ch2EchoReactionAvailable')||this.state.get('flags.ch2EchoReactionSeen'))return;
    const timing=this.state.get('flags.act1Timing');
    const location=this.state.get('flags.act1LocationMode');
    const dialogueId=timing==='later'?'ch2_act1_consequence_later':location==='current'?'ch2_act1_consequence_current_now':location==='general'?'ch2_act1_consequence_general_now':'ch2_act1_consequence_none_now';
    const sceneId=this.mapManager.scene?.id??this.state.get('sceneId')??'ch2_community_event';
    const returnContext={mode:'EXPLORATION',sceneId,position:{...(this.mapManager.position??this.state.get(`exploration.mapPositions.${sceneId}`)??{x:6,y:14})},facing:this.state.get('exploration.facing')??'down',sourceId:'ch2_echo_reaction'};
    this.state.set('flags.ch2EchoReaction1Seen',true);
    this.phoneManager.hide();
    this.dialogueManager.start(dialogueId,'ECHO',{kind:'ch2_echo_reaction',overlay:true,returnContext});
  }

  positionLookingForMioAtSafeEntrance(){
    const entity=this.data.scenes.find((scene)=>scene.id==='ch2_community_event')?.entities?.find((item)=>item.id==='ch2_online_follower');
    if(!entity)return;
    const player=this.mapManager.position??{x:6,y:14};
    const candidates=[{x:14,y:21},{x:6,y:6}];
    const position=candidates.sort((a,b)=>(Math.abs(b.x-player.x)+Math.abs(b.y-player.y))-(Math.abs(a.x-player.x)+Math.abs(a.y-player.y)))[0];
    entity.position={...position};
    this.state.set('flags.roamingNpcs.ch2_online_follower',{...position,direction:'up'});
    this.state.set('flags.ch2LookingForMioSpawn',{...position});
  }

  startMaleNpcApproachDialogue(entity,config){
    if(config?.eventId!=='looking_for_mio_approach'||this.state.get('flags.mioFollowerEncountered'))return;
    const sceneId=this.mapManager.scene?.id??'ch2_community_event';
    const returnContext={mode:'EXPLORATION',sceneId,position:{...this.mapManager.position},facing:this.state.get('exploration.facing')??'up',sourceId:entity.id,characterId:entity.characterId};
    this.dialogueManager.start('ch2_male_recognition_approach','活動會場',{kind:'ch2_story_consequence',overlay:true,returnContext});
  }

  completeCh2Act1Consequence(route='lower'){
    if(this.state.get('flags.ch2Act1Complete'))return;
    this.state.set('flags.ch2Act1ConsequenceResolved',true);
    this.state.set('flags.ch2ConsequenceRoute',route);
    this.state.set('flags.ch2Act1Complete',true);
    this.state.set('flags.ch2PostPhotoFreeExplore',false);
    this.state.set('flags.ch2EchoReactionAvailable',false);
    this.state.set('flags.ch2Act2BridgePending',true);
    this.questManager.advance('ch2_explore_event','act1_complete');
    this.saveManager.save();
  }

  startNullBossFoundation(){
    if(this.state.get('sceneId')!=='ch2_final_data_world'||this.state.get('mode')!==GAME_MODE.EXPLORATION||!this.state.get('flags.ch2NullDialogueComplete')||!this.state.get('flags.ch2BossStageReady')||this.state.get('flags.ch2NullBossFoundationComplete'))return false;
    this.state.set('flags.ch2NullBossStarted',true);
    const snapshot=this.buildCh2FinalSnapshot();const plan=buildNullBossSemanticPlan(snapshot,resolveCh2InformationFragments(snapshot));
    this.openNullBossFoundation({id:'ch2_null_boss',round:1,phase:'PLAYER',plan,returnContext:{position:{...this.mapManager.position},facing:this.state.get('exploration.facing')}});return true;
  }

  openNullBossFoundation(flow){
    this.nullBossManager??=new NullBossManager({root:this.root,state:this.state,saveManager:this.saveManager,onExit:(context,result)=>{this.prepareCh2FinalInformationWorld();this.mapManager.enter('ch2_final_data_world',{position:context.position,direction:context.facing});if(result?.collapsed){this.ensureCh2FinalDialogues();this.dialogueManager.start('ch2_profile_collapse','資料世界',{kind:'ch2_profile_collapse',overlay:true,returnContext:{sceneId:'ch2_final_data_world',position:{...this.mapManager.position},facing:this.state.get('exploration.facing')??'up'}});}}});
    this.bossDiagnostics?.attachBoss(this.nullBossManager);
    this.nullBossManager.open(flow,this.data.scenes.find(s=>s.id==='ch2_final_data_world').mapArt.baseImage);
  }

  resumeFromState(){
    if(this.state.get('flags.ch2Complete')){this.showCh2Complete();return;}
    // Post-Boss flows outrank the persistent "entered data world" fallback.
    // ReflectionManager restores saved answers and the submitted confirmation.
    const postBossDialogue=this.state.get('activeFlow.dialogue');
    if(['ch2_profile_collapse','ch2_post_boss_photo_keeper','ch2_final_ending'].includes(postBossDialogue?.id)){
      this.ensureCh2FinalDialogues();
      this.dialogueManager.start(postBossDialogue.id,'資料世界',postBossDialogue.context??{});return;
    }
    const postBossReflection=this.state.get('activeFlow.reflection');
    if(postBossReflection?.id==='ch2_data_profile_reflection'){this.startReflection(postBossReflection.id);return;}
    if(this.state.get('flags.ch2ReflectionComplete')){this.startCh2Ending();return;}
    const nullBoss=this.state.get('activeFlow.nullBoss');
    if(nullBoss?.id==='ch2_null_boss'&&this.state.get('flags.ch2NullDialogueComplete')&&this.state.get('flags.ch2BossStageReady')){this.openNullBossFoundation(nullBoss);return;}
    if(this.state.get('flags.ch2FinalDataWorldEntered')){this.enterCh2FinalDataWorld({resume:true});return;}
    if(this.state.get('flags.ch2FinalEntryStarted')){this.continueCh2FinalEntry();return;}
    if(this.isKaiMeetingReady()&&!this.state.get('flags.ch2KaiCanMeet'))this.state.set('flags.ch2KaiCanMeet',true);
    if(this.state.get('flags.ch2Act1Complete')&&!this.state.get('flags.ch2Act2BridgeComplete')&&!this.state.get('flags.ch2Act2PostCompleted'))this.state.set('flags.ch2Act2BridgePending',true);
    if(this.state.get('flags.ch2Act2ReflectionComplete')&&!this.state.get('flags.ch2Act3AnnouncementComplete')&&!this.state.get('flags.ch2Act3AnnouncementReady'))this.state.set('flags.ch2Act3ExplorationActive',true);
    const activeBattle=this.state.get('flags.activeBattle');
    if(activeBattle){this.battleManager.restore(activeBattle);return;}
    const echoFlow=this.state.get('activeFlow.echo');
    if(echoFlow?.config){this.echoManager.open(echoFlow.config);return;}
    const dialogueFlow=this.state.get('activeFlow.dialogue');
    if(dialogueFlow?.id){if(dialogueFlow.id.startsWith('ch2_profile_')||dialogueFlow.id.startsWith('ch2_post_boss_')||dialogueFlow.id==='ch2_final_ending')this.ensureCh2FinalDialogues();const sceneName=this.data.scenes.find((item)=>item.id===dialogueFlow.context?.returnContext?.sceneId)?.displayName??'事件場景';this.dialogueManager.start(dialogueFlow.id,sceneName,dialogueFlow.context??{});return;}
    const puzzleFlow=this.state.get('activeFlow.puzzle');
    if(puzzleFlow?.id){this.puzzleManager.start(puzzleFlow.id,puzzleFlow.context??{});return;}
    const memoryFlow=this.state.get('activeFlow.memory');
    if(memoryFlow?.id){this.memoryManager.start(memoryFlow.id,memoryFlow.context??{});return;}
    const reflectionFlow=this.state.get('activeFlow.reflection');
    if(reflectionFlow?.id){this.startReflection(reflectionFlow.id);return;}
    if(this.state.get('flags.ch2ReflectionComplete')&&!this.state.get('flags.ch2Complete')){this.startCh2Ending();return;}
    const summaryFlow=this.state.get('activeFlow.summary');
    if(summaryFlow){this.summaryManager.start({index:summaryFlow.index??0});return;}
    if(this.state.get('flags.ch2Photo01PostDialoguePending')&&!this.state.get('flags.ch2Photo01PostDialogueComplete')){this.openPhoto01PostDialogue();return;}
    if(this.state.get('flags.ch2Photo02PostDialoguePending')&&!this.state.get('flags.ch2Photo02PostDialogueComplete')){this.openPhoto02PostDialogue();return;}
    if(this.state.get('flags.ch2GroupPhotoReactionPending')){this.openGroupPhotoReaction();return;}
    if(this.state.get('flags.ch2GroupPhotoRepairResultPending')){this.openGroupPhotoRepairResult();return;}
    if(this.state.get('flags.ch1Complete')&&!this.state.get('flags.ch2Started')){
      if(this.state.get('flags.ch2TravelToEventAvailable')){const savedScene=this.data.scenes.find((item)=>item.id===this.state.get('sceneId')&&item.type==='map');this.mapManager.enter(savedScene?.id??'home_map');return;}
      if(this.state.get('flags.ch2OpeningSceneActive')){this.mapManager.enter('home_map');return;}
      if(this.state.get('flags.ch2OpeningStarted'))this.beginCh2Opening({resume:true});else this.summaryManager.start({final:true});return;
    }
    if(this.state.get('flags.albumReflectionComplete')&&!this.state.get('flags.ch2Started')){this.summaryManager.start();return;}
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
