import { GAME_MODE } from '../core/GameMode.js';
import { InteractionSystem } from '../systems/InteractionSystem.js?v=neighborhoodboards1';
import { RoamingEnemyManager } from './RoamingEnemyManager.js?v=roamingchase1';

export class MapManager {
  constructor({ scenes, gameState, view, saveManager, onEncounter, onPuzzle, onInteract, onEnter }) {
    this.scenes = scenes; this.gameState = gameState; this.view = view; this.saveManager = saveManager; this.onEncounter=onEncounter; this.onPuzzle=onPuzzle;
    this.onInteract=onInteract;this.onEnter=onEnter;this.scene = null; this.position = { x: 0, y: 0 };
    this.roamingEnemies=new RoamingEnemyManager({gameState,view,saveManager,isCollision:(position)=>this.isCollision(position),onEncounter:(enemy)=>this.handleRoamingEncounter(enemy)});
  }
  enter(sceneId, { resetToSpawn = false, position = null, direction = null } = {}) {
    const scene = this.scenes.find((item) => item.id === sceneId && item.type === 'map');
    if (!scene) throw new Error(`找不到探索場景：${sceneId}`);
    if(scene.id==='home_map'&&!this.gameState.get('flags.albumParentPostBattleComplete')){
      const albumQuest=this.gameState.get('quests.ch1_album_path')??{};
      const phase3Recorded=(albumQuest.completedStages??[]).includes('complete_album_profile_phase')||albumQuest.stageId==='complete_album_profile_phase';
      const parentConversationPending=Boolean(this.gameState.get('flags.albumAwaitingParent')||this.gameState.get('flags.albumPhase3Complete')||this.gameState.get('flags.albumBattleComplete')||(this.gameState.get('defeatedBosses')??[]).includes('album')||phase3Recorded);
      if(parentConversationPending)this.gameState.set('flags.albumAwaitingParent',true);
    }
    this.scene = scene;
    const savedPosition = this.gameState.get(`exploration.mapPositions.${scene.id}`);
    const useTransitionPosition=this.isValidPosition(position)&&!this.isCollision(position);
    const useSavedPosition=!useTransitionPosition&&!resetToSpawn&&this.isValidPosition(savedPosition)&&!this.isCollision(savedPosition);
    this.position = useTransitionPosition ? {...position} : useSavedPosition ? savedPosition : { ...scene.spawn };
    if(useTransitionPosition&&direction)this.gameState.set('exploration.facing',direction);
    else if(!useSavedPosition&&scene.spawnFacing)this.gameState.set('exploration.facing',scene.spawnFacing);
    this.gameState.set('sceneId', scene.id);
    this.gameState.set('mode', GAME_MODE.EXPLORATION);
    this.gameState.set('playerMovementLocked', false);
    this.persistExploration();
    this.view.open(); this.view.render(scene, this.position, (to) => this.enter(to), (enemyId)=>this.onEncounter?.(enemyId), (puzzleId)=>this.onPuzzle?.(puzzleId));this.roamingEnemies.enter(scene); this.view.move(this.position, this.gameState.get('exploration.facing') ?? scene.spawnFacing ?? 'down');this.refreshInteraction();this.onEnter?.(scene);
  }
  move(dx, dy) {
    if (!this.scene || this.gameState.get('playerMovementLocked')) return false;
    const facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    const grid = this.grid;
    const next = {
      x: Math.max(0, Math.min(grid.width - 1, this.position.x + dx)),
      y: Math.max(0, Math.min(grid.height - 1, this.position.y + dy))
    };
    this.gameState.set('exploration.facing', facing);
    const moved=!this.isCollision(next);
    if (moved) this.position = next;
    this.persistExploration();
    this.view.move(this.position, facing, { blocked: this.isCollision(next) });
    if(moved&&this.roamingEnemies.checkPlayer(this.position))return true;
    if(moved&&this.activateEnterTrigger())return true;
    this.refreshInteraction();
    return moved;
  }

  activateEnterTrigger(){
    const trigger=(this.scene?.triggers??[]).find((item)=>item.activation==='enter'&&item.position.x===this.position.x&&item.position.y===this.position.y);
    if(!trigger)return false;
    if(trigger.once&&this.gameState.get(`flags.triggers.${trigger.id}`))return false;
    if(trigger.once)this.gameState.set(`flags.triggers.${trigger.id}`,true);
    if(trigger.type==='battle'){
      const countPath=`flags.encounterCounts.${this.scene.id}`;
      const count=this.gameState.get(countPath)??0;
      const limit=this.scene.maxRandomEncounters??2;
      if(count>=limit){this.view.showMessage?.('這個區域已經恢復平靜，暫時不會再遇到小怪。');this.saveManager.save();return true;}
      this.gameState.set(countPath,count+1);this.saveManager.save();this.onEncounter?.(trigger.enemyId);return true;
    }
    if(trigger.type==='quest'){
      const message=this.onInteract?.({...trigger,source:'trigger',interaction:{kind:'quest',message:trigger.message}});
      if(message)this.view.showMessage?.(message);
      this.saveManager.save();return true;
    }
    return false;
  }
  handleRoamingEncounter(enemy){
    const countPath=`flags.encounterCounts.${this.scene.id}`;
    const count=this.gameState.get(countPath)??0;
    const limit=this.scene.maxRandomEncounters??2;
    if(count>=limit){
      this.roamingEnemies.markDefeated(enemy.id);
      this.gameState.set('playerMovementLocked',false);
      this.view.showMessage?.('這個區域已經恢復平靜，暫時不會再遇到小怪。');
      return;
    }
    this.gameState.set(countPath,count+1);this.saveManager.save();
    const launch=()=>this.onEncounter?.(enemy.encounterId,{roamingEnemyId:enemy.id,enemyType:enemy.enemyType});
    if(this.view.transition)this.view.transition(launch);else launch();
  }

  interact() {
    if (!this.scene || this.gameState.get('playerMovementLocked') || this.gameState.get('mode') !== GAME_MODE.EXPLORATION) return false;
    const target = this.currentInteraction ?? this.refreshInteraction();
    if (!target) return false;
    if (target.source === 'entity') {
      const message = this.onInteract?.(target, this.scene);
      if (message) this.view.showMessage?.(message);
    } else if (target.type === 'exit') {
      const conditionMet=this.meetsCondition(target);
      if(conditionMet){const destination=this.resolveDestination(target);const options={position:destination.targetPosition??null,direction:destination.targetDirection??null};this.gameState.set('playerMovementLocked',true);if(this.view.transition)this.view.transition(()=>this.enter(destination.to,options));else this.enter(destination.to,options);}else this.view.showMessage?.(target.lockedMessage??'目前無法進入。');
    }
    else if (target.type === 'puzzle') this.onPuzzle?.(target.puzzleId);
    else if (target.type === 'boss') {
      const conditionMet = this.meetsCondition(target);
      if (conditionMet) this.onEncounter?.(target.bossId);
      else this.view.showMessage?.(target.lockedMessage ?? '無法進入。');
    }
    return true;
  }

  refreshInteraction() {
    const facing = this.gameState.get('exploration.facing') ?? 'down';
    this.currentInteraction = this.scene ? InteractionSystem.findTarget(this.scene, this.position, facing) : null;
    if(this.currentInteraction?.interaction?.kind!=='talk'&&this.currentInteraction?.interaction?.requiredFlag&&!this.gameState.get(`flags.${this.currentInteraction.interaction.requiredFlag}`))this.currentInteraction=null;
    this.gameState.set('exploration.interactionTargetId', this.currentInteraction?.id ?? null);
    const destination=this.currentInteraction?.type==='exit'?this.resolveDestination(this.currentInteraction):null;
    const prompt = this.currentInteraction?.interaction?.prompt ?? destination?.prompt ?? this.currentInteraction?.prompt ?? '';
    this.view.setInteraction?.(prompt, this.currentInteraction?.id ?? null);
    return this.currentInteraction;
  }

  get grid() { return this.scene?.grid ?? { width: 6, height: 4 }; }
  meetsCondition(target){const single=!target.condition||this.gameState.get(`flags.${target.condition.flag}`)===target.condition.equals;const anyFlags=target.requiredAnyFlags??[];return single&&(!anyFlags.length||anyFlags.some((flag)=>this.gameState.get(`flags.${flag}`)));}
  resolveDestination(target){
    const alternate=target.destinationWhen;
    if(alternate&&this.gameState.get(`flags.${alternate.flag}`)===alternate.equals)return {...target,...alternate};
    return target;
  }
  isValidPosition(position) {
    return position && Number.isInteger(position.x) && Number.isInteger(position.y)
      && position.x >= 0 && position.y >= 0 && position.x < this.grid.width && position.y < this.grid.height;
  }
  isCollision(position) { const interactionFront=(this.scene?.entities??[]).some((entity)=>{const fronts=entity.interaction?.frontPositions??(entity.interaction?.frontPosition?[entity.interaction.frontPosition]:[]);return fronts.some((front)=>front.x===position.x&&front.y===position.y);});if(interactionFront)return false;return (this.scene?.collisions ?? []).some((point) => point.x === position.x && point.y === position.y) || (this.scene?.collisionRects ?? []).some((rect)=>position.x>=rect.x&&position.x<rect.x+rect.width&&position.y>=rect.y&&position.y<rect.y+rect.height) || (this.scene?.entities ?? []).some((entity) => ['npc','object'].includes(entity.type) && entity.position.x === position.x && entity.position.y === position.y); }
  persistExploration() {
    this.gameState.set(`exploration.mapPositions.${this.scene.id}`, this.position);
    this.saveManager.save();
  }
}
