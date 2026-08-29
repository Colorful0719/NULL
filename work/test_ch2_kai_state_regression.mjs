import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {MapManager} from '../js/managers/MapManager.js';

const scenes=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8')).scenes;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const kai=scene.entities.find((item)=>item.id==='ch2_kai');
assert(kai,'canonical KAI entity must exist');
assert.equal(scene.entities.filter((item)=>item.characterId==='kai').length,1,'map must contain exactly one KAI');
assert.equal(kai.interaction.visibleWhenAllFlags,undefined);
assert.equal(kai.interaction.dialogueId,'ch2_kai_ambient_intro');
assert.deepEqual(kai.interaction.dialogueWhenAllFlags,['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(kai.interaction.dialogueWhenReadyId,'ch2_kai_reward_booth');
assert.deepEqual(kai.position,{x:11,y:16});

const view={open(){},render(){},move(){},setInteraction(){},showMessage(){},renderRoamingEnemies(){},refreshEntityVisibility(){}};
const makeManager=(flags=[])=>{const state=new GameState();for(const flag of flags)state.set(`flags.${flag}`,true);const manager=new MapManager({scenes,gameState:state,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});manager.enter(scene.id,{resetToSpawn:true});return {state,manager};};

assert.equal(makeManager().manager.isEntityVisible(kai),true,'KAI must remain physically present before photo');
assert.equal(makeManager(['ch2PhotoCaptured']).manager.isEntityVisible(kai),true,'KAI must remain ambient before ECHO completion');
const active=makeManager(['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(active.manager.isEntityVisible(kai),true,'KAI must appear after photo and ECHO');
active.manager.position={x:12,y:16};active.state.set('exploration.facing','left');active.manager.refreshInteraction();
assert.equal(active.manager.currentInteraction?.id,'ch2_kai','KAI must expose an interaction prompt from the booth-side tile');
const reload=makeManager(['ch2PhotoCaptured','ch2Act1EchoDecided','ch2Act1Complete','ch2KaiRewardBoothMentioned']);
assert.equal(reload.manager.isEntityVisible(kai),true,'KAI must remain after dialogue and reload');

const game=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
assert.match(game,/isKaiMeetingReady\(\)\{return \['ch2PhotoCaptured','ch2Act1EchoDecided'\]/);
assert.match(game,/dialogue\?\.id==='ch2_kai_reward_booth'[\s\S]*ch2KaiRewardBoothMentioned/);
console.log('CH2 KAI STORY STATE REGRESSION: PASS');
