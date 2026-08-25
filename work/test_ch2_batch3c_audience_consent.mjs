import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';

const json=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scenes=json('data/scenes.json').scenes;
const dialogues=json('data/dialogues.json').dialogues;
const choices=json('data/choices.json').choices;
const quests=json('data/quests.json').quests;
const community=scenes.find((scene)=>scene.id==='ch2_community_event');
assert(community);

for(const id of ['ch2_act2_photo_booth','ch2_consent_foreshadow','ch2_group_photo_area','ch2_rin'])assert(community.entities.some((item)=>item.id===id),id);
for(const id of ['ch2_act2_consequence_east','ch2_act2_consequence_south','ch2_act3_consequence_east','ch2_act3_consequence_west'])assert(community.triggers.some((item)=>item.id===id),id);
for(const id of ['ch2_act2_photo_intro','ch2_act2_consequence_public','ch2_act2_consequence_friends','ch2_act2_consequence_selected','ch2_act2_consequence_private','ch2_consent_foreshadow','ch2_act2_meet_rin','ch2_act3_group_photo_choice','ch2_act3_consent_preferences','ch2_act3_consent_conflict','ch2_act3_no_conflict','ch2_act3_repair_changed','ch2_act3_repair_deleted','ch2_act3_repair_kept'])assert(dialogues.some((item)=>item.id===id),id);
for(const id of ['ch2_consent_ask_first','ch2_consent_continue','ch2_consent_change_audience','ch2_consent_delete_post','ch2_consent_keep_post'])assert(choices.some((item)=>item.id===id),id);
const stages=quests.find((quest)=>quest.id==='ch2_explore_event').stages.map((stage)=>stage.id);
for(const id of ['act2_explore','act2_photo','act2_consequence','meet_rin','group_photo','act3_share','act3_repair','prepare_to_leave'])assert(stages.includes(id),id);

const gameSource=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
for(const token of ['CH2-MIO-PHOTO-02','CH2-GROUP-PHOTO-01','act2SelectedAudience','groupPhotoExposed','consentConflictUnresolved','changeAudience(postId','deletePost(this.state'])assert(gameSource.includes(token),token);
assert(gameSource.includes("allowSave:false"));

const state=new GameState();
const view={open(){},close(){},notify(){}};
const saveManager={save(){}};
const manager=new EchoManager({gameState:state,saveManager,view});
manager.open({id:'group-test',mode:'POST',photo:'CH2-GROUP-PHOTO-01',audience:'SELECTED',contacts:[{id:'rin',label:'RIN'}],selectedAudience:['rin'],allowSave:false});
assert.equal(manager.saveForLater(),null);
const record=manager.publish();
assert.equal(record.audience,'SELECTED');
assert.deepEqual(record.selectedAudience,['rin']);
assert.equal(manager.changeAudience('group-test','PRIVATE'),true);
assert.equal(manager.history()[0].audience,'PRIVATE');
assert.equal(manager.deletePost('group-test'),true);
assert.equal(manager.history()[0].deleted,true);

console.log('BATCH 3C DATA/FLOW: PASS');
console.log('AUDIENCE POST HISTORY/REPAIR: PASS');
