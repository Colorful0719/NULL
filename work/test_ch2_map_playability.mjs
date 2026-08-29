import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {MapManager} from '../js/managers/MapManager.js';

const data=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8'));
const scene=data.scenes.find((item)=>item.id==='ch2_community_event');
assert(scene,'CH2 community map must exist');

const entity=(id)=>scene.entities.find((item)=>item.id===id);
const point=(id)=>entity(id).interaction.frontPositions?.[0]??entity(id).interaction.frontPosition;
const key=({x,y})=>`${x},${y}`;
const staticBlocked=({x,y})=>scene.collisions.some((item)=>item.x===x&&item.y===y)
  ||scene.collisionRects.some((rect)=>x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height);

function reachable(start,{visibleNpcIds=[]}={}){
  const npcBlocks=new Set(visibleNpcIds.map((id)=>key(entity(id).position)));
  const queue=[start];
  const seen=new Set([key(start)]);
  while(queue.length){
    const current=queue.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const next={x:current.x+dx,y:current.y+dy};
      const nextKey=key(next);
      if(next.x<0||next.y<0||next.x>=scene.grid.width||next.y>=scene.grid.height||seen.has(nextKey)||staticBlocked(next)||npcBlocks.has(nextKey))continue;
      seen.add(nextKey);queue.push(next);
    }
  }
  return seen;
}

const routes=[
  ['SPAWN → LEFT-TOP AREA',scene.spawn,{x:4,y:4}],
  ['LEFT-TOP AREA → SPAWN',{x:4,y:4},scene.spawn],
  ['SPAWN → EVENT BOARD',scene.spawn,point('ch2_event_board')],
  ['SPAWN → EVENT MAP',scene.spawn,point('ch2_event_map')],
  ['SPAWN → MIO',scene.spawn,point('ch2_mio')],
  ['MIO → PHOTO SPOT',point('ch2_mio'),point('ch2_photo_spot')],
  ['PHOTO SPOT → MEETING POINT',point('ch2_photo_spot'),point('ch2_meeting_point')],
  ['MEETING POINT → KAI',point('ch2_meeting_point'),point('ch2_kai')],
  ['ACT 2 → RIN',point('ch2_act2_photo_booth'),point('ch2_rin')],
  ['RIN → GROUP PHOTO',point('ch2_rin'),point('ch2_group_photo_area')],
  ['GROUP PHOTO → EXIT',point('ch2_group_photo_area'),scene.triggers.find((item)=>item.id==='ch2_community_to_neighborhood').position]
];
for(const [label,start,end] of routes){
  assert(!staticBlocked(start),`${label}: start must be walkable`);
  assert(!staticBlocked(end),`${label}: destination must be walkable`);
  assert(reachable(start,{visibleNpcIds:['ch2_mio','ch2_rin','ch2_kai']}).has(key(end)),`${label}: route must remain reachable with NPC collision`);
}

for(const [leftId,rightId] of [['west_upper_stalls','center_left_stalls'],['west_lower_garden','lower_left_stalls'],['lower_right_stalls','east_rest_area']]){
  const left=scene.collisionRects.find((item)=>item.id===leftId);
  const right=scene.collisionRects.find((item)=>item.id===rightId);
  assert(right.x-(left.x+left.width)>=2,`${leftId} / ${rightId}: navigation clearance must be at least two tiles`);
}

assert.equal(entity('ch2_kai').interaction.visibleWhenAllFlags,undefined);
assert.equal(entity('ch2_kai').interaction.dialogueId,'ch2_kai_ambient_intro');
assert.deepEqual(entity('ch2_kai').interaction.dialogueWhenAllFlags,['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(entity('ch2_kai').interaction.dialogueWhenReadyId,'ch2_kai_reward_booth');
assert.equal(entity('ch2_rin').interaction.dialogueId,'ch2_rin_ambient_intro');
assert.equal(entity('ch2_rin').interaction.requiredFlag,'ch2Act2BridgeComplete');
assert.equal(entity('ch2_rin').interaction.dialogueWhenReadyId,'ch2_rin_activity_wait');
assert.equal(entity('ch2_rin').interaction.conditionalFlag,undefined,'optional foreshadow must not redirect the mainline');
assert.equal(entity('ch2_rin').interaction.dialogueWhenFlagId,undefined,'legacy RIN mainline bypass must stay inactive');
assert.equal(entity('ch2_group_photo_area').interaction.requiredFlag,'ch2Act3AnnouncementComplete');
assert.equal(entity('ch2_mio').interaction.dialogueId,'ch2_act1_mio_photo_plan');
assert.equal(entity('ch2_photo_spot').interaction.frontPositions.length,3,'PHOTO SPOT must have multiple accessible interaction tiles');
assert.equal(entity('ch2_group_photo_area').interaction.frontPositions.length,3,'left-top group photo area must have multiple exits and interaction tiles');

const state=new GameState();
state.set('flags.ch2Started',true);
state.set('flags.ch2KaiRewardBoothMentioned',true);
const interactions=[];const prompts=[];let refreshCount=0;
const view={open(){},render(){},move(){},setInteraction(prompt,id){prompts.push({prompt,id});},showMessage(){},renderRoamingEnemies(){},refreshEntityVisibility(){refreshCount+=1;}};
const manager=new MapManager({scenes:data.scenes,gameState:state,view,saveManager:{save(){}},onInteract:(target)=>{interactions.push(target.id);return'';},assetCache:{preloadNeighbors(){}}});
manager.enter(scene.id,{resetToSpawn:true});
for(const id of ['ch2_mio','ch2_rin','ch2_event_board','ch2_event_map','ch2_meeting_point','ch2_public_screen','ch2_game_reward_booth']){
  const target=entity(id);const front=point(id);manager.position={x:front.x,y:front.y};state.set('exploration.facing',front.facing);manager.refreshInteraction();
  assert.equal(manager.currentInteraction?.id,id,`${id}: prompt must resolve from a real walkable interaction tile`);
  assert.equal(manager.interact(),true,`${id}: interaction input must reach the shared handler`);
}
assert(interactions.includes('ch2_mio'),'MIO must reach real interaction callback');
assert(prompts.some((item)=>item.id==='ch2_mio'&&item.prompt),'MIO prompt must be visible');
assert.equal(Boolean(manager.isEntityVisible(entity('ch2_kai'))),true,'KAI must remain physically present before PHOTO01');
for(const flag of ['ch2PhotoCaptured','ch2Act1EchoDecided','ch2FindKaiStarted'])state.set(`flags.${flag}`,true);manager.refreshInteraction();
assert.equal(manager.isEntityVisible(entity('ch2_kai')),true,'KAI must remain visible as later story availability changes');
assert(refreshCount>1,'entity visibility must refresh after story flags change');

const allObjectBlocks=new Set(scene.entities.filter((item)=>['npc','object'].includes(item.type)).map((item)=>key(item.position)));
const realisticReachable=(start)=>{const queue=[start],seen=new Set([key(start)]);while(queue.length){const current=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:current.x+dx,y:current.y+dy},nextKey=key(next);if(next.x<0||next.y<0||next.x>=scene.grid.width||next.y>=scene.grid.height||seen.has(nextKey)||staticBlocked(next)||allObjectBlocks.has(nextKey))continue;seen.add(nextKey);queue.push(next);}}return seen;};
const fullRoute=realisticReachable(scene.spawn);
for(const destination of [{x:4,y:4},{x:4,y:5},{x:3,y:4},{x:5,y:4}])assert(fullRoute.has(key(destination)),`top-left route must reach ${key(destination)} with real object collision`);

console.log('CH2 MAP PLAYABILITY: PASS');
