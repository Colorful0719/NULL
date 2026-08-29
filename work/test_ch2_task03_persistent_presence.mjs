import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {MapManager} from '../js/managers/MapManager.js';

const root=new URL('../',import.meta.url);
const scenes=JSON.parse(fs.readFileSync(new URL('data/scenes.json',root),'utf8')).scenes;
const dialogues=JSON.parse(fs.readFileSync(new URL('data/dialogues.json',root),'utf8')).dialogues;
const gameSource=fs.readFileSync(new URL('js/core/Game.js',root),'utf8');
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const entity=(id)=>scene.entities.find((item)=>item.id===id);
const dialogue=(id)=>dialogues.find((item)=>item.id===id);

for(const id of ['ch2_mio','ch2_rin','ch2_kai'])assert(entity(id),`${id} must exist on first arrival`);
assert.equal(entity('ch2_kai').interaction.visibleWhenAllFlags,undefined,'KAI presence must not depend on story flags');
assert.equal(entity('ch2_rin').interaction.hiddenUntilFlag,undefined,'RIN presence must not depend on ACT 2');
assert.equal(entity('ch2_mio').interaction.dialogueId,'ch2_act1_mio_photo_plan','MIO must remain the initial story target');
assert.equal(entity('ch2_rin').interaction.dialogueId,'ch2_rin_ambient_intro');
assert.equal(entity('ch2_kai').interaction.dialogueId,'ch2_kai_ambient_intro');
assert.deepEqual(entity('ch2_kai').interaction.dialogueWhenAllFlags,['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(entity('ch2_kai').interaction.dialogueWhenReadyId,'ch2_kai_reward_booth');

const rinIntro=dialogue('ch2_rin_ambient_intro');
const kaiIntro=dialogue('ch2_kai_ambient_intro');
assert.equal(rinIntro.lines[0].text,'你也來啦。');
assert.equal(rinIntro.lines.at(-1).text,'我先去看看，等等再聊。');
assert.equal(kaiIntro.lines[0].text,'欸，你也來了。');
assert.equal(kaiIntro.lines.at(-1).text,'好啊，等等再找你。');
for(const ambient of [rinIntro,kaiIntro,dialogue('ch2_rin_wait'),dialogue('ch2_kai_ambient_repeat')]){
  const content=JSON.stringify(ambient);
  for(const forbidden of ['Reward Booth','獎勵攤位','ch2Act2','ACT 2 完成','主線任務已更新'])assert(!content.includes(forbidden),`${ambient.id} must remain ambient`);
}

const view={open(){},render(){},move(){},setInteraction(){},showMessage(){},renderRoamingEnemies(){},renderRoamingNpcs(){},refreshEntityVisibility(){}};
const makeManager=(seedFlags={})=>{
  const state=new GameState();
  state.set('quests.ch2_explore_event',{status:'active',stageId:'find_mio',completedStages:['travel_to_event']});
  for(const [flag,value] of Object.entries(seedFlags))state.set(`flags.${flag}`,value);
  const manager=new MapManager({scenes,gameState:state,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
  manager.enter(scene.id,{resetToSpawn:true});
  return {state,manager};
};

const arrival=makeManager();
for(const id of ['ch2_mio','ch2_rin','ch2_kai'])assert.equal(arrival.manager.isEntityVisible(entity(id)),true,`${id} must be visible on arrival`);
assert.equal(arrival.state.get('quests.ch2_explore_event.stageId'),'find_mio','ambient presence must not alter quest');

for(const [id,front] of [['ch2_rin',{x:16,y:11,facing:'up'}],['ch2_kai',{x:12,y:16,facing:'left'}]]){
  arrival.manager.position={x:front.x,y:front.y};arrival.state.set('exploration.facing',front.facing);arrival.manager.refreshInteraction();
  assert.equal(arrival.manager.currentInteraction?.id,id,`${id} must be interactable on first arrival`);
}

const reloaded=makeManager({ch2RinAmbientTalked:true,ch2KaiAmbientTalked:true});
for(const id of ['ch2_mio','ch2_rin','ch2_kai'])assert.equal(reloaded.manager.isEntityVisible(entity(id)),true,`${id} must remain visible after reload`);
assert.equal(reloaded.state.get('flags.ch2ConsentForeshadowSeen'),undefined,'early RIN talk must not start ACT 2');
assert.equal(reloaded.state.get('flags.ch2KaiRewardBoothMentioned'),undefined,'early KAI talk must not unlock booth');
assert.equal(reloaded.state.get('quests.ch2_explore_event.stageId'),'find_mio','reload must preserve MIO quest');

assert.match(gameSource,/ambientTalkedFlag/,'dialogue resolver must persist ambient first/repeat state');
assert.match(gameSource,/dialogueWhenAllFlags/,'dialogue resolver must separate later story availability from visibility');
assert(!gameSource.includes("if(target.id==='ch2_kai'&&!this.isKaiMeetingReady())"),'legacy KAI interaction block must be bypassed');
assert.match(gameSource,/dialogue\?\.id==='ch2_kai_reward_booth'[\s\S]*ch2KaiRewardBoothMentioned/,'later KAI reward flow must remain');
assert(dialogue('ch2_act1_mio_photo_plan'),'PHOTO01 plan dialogue must remain reachable');

const roaming=scene.entities.filter((item)=>item.type==='npc'&&item.roaming);
assert(roaming.length>0,'general NPC roaming must remain configured');
console.log('CH2 TASK 03 PERSISTENT PRESENCE: PASS');
