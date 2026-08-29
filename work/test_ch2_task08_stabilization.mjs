import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';
import { canCharacterSeePost } from '../js/echo/EchoVisibility.js';
import { evaluateGroupPhotoConflict } from '../js/echo/EchoConsent.js';
import { migrateGameState } from '../js/managers/SaveManager.js';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const json=(path,key)=>JSON.parse(read(path))[key];
const scenes=json('data/scenes.json','scenes');
const quests=json('data/quests.json','quests');
const game=read('js/core/Game.js');
const community=scenes.find((item)=>item.id==='ch2_community_event');
const quest=quests.find((item)=>item.id==='ch2_explore_event');
const stage=(id)=>quest.stages.find((item)=>item.id===id);

const canonical=[
  ['travel_to_event','前往社區活動會場。'],['find_mio','在活動會場找到 MIO。'],['go_photo_spot','和 MIO 去拍照區看看。'],
  ['post_photo_explore','繼續逛逛活動會場。'],['report_mio_consequence','回去告訴 MIO 剛才發生的事。'],['act2_activity_area','前往活動區。'],
  ['act2_reflection_complete','繼續逛逛活動。'],['group_photo','和大家去拍合照。'],['prepare_to_leave','準備離開。']
];
for(const [id,objective] of canonical)assert.equal(stage(id).objective,objective,id);
assert.doesNotMatch(game,/advance\('ch2_explore_event','(?:find_kai|meet_kai|meet_rin)'/,'deprecated KAI/RIN quests must not be advanced');
assert.doesNotMatch(game,/dialogue\?\.id==='ch2_consent_foreshadow'[\s\S]{0,180}questManager\.advance/,'optional foreshadow must not redirect mainline');

for(const characterId of ['mio','rin','kai'])assert.equal(community.entities.filter((item)=>item.characterId===characterId).length,1,`${characterId} must have one canonical entity`);
assert.equal(community.entities.some((item)=>item.id==='ch2_mio_meeting'),false);
assert.equal(community.entities.find((item)=>item.id==='ch2_rin').interaction.dialogueWhenFlagId,undefined);
assert.equal(community.entities.filter((item)=>item.id==='ch2_online_follower').length,1);

class Save { constructor(state){this.state=state;} save(){this.snapshot=structuredClone(this.state.get());} }
class View { open(session,handlers){this.session=structuredClone(session);this.handlers=handlers;} close(){} notify(){} }
const state=new GameState();const save=new Save(state);const view=new View();const echo=new EchoManager({gameState:state,saveManager:save,view});
echo.open({id:'photo01',mode:'POST',photo:'CH2-MIO-PHOTO-01',caption:'PHOTO01',taggableCharacters:[{id:'mio'}],location:{value:'CURRENT_LOCATION'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'}});echo.toggleTag('mio');const photo01=echo.publish();
for(const key of ['contentId','caption','taggedCharacters','location','timing','audience','status'])assert.ok(Object.hasOwn(photo01,key),`PHOTO01 ${key}`);
echo.open({id:'photo02',mode:'POST',photo:'CH2-MIO-PHOTO-02',caption:'PHOTO02',taggableCharacters:[{id:'rin'}],location:{value:'GENERAL_AREA'},audience:{value:'SELECTED'},contacts:[{id:'mio'},{id:'rin'}]});echo.toggleTag('rin');echo.toggleSelected('mio');const photo02=echo.publish();
for(const key of ['contentId','caption','taggedCharacters','location','audience','selectedAudience','status'])assert.ok(Object.hasOwn(photo02,key),`PHOTO02 ${key}`);
assert.equal(canCharacterSeePost({...photo02,audience:'PUBLIC'},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...photo02,audience:'FRIENDS'},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...photo02,audience:'SELECTED',selectedAudience:['rin']},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...photo02,audience:'SELECTED',selectedAudience:['mio'],taggedCharacters:['rin']},'rin',{friendIds:['rin']}),false);
assert.equal(canCharacterSeePost({...photo02,audience:'PRIVATE',taggedCharacters:['rin']},'rin',{friendIds:['rin']}),false);

for(const audience of ['FRIENDS','SELECTED','PRIVATE'])assert.equal(evaluateGroupPhotoConflict({status:'POSTED',deleted:false,audience},true),null);
assert.equal(evaluateGroupPhotoConflict({status:'POSTED',deleted:false,audience:'PUBLIC'},true),'public_preference');
assert.equal(evaluateGroupPhotoConflict({status:'POSTED',deleted:false,audience:'PRIVATE'},false),'no_ask');
assert.equal(evaluateGroupPhotoConflict({status:'DRAFT',deleted:false,audience:'PUBLIC'},false),null);

echo.open({id:'group',mode:'POST',photo:'CH2-GROUP-PHOTO-01',caption:'GROUP',audience:{value:'PUBLIC'},allowSave:false});const group=echo.publish();
const beforeKeep=structuredClone(group);assert.deepEqual(state.get('echo.posts').find((post)=>post.id==='group'),beforeKeep,'Keep Post must require no mutation');
echo.open({id:'repair',editPostId:'group',mode:'POST',photo:'CH2-GROUP-PHOTO-01',audience:{value:'PUBLIC'},contacts:[{id:'rin'}],allowSave:false});echo.select('audience','PRIVATE');const changed=echo.publish();assert.equal(changed.audience,'PRIVATE');assert.equal(state.get('echo.posts').filter((post)=>post.id==='group').length,1);
const reloaded=migrateGameState(JSON.parse(JSON.stringify(state.get())));assert.equal(reloaded.echo.posts.find((post)=>post.id==='group').audience,'PRIVATE');
assert.equal(echo.deletePost('group'),true);const deletedReload=migrateGameState(JSON.parse(JSON.stringify(state.get())));assert.equal(deletedReload.echo.posts.find((post)=>post.id==='group').status,'DELETED');

const checkpoints=['before_ping','after_ping','before_travel','community_entered','before_mio','after_mio','mio_moving','before_photo01','after_photo01','inside_echo01','after_photo01_post','post_photo_explore','before_delayed','notification_ready','notification_visible','reaction_viewed','looking_mio_eligible','looking_mio_seen','report_mio','act1_resolved','act2_announcement_ready','act2_announcement_shown','act2_activity_quest','act2_npc_movement','before_photo02','after_photo02','after_rin_branch','after_act2_reflection','before_group_announcement','group_announcement_shown','group_photo_quest','before_group_photo','group_photo_taken','before_consent','ask_first','direct_echo','group_audience','conflict_active','repair_menu','change_audience','delete_post','keep_post','act3_complete','prepare_to_leave'];
assert.equal(checkpoints.length,44);
for(const checkpoint of checkpoints){const checkpointState=new GameState();checkpointState.set('flags.task08Checkpoint',checkpoint);const saved=JSON.parse(JSON.stringify(checkpointState.get()));const restored=migrateGameState(saved);assert.equal(restored.flags.task08Checkpoint,checkpoint);}

assert.match(game,/ch2Act3Complete',true[\s\S]*prepare_to_leave/);
assert.doesNotMatch(game,/ch2Act3Complete',true[\s\S]{0,220}(startBoss|FINAL|ending)/);
console.log('TASK 08 PRE-BOSS STABILIZATION: PASS (44 checkpoints)');
