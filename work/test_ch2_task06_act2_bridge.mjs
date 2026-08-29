import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canCharacterSeePost} from '../js/echo/EchoVisibility.js';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const data=(path,key)=>JSON.parse(read(path))[key];
const dialogues=data('data/dialogues.json','dialogues');
const quests=data('data/quests.json','quests');
const scenes=data('data/scenes.json','scenes');
const game=read('js/core/Game.js');
const dialogue=(id)=>dialogues.find((item)=>item.id===id);
const community=scenes.find((item)=>item.id==='ch2_community_event');
const act2Quest=quests.find((item)=>item.id==='ch2_explore_event');

assert.match(game,/ch2Act2BridgePending',true/,'ACT1 resolution must stage the bridge');
assert.match(dialogue('ch2_act2_bridge').lines.map((line)=>line.text).join(' '),/下一場活動即將開始，有興趣的參加者可以往活動區移動。/);
assert.equal(act2Quest.stages.find((stage)=>stage.id==='act2_activity_area').objective,'前往活動區。');
assert.match(game,/ch2Act2BridgeComplete',true[\s\S]*act2_activity_area/);
assert.doesNotMatch(game,/ch2Act2BridgeComplete',true[\s\S]{0,200}mapManager\.enter/,'bridge must not teleport the PLAYER');

assert.equal(community.entities.filter((item)=>item.id==='ch2_mio').length,1);
assert.equal(community.entities.filter((item)=>item.id==='ch2_rin').length,1);
const rin=community.entities.find((item)=>item.id==='ch2_rin');
assert.deepEqual(rin.position,{x:16,y:10});
assert.equal(rin.interaction.requiredFlag,'ch2Act2BridgeComplete');
assert.equal(rin.interaction.dialogueWhenReadyId,'ch2_rin_activity_wait');
assert.match(game,/prepareAct2CharacterMovement/);
assert.match(game,/destination:\{x:18,y:9\}/,'existing MIO must walk toward the activity area');

const booth=community.entities.find((item)=>item.id==='ch2_act2_photo_booth');
assert.equal(booth.interaction.requiredFlag,'ch2Act2BridgeComplete');
assert.equal(booth.interaction.eventId,'ch2_act2_photo_post');
assert.ok(dialogue('ch2_act2_activity_arrival'));
assert.ok(dialogue('ch2_act2_photo_preview'));
assert.equal(dialogue('ch2_act2_photo_preview').environmentImage,'assets/images/ch2/echo/ch2_mio_photo_02.png');
assert.ok(fs.statSync(new URL('../assets/images/ch2/echo/ch2_mio_photo_02.png',import.meta.url)).size>1000);
assert.match(game,/photo:'CH2-MIO-PHOTO-02'/);
assert.match(game,/taggableCharacters:this\.photo01TaggableCharacters\(\)/);
assert.match(game,/audience:\{value:'FRIENDS'\}/);
assert.match(game,/act2SelectedAudience',\[\.\.\.\(record\.selectedAudience\?\?\[\]\)\]/);

const base={status:'POSTED',deleted:false,taggedCharacters:[]};
assert.equal(canCharacterSeePost({...base,audience:'PUBLIC'},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...base,audience:'FRIENDS'},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...base,audience:'SELECTED',selectedAudience:['rin']},'rin',{friendIds:['rin']}),true);
assert.equal(canCharacterSeePost({...base,audience:'SELECTED',selectedAudience:['mio','kai'],taggedCharacters:['rin']},'rin',{friendIds:['rin']}),false);
assert.equal(canCharacterSeePost({...base,audience:'PRIVATE',taggedCharacters:['rin']},'rin',{friendIds:['rin']}),false);
assert.equal(canCharacterSeePost({...base,status:'DRAFT',audience:'PUBLIC'},'rin',{friendIds:['rin']}),false);

const routes=['ch2_act2_rin_public','ch2_act2_rin_friends','ch2_act2_rin_selected_visible','ch2_act2_rin_selected_hidden','ch2_act2_rin_private'];
for(const id of routes){const item=dialogue(id);assert(item,`missing ${id}`);assert.match(item.lines.map((line)=>line.text).join(' '),/後面/);assert.doesNotMatch(JSON.stringify(item),/正確|錯誤|安全|危險|推薦|最佳|Privacy Score|Risk Score/);}
assert.doesNotMatch(JSON.stringify(dialogue('ch2_act2_rin_selected_hidden')),/我看到你發|我滑到|有人回你的貼文/);
assert.doesNotMatch(JSON.stringify(dialogue('ch2_act2_rin_private')),/我看到你發|我滑到|有人回你的貼文/);
assert.match(game,/photo02RinCanSee\(\).*canCharacterSeePost/s);
assert.match(game,/ch2_act2_rin_reflection/);
assert.match(dialogue('ch2_act2_rin_reflection').lines.map((line)=>line.text).join(' '),/如果那個是我的話.*先知道這張照片會被放去哪裡.*所以我才說，如果是我的話/s);
assert.match(game,/ch2Act2ReflectionComplete',true[\s\S]*ch2Act2Complete',true[\s\S]*act2_reflection_complete/);
assert.equal(act2Quest.stages.find((stage)=>stage.id==='act2_reflection_complete').objective,'繼續逛逛活動。');
assert.doesNotMatch(game,/ch2Act2ReflectionComplete',true[\s\S]{0,250}act3_share/,'GROUP PHOTO must not auto-start');
assert.equal(community.entities.find((item)=>item.id==='ch2_group_photo_area').interaction.requiredFlag,'ch2Act3AnnouncementComplete','ACT3 must remain gated behind its natural bridge');

console.log('TASK 06 ACT1→ACT2 BRIDGE + AUDIENCE VISIBILITY: PASS');
