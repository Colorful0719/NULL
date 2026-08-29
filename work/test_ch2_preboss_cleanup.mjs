import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {MapManager} from '../js/managers/MapManager.js';

const read=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scenes=read('data/scenes.json').scenes;
const dialogues=read('data/dialogues.json').dialogues;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const ids=['ch2_event_board','ch2_event_map','ch2_meeting_point','ch2_public_screen','ch2_game_reward_booth'];
for(const id of ids){
  const target=scene.entities.find((item)=>item.id===id);assert(target,`${id} must exist`);
  assert(target.interaction.frontPositions?.length||target.interaction.frontPosition,`${id} needs a real front interaction tile`);
  if(id!=='ch2_game_reward_booth')assert(dialogues.some((item)=>item.id===target.interaction.dialogueId),`${id} must open real content`);
}
assert.equal(scene.entities.find((item)=>item.id==='ch2_event_board').interactionIcon,'assets/ui/ch2/interactions/event_board.png','EVENT BOARD must use the formal interaction icon');

const kai=scene.entities.find((item)=>item.id==='ch2_kai');
const postPhotoReturn={x:6,y:14};
assert(Math.abs(kai.position.x-postPhotoReturn.x)+Math.abs(kai.position.y-postPhotoReturn.y)>=6,'KAI must enable outside the player reveal area');
const state=new GameState();state.set('flags.ch2Started',true);
const view={open(){},render(){},move(){},setInteraction(){},showMessage(){},renderRoamingEnemies(){},refreshEntityVisibility(){}};
const manager=new MapManager({scenes,gameState:state,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
manager.enter(scene.id,{resetToSpawn:true});
state.set('flags.ch2KaiCanMeet',true);
assert.equal(Boolean(manager.isEntityVisible(kai)),true,'persistent KAI must remain visible as an ambient NPC');
state.set('flags.ch2FindKaiStarted',true);
assert.equal(Boolean(manager.isEntityVisible(kai)),true,'story flags must not remove persistent KAI');
state.set('flags.ch2PhotoCaptured',true);
assert.equal(Boolean(manager.isEntityVisible(kai)),true,'photo progress must not remove persistent KAI');
state.set('flags.ch2Act1EchoDecided',true);
assert.equal(Boolean(manager.isEntityVisible(kai)),true,'photo, ECHO, and FIND KAI together must expose KAI');
manager.position={x:12,y:16};state.set('exploration.facing','left');manager.refreshInteraction();
assert.equal(manager.currentInteraction?.id,'ch2_kai','KAI must be interactable from a reachable tile');
assert.equal(scene.entities.filter((item)=>item.id==='ch2_kai').length,1,'KAI must not be duplicated');

const reloadState=new GameState();reloadState.set('flags.ch2Started',true);for(const flag of ['ch2PhotoCaptured','ch2Act1EchoDecided','ch2FindKaiStarted'])reloadState.set(`flags.${flag}`,true);
const reloadManager=new MapManager({scenes,gameState:reloadState,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
reloadManager.enter(scene.id,{resetToSpawn:true});
assert.equal(Boolean(reloadManager.isEntityVisible(kai)),true,'KAI must remain visible after reload');

const source=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
assert(source.includes("kind:'ch2_landmark',environment:true,overlay:true"),'landmarks must use a closable overlay and restore map exploration');
assert(source.includes("dialogue?.id==='ch2_kai_reward_booth'"),'KAI reward-booth continuation must remain handled');
const mainMio=scene.entities.find((item)=>item.id==='ch2_mio');
assert.equal(scene.entities.filter((item)=>item.id==='ch2_mio').length,1,'MIO must remain a single canonical entity');
assert(mainMio.roaming,'MIO must use the existing movement architecture');
const mioPlan=dialogues.find((item)=>item.id==='ch2_act1_mio_photo_plan');
assert(mioPlan.lines.some((line)=>line.text.includes('拍照的小標誌')),'MIO must give the current Photo Spot landmark guidance');
assert(dialogues.find((item)=>item.id==='ch2_kai_ambient_intro'),'KAI ambient presence must remain available');
console.log('CH2 PRE-BOSS CLEANUP: PASS');
