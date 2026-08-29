import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';

const read=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scenes=read('data/scenes.json').scenes;
const quests=read('data/quests.json').quests;
const dialogues=read('data/dialogues.json').dialogues;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const photoScene=scenes.find((item)=>item.id==='ch2_photo_spot');
const quest=quests.find((item)=>item.id==='ch2_explore_event');

assert(scene&&quest,'CH2 scene and quest must exist');
for(const id of ['travel_to_event','find_mio','explore_event_area','meet_mio','go_photo_spot','share_echo_story','post_photo_explore','review_echo_reaction','talk_mio_after_echo','observe_consequence','report_mio_consequence','act1_complete'])assert(quest.stages.some((stage)=>stage.id===id),`missing ACT1 stage ${id}`);
for(const id of ['event_board','event_map','meeting_point'])assert(scene.entities.some((item)=>item.landmarkId===id&&item.interaction?.kind==='ch2_landmark'));
const mio=scene.entities.find((item)=>item.id==='ch2_mio');
const kai=scene.entities.find((item)=>item.id==='ch2_kai');
const spot=scene.entities.find((item)=>item.id==='ch2_photo_spot');
assert.equal(mio.interaction.dialogueId,'ch2_act1_mio_photo_plan');
assert.equal(kai.interaction.visibleWhenAllFlags,undefined,'KAI must remain physically present before PHOTO01');
assert.equal(kai.interaction.dialogueId,'ch2_kai_ambient_intro');
assert.deepEqual(kai.interaction.dialogueWhenAllFlags,['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(kai.interaction.dialogueWhenReadyId,'ch2_kai_reward_booth');
assert.equal(spot.interaction.kind,'ch2_photo_spot_entry');
assert.equal(spot.interaction.hiddenUntilFlag,'ch2Act1MioMet');
assert.equal(spot.interaction.hiddenWhenFlag,'ch2Act1EchoDecided');
assert(photoScene,'official Photo Spot exploration map must exist');

const blocked=(position)=>scene.collisions.some((item)=>item.x===position.x&&item.y===position.y)||scene.collisionRects.some((rect)=>position.x>=rect.x&&position.x<rect.x+rect.width&&position.y>=rect.y&&position.y<rect.y+rect.height);
const interactionFront=(target)=>target.interaction.frontPositions?.[0]??target.interaction.frontPosition;
assert.equal(blocked(interactionFront(spot)),false,'photo interaction tile must be reachable');
assert.equal(scene.triggers.some((item)=>item.id==='ch2_act1_fast_consequence'),false,'post-photo return must not force a consequence trigger');
const start={x:6,y:14};const queue=[start];const seen=new Set([`${start.x},${start.y}`]);
while(queue.length){const current=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:current.x+dx,y:current.y+dy};const key=`${next.x},${next.y}`;if(next.x<0||next.y<0||next.x>=scene.grid.width||next.y>=scene.grid.height||seen.has(key)||blocked(next))continue;seen.add(key);queue.push(next);}}
assert(seen.has(`${interactionFront(scene.entities.find((item)=>item.id==='ch2_event_map')).x},${interactionFront(scene.entities.find((item)=>item.id==='ch2_event_map')).y}`),'unknown path must reach the event map');
assert(seen.has(`${interactionFront(kai).x},${interactionFront(kai).y}`),'known path must reach KAI');

for(const id of ['ch2_act1_mio_photo_plan','ch2_photo_spot_mio_request','ch2_photo_spot_photo_event','ch2_photo_spot_photo_preview','ch2_act1_consequence_current_now','ch2_act1_consequence_general_now','ch2_act1_consequence_none_now','ch2_act1_consequence_later','ch2_act1_kai_meet'])assert(dialogues.some((item)=>item.id===id),`missing dialogue ${id}`);
for(const id of ['ch2_act1_consequence_current_now','ch2_act1_consequence_general_now','ch2_act1_consequence_none_now','ch2_act1_consequence_later']){
  const dialogue=dialogues.find((item)=>item.id===id);
  assert(dialogue.lines.length>0,`${id} must retain contextual reaction content`);
}

const state=new GameState();
const commits=[];
const view={open(){},close(){},notify(){}};
const saveManager={save(){}};
const echo=new EchoManager({gameState:state,saveManager,view,onCommit:(record,session)=>commits.push({record,session})});
echo.open({id:'act1-test',mode:'STORY',photo:'CH2-MIO-PHOTO-01',location:{value:'GENERAL_AREA'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},controls:{audience:{enabled:false,locked:true}},sourceEventId:'ch2_act1_mio_story'});
assert.equal(echo.select('audience','PUBLIC'),false,'audience must remain FRIENDS');
echo.select('location','CURRENT_LOCATION');
echo.publish();
assert.equal(commits[0].record.location,'CURRENT_LOCATION');
assert.equal(commits[0].record.timing,'SHARE_NOW');
assert.equal(commits[0].record.audience,'FRIENDS');
assert.equal(commits[0].session.sourceEventId,'ch2_act1_mio_story');

const gameSource=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
for(const value of ['CURRENT_LOCATION:\'current\'','GENERAL_AREA:\'general\'','NO_LOCATION:\'none\'','SHARE_LATER','ch2Act1Complete'])assert(gameSource.includes(value));
assert(gameSource.includes('recordCh2PostPhotoWorldAction'),'post-photo reactions must wait for meaningful world actions');
assert(gameSource.includes('completeCh2Act1Consequence'),'ACT 1 must resolve through the location/time consequence');
assert(!gameSource.includes("target.id==='ch2_kai'&&!this.isKaiMeetingReady()"),'ambient KAI interaction must remain available before PHOTO01');
assert(gameSource.includes('dialogueWhenAllFlags'),'later KAI story must use dialogue availability rather than physical visibility');
assert(!gameSource.includes("dialogue?.id==='ch2_kai_reward_booth'&&this.isKaiMeetingReady()"),'KAI reward dialogue must not be the ACT 1 completion gate');
assert(!gameSource.includes('setTimeout(180)'));
console.log('CH2 BATCH 3A ACT 1: PASS');
