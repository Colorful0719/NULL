import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';

const read=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scenes=read('data/scenes.json').scenes;
const quests=read('data/quests.json').quests;
const dialogues=read('data/dialogues.json').dialogues;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const quest=quests.find((item)=>item.id==='ch2_explore_event');

assert(scene&&quest,'CH2 scene and quest must exist');
assert.deepEqual(quest.stages.map((item)=>item.id),['explore_event_area','meet_mio','go_photo_spot','share_echo_story','observe_consequence','find_kai','meet_kai','act1_complete']);
for(const id of ['event_board','event_map','meeting_point'])assert(scene.entities.some((item)=>item.landmarkId===id&&item.interaction?.kind==='ch2_landmark'));
const mio=scene.entities.find((item)=>item.id==='ch2_mio');
const kai=scene.entities.find((item)=>item.id==='ch2_kai');
const spot=scene.entities.find((item)=>item.id==='ch2_photo_spot');
assert.equal(mio.interaction.dialogueId,'ch2_act1_mio_photo_plan');
assert.equal(kai.interaction.hiddenUntilFlag,'ch2KaiCanMeet');
assert.equal(kai.interaction.dialogueId,'ch2_act1_kai_meet');
assert.equal(spot.interaction.eventId,'ch2_act1_mio_story');
assert.equal(spot.interaction.requiredFlag,'ch2Act1MioMet');

const consequence=scene.triggers.find((item)=>item.id==='ch2_act1_fast_consequence');
assert(consequence&&consequence.type==='event'&&consequence.activation==='enter');
const blocked=(position)=>scene.collisions.some((item)=>item.x===position.x&&item.y===position.y)||scene.collisionRects.some((rect)=>position.x>=rect.x&&position.x<rect.x+rect.width&&position.y>=rect.y&&position.y<rect.y+rect.height);
assert.equal(blocked(spot.interaction.frontPosition),false,'photo interaction tile must be reachable');
assert.equal(blocked(consequence.position),false,'consequence trigger tile must be reachable');
assert.equal(Math.abs(spot.interaction.frontPosition.x-consequence.position.x)+Math.abs(spot.interaction.frontPosition.y-consequence.position.y),1,'consequence must trigger on progress after the photo');
const queue=[consequence.position];const seen=new Set([`${consequence.position.x},${consequence.position.y}`]);
while(queue.length){const current=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:current.x+dx,y:current.y+dy};const key=`${next.x},${next.y}`;if(next.x<0||next.y<0||next.x>=scene.grid.width||next.y>=scene.grid.height||seen.has(key)||blocked(next))continue;seen.add(key);queue.push(next);}}
assert(seen.has(`${scene.entities.find((item)=>item.id==='ch2_event_map').interaction.frontPosition.x},${scene.entities.find((item)=>item.id==='ch2_event_map').interaction.frontPosition.y}`),'unknown path must reach the event map');
assert(seen.has(`${kai.interaction.frontPosition.x},${kai.interaction.frontPosition.y}`),'known path must reach KAI');

for(const id of ['ch2_act1_mio_photo_plan','ch2_act1_consequence_current_now','ch2_act1_consequence_general_now','ch2_act1_consequence_none_now','ch2_act1_consequence_later','ch2_act1_kai_meet'])assert(dialogues.some((item)=>item.id===id),`missing dialogue ${id}`);
for(const id of ['ch2_act1_consequence_current_now','ch2_act1_consequence_general_now','ch2_act1_consequence_none_now','ch2_act1_consequence_later']){
  const dialogue=dialogues.find((item)=>item.id===id);
  assert(dialogue.conditionalPreludes.some((item)=>item.flag==='ch2EventMapKnown'&&item.equals===true));
  assert(dialogue.conditionalPreludes.some((item)=>item.flag==='ch2EventMapKnown'&&item.equals===false));
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
assert(!gameSource.includes('setTimeout(180)'));
console.log('CH2 BATCH 3A ACT 1: PASS');
