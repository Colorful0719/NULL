import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(file)=>JSON.parse(fs.readFileSync(new URL(`data/${file}`,root),'utf8'));
const scenes=read('scenes.json').scenes;
const dialogues=read('dialogues.json').dialogues;
const quests=read('quests.json').quests;
const game=fs.readFileSync(new URL('js/core/Game.js',root),'utf8');

const home=scenes.find((scene)=>scene.id==='home_map');
const exit=home.triggers.find((trigger)=>trigger.id==='home_to_neighborhood');
assert.equal(exit.to,'neighborhood','CH1 home exit must remain unchanged');
assert.equal(exit.destinationWhen.flag,'ch2TravelToEventAvailable');
assert.equal(exit.destinationWhen.equals,true);
assert.equal(exit.destinationWhen.to,'ch2_community_event');
assert.deepEqual(exit.destinationWhen.targetPosition,{x:14,y:20});
assert.equal(exit.destinationWhen.targetDirection,'up');

const parent=home.entities.find((entity)=>entity.characterId==='parent');
assert.equal(parent.interaction.dialogueId,'prologue_parent_photo_01');
assert.equal(parent.interaction.dialogueWhenReadyId,'home_parent_checkin');
assert.equal(parent.interaction.dialogueWhenFlagId,'ch1_album_parent_post_battle');

const first=dialogues.find((dialogue)=>dialogue.id==='ch2_home_parent_event_first');
const repeat=dialogues.find((dialogue)=>dialogue.id==='ch2_home_parent_event_repeat');
assert.deepEqual(first.lines.map((line)=>line.text),['我等等要出去一下。','要去哪裡？','附近有活動，MIO 他們也會去。','好，別太晚回來。','知道了。']);
assert.deepEqual(repeat.lines.map((line)=>line.text),['出去玩注意安全。','好。']);
assert.match(game,/target\.characterId==='parent'.*ch2PingCompleted.*ch2TravelToEventAvailable/);
assert.match(game,/ch2HomeParentEventTalked.*ch2_home_parent_event_repeat.*ch2_home_parent_event_first/);
assert.match(game,/dialogue\?\.id==='ch2_home_parent_event_first'.*ch2HomeParentEventTalked/);

const ch2Scene=scenes.find((scene)=>scene.id==='ch2_community_event');
assert.deepEqual(ch2Scene.spawn,{x:14,y:20});
for(const id of ['mio','rin','kai'])assert.equal(ch2Scene.entities.filter((entity)=>entity.characterId===id).length,1,`${id} must remain canonical`);
const ch2Quest=quests.find((quest)=>quest.id==='ch2_explore_event');
assert.equal(ch2Quest.stages.find((stage)=>stage.id==='travel_to_event').objective,'前往社區活動會場。');
assert.equal(ch2Quest.stages.find((stage)=>stage.id==='find_mio').objective,'在活動會場找到 MIO。');
assert.match(game,/scene\.id==='ch2_community_event'.*ch2TravelToEventAvailable.*completeCh2Arrival\(\)/);
assert.match(game,/completeCh2Arrival\(\)[\s\S]*questManager\.advance\('ch2_explore_event','find_mio'\)/);
assert.doesNotMatch(game,/closeOpeningPhone\(\)[\s\S]{0,500}enter\('ch2_community_event'/,'PING close must not auto-teleport');

const roundTrip=(state)=>JSON.parse(JSON.stringify(state));
for(const flags of [
  {ch2PingCompleted:true,ch2TravelToEventAvailable:true},
  {ch2PingCompleted:true,ch2TravelToEventAvailable:true,ch2HomeParentEventTalked:true},
  {ch2Started:true,ch2ArrivedAtEvent:true,ch2HomeParentEventTalked:true}
])assert.deepEqual(roundTrip({flags,sceneId:flags.ch2ArrivedAtEvent?'ch2_community_event':'home_map'}).flags,flags);

console.log('TASK 08.1 HOME PARENT + EXIT ROUTING: PASS');
