import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';
import { evaluateGroupPhotoConflict } from '../js/echo/EchoConsent.js';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const json=(path,key)=>JSON.parse(read(path))[key];
const dialogues=json('data/dialogues.json','dialogues');
const choices=json('data/choices.json','choices');
const quests=json('data/quests.json','quests');
const scenes=json('data/scenes.json','scenes');
const game=read('js/core/Game.js');
const dialogue=(id)=>dialogues.find((item)=>item.id===id);
const choice=(id)=>choices.find((item)=>item.id===id);
const community=scenes.find((item)=>item.id==='ch2_community_event');
const stages=quests.find((item)=>item.id==='ch2_explore_event').stages;

assert.match(game,/ch2Act3ExplorationSteps/);
assert.match(game,/if\(steps<10\)return/,'announcement requires exploration');
assert.match(game,/mode'\)!==GAME_MODE\.EXPLORATION\|\|this\.guidanceManager\?\.modalOpen/,'announcement must wait for non-blocking exploration');
assert.equal(dialogue('ch2_act3_announcement').lines[0].text,'（會場廣播）等等這邊要拍合照喔！');
assert.deepEqual(dialogue('ch2_act3_announcement').lines.slice(1).map((line)=>line.text),['欸，他們要拍合照了。','走啊。','妳還要拍喔？','這次又不是只有我。','走啦。']);
assert.equal(stages.find((stage)=>stage.id==='group_photo').objective,'和大家去拍合照。');
assert.doesNotMatch(game,/ch2Act2ReflectionComplete',true[\s\S]{0,300}ch2_act3_group_photo_staging/,'ACT2 reflection must not immediately start group photo');

assert.equal(community.entities.filter((item)=>item.id==='ch2_mio').length,1);
assert.equal(community.entities.filter((item)=>item.id==='ch2_rin').length,1);
assert.equal(community.entities.find((item)=>item.id==='ch2_group_photo_area').interaction.requiredFlag,'ch2Act3AnnouncementComplete');
assert.match(game,/destination:\{x:5,y:5\}/);
assert.match(game,/destination:\{x:3,y:5\}/);
assert.deepEqual(dialogue('ch2_act3_group_photo_staging').lines.map((line)=>line.text),['RIN，妳站過來一點啦。','我有啊。','再過來一點。','這樣？','對。','好了喔。','等一下等一下。','又怎樣？','……好了。','快拍啦。']);
assert.equal(dialogue('ch2_act3_group_photo_preview').visual.asset,'assets/images/ch2/echo/ch2_group_photo_01.png');
assert.equal(dialogue('ch2_act3_group_photo_preview').visual.fit,'contain');
assert.ok(fs.statSync(new URL('../assets/images/ch2/echo/ch2_group_photo_01.png',import.meta.url)).size>1000);
assert.equal(dialogue('ch2_act3_group_photo_choice').lines[0].text,'要直接發嗎？');
assert.equal(choice('ch2_consent_ask_first').label,'先問一下大家');
assert.equal(choice('ch2_consent_continue').label,'直接開 ECHO');
assert.deepEqual(dialogue('ch2_act3_consent_preferences').lines.map((line)=>line.text),['欸，這張我等等可能會發 ECHO，你們可以嗎？','可以啊。','可以。','不過不要公開就好。','好。']);
assert.match(game,/rinSharePreference','not_public'/);
assert.match(game,/taggableCharacters:this\.photo01TaggableCharacters\(\)/);
assert.match(game,/controls:\{tag:\{visible:true,enabled:true\},location:\{visible:true,enabled:true\}/);
assert.doesNotMatch(game,/rinSharePreference[\s\S]{0,200}audience:\{value:'(SELECTED|PRIVATE)'\}/,'RIN preference must not force an audience');

const posted=(audience,extra={})=>({status:'POSTED',deleted:false,audience,...extra});
assert.equal(evaluateGroupPhotoConflict(posted('FRIENDS'),true),null);
assert.equal(evaluateGroupPhotoConflict(posted('SELECTED',{selectedAudience:['mio']}),true),null);
assert.equal(evaluateGroupPhotoConflict(posted('PRIVATE'),true),null);
assert.equal(evaluateGroupPhotoConflict(posted('PUBLIC'),true),'public_preference');
for(const audience of ['PUBLIC','FRIENDS','SELECTED','PRIVATE'])assert.equal(evaluateGroupPhotoConflict(posted(audience,{selectedAudience:['rin']}),false),'no_ask');
assert.equal(evaluateGroupPhotoConflict({status:'DRAFT',deleted:false,audience:'PUBLIC'},false),null);
assert.equal(evaluateGroupPhotoConflict({status:'DELETED',deleted:true,audience:'PUBLIC'},false),null);
assert.deepEqual(dialogue('ch2_act3_consent_conflict_public').lines.map((line)=>line.text),['你不是說會先問嗎？','有啊。','可是我剛剛說不想公開。','……']);
assert.deepEqual(dialogue('ch2_act3_consent_conflict_no_ask').lines.map((line)=>line.text),['等一下，你已經發了？','嗯。','你剛剛沒有問我耶。','……']);

class Save { constructor(state){this.state=state;} save(){} }
class View { open(session,handlers){this.session=structuredClone(session);this.handlers=handlers;} close(){} notify(){} }
const state=new GameState();const view=new View();const echo=new EchoManager({gameState:state,saveManager:new Save(state),view});
echo.open({id:'group',mode:'POST',photo:'CH2-GROUP-PHOTO-01',taggableCharacters:[{id:'rin'}],controls:{tag:{visible:true},location:{visible:true},audience:{visible:true}},audience:{value:'PUBLIC'},allowSave:false});
echo.toggleTag('rin');const original=echo.publish();assert.deepEqual(original.taggedCharacters,['rin']);assert.equal(original.audience,'PUBLIC');
echo.open({id:'edit',editPostId:'group',mode:'POST',photo:'CH2-GROUP-PHOTO-01',audience:{value:'PUBLIC'},contacts:[{id:'rin'}],allowSave:false});
echo.select('audience','SELECTED');echo.toggleSelected('rin');const changed=echo.publish();assert.equal(changed.id,'group');assert.equal(state.get('echo.posts').length,1);assert.equal(changed.audience,'SELECTED');assert.deepEqual(changed.selectedAudience,['rin']);assert.deepEqual(changed.taggedCharacters,['rin']);
assert.equal(echo.deletePost('group'),true);assert.equal(state.get('echo.posts')[0].status,'DELETED');assert.equal(state.get('echo.posts')[0].deleted,true);

for(const id of ['ch2_consent_change_audience','ch2_consent_delete_post','ch2_consent_keep_post'])assert.ok(choice(id));
assert.match(game,/openAct3AudienceRepair/);
assert.match(game,/deletePost\(this\.state\.get\('flags\.groupPhotoPostId'\)\)/);
assert.match(game,/groupPhotoRepairChoice',choice\.id===/);
assert.equal(stages.find((stage)=>stage.id==='prepare_to_leave').objective,'準備離開。');
assert.match(game,/ch2Act3Complete',true[\s\S]*prepare_to_leave/);
assert.doesNotMatch(game,/ch2Act3Complete',true[\s\S]{0,200}(startBoss|startBattle|FINAL)/);

console.log('TASK 07 ACT2→GROUP PHOTO + CONSENT/REPAIR: PASS');
