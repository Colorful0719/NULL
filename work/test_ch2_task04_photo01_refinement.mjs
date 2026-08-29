import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';
import { RoamingNpcManager } from '../js/managers/RoamingNpcManager.js';

const readJson=(path,key)=>JSON.parse(fs.readFileSync(path,'utf8'))[key];
const dialogues=readJson('data/dialogues.json','dialogues');
const scenes=readJson('data/scenes.json','scenes');
const quests=readJson('data/quests.json','quests');
const gameSource=fs.readFileSync('js/core/Game.js','utf8');
const echoCss=fs.readFileSync('css/echo.css','utf8');
const dialogue=(id)=>dialogues.find((item)=>item.id===id);
const community=scenes.find((item)=>item.id==='ch2_community_event');
const photoSpot=scenes.find((item)=>item.id==='ch2_photo_spot');

assert.deepEqual(dialogue('ch2_act1_mio_photo_plan').lines.map(({speakerId,text})=>[speakerId,text]),[
  ['mio','你來啦！'],['player','嗯，這裡比我想像中還多人。'],['mio','對啊，我剛剛也逛了一下。'],['player','RIN 他們呢？'],['mio','RIN 剛剛好像往另一邊去了。'],['mio','等等應該會遇到她。'],['mio','對了，我剛剛看到這裡有拍照區。'],['player','拍照區？'],['mio','嗯，入口附近有一個拍照的小標誌，滿好認的。'],['mio','都來了，幫我拍一張吧。'],['player','好啊。']
]);
assert.equal(quests.find((item)=>item.id==='ch2_explore_event').stages.find((item)=>item.id==='go_photo_spot').objective,'和 MIO 去拍照區看看。');
assert.equal(community.entities.filter((item)=>item.id==='ch2_mio').length,1);
assert.equal(photoSpot.entities.filter((item)=>item.id==='ch2_photo_spot_mio').length,1);
const mio=community.entities.find((item)=>item.id==='ch2_mio');
assert.deepEqual(mio.roaming.requiredFlags,['ch2Act1MioMet']);
assert.deepEqual(mio.roaming.destination,{x:7,y:14});
assert.equal(mio.roaming.completeFlag,'ch2MioReachedPhotoSpot');
assert.equal(community.entities.find((item)=>item.id==='ch2_photo_spot').interaction.kind,'ch2_photo_spot_entry');
assert.equal(photoSpot.entities.find((item)=>item.id==='ch2_photo_spot_mio').interaction.kind,'ch2_photo_capture');
assert.match(echoCss,/echo-screen\[data-echo-stage="preview"\][^}]*[\s\S]*?object-fit:contain/);

const state=new GameState();
let opened=null;let saveCount=0;const commits=[];
const view={open(session){opened=structuredClone(session);},close(){},notify(){}};
const echo=new EchoManager({gameState:state,saveManager:{save(){saveCount+=1;}},view,onCommit:(record,session)=>commits.push({record,session})});
const config={id:'photo01-test',mode:'STORY',photo:'CH2-MIO-PHOTO-01',caption:'原始說明',taggableCharacters:[{id:'mio',label:'MIO'},{id:'rin',label:'RIN'},{id:'kai',label:'KAI'}],location:{value:'GENERAL_AREA'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},controls:{tag:{enabled:true},location:{enabled:true},timing:{enabled:true},audience:{enabled:false,locked:true}},sourceEventId:'ch2_act1_mio_story'};
echo.open(config);
assert.deepEqual(opened.taggedCharacters,[],'zero tags must be valid');
assert.equal(echo.setCaption('和朋友逛活動會場'),true);
assert.equal(echo.toggleTag('rin'),true,'a character absent from PHOTO01 must be taggable');
assert.deepEqual(opened.taggedCharacters,['rin'],'one tag must be visible');
assert.equal(echo.toggleTag('kai'),true);
assert.deepEqual(opened.taggedCharacters,['rin','kai'],'multiple tags must be supported');
assert.equal(echo.select('audience','PUBLIC'),false,'tagging must not unlock or change audience');
assert.equal(opened.audience,'FRIENDS');
assert.equal(echo.select('location','CURRENT_LOCATION'),true);
assert.equal(echo.select('timing','SHARE_NOW'),true);
const post=echo.publish();
assert.equal(post.caption,'和朋友逛活動會場');
assert.deepEqual(post.taggedCharacters,['rin','kai']);
assert.equal(post.location,'CURRENT_LOCATION');
assert.equal(post.timing,'SHARE_NOW');
assert.equal(post.audience,'FRIENDS');

echo.open({...config,id:'photo01-draft',caption:'稍後整理',taggedCharacters:['mio']});
const draft=echo.saveForLater();
assert.equal(draft.status,'DRAFT');
assert.equal(draft.caption,'稍後整理');
assert.deepEqual(draft.taggedCharacters,['mio']);
assert.equal(draft.timing,'SHARE_LATER');
assert.equal(draft.audience,'FRIENDS');
assert(saveCount>0);

const movementState=new GameState();movementState.set('mode','EXPLORATION');movementState.set('flags.ch2Act1MioMet',true);movementState.set('exploration.mapPositions.test',{x:0,y:0});
const movingEntity=structuredClone(mio);movingEntity.position={x:8,y:14};movingEntity.roaming.destination={x:7,y:14};movingEntity.roaming.navigationArea={x:5,y:5,width:21,height:18};
const movingScene={id:'test',entities:[movingEntity],triggers:[]};
const roaming=new RoamingNpcManager({gameState:movementState,saveManager:{save(){}},view:{updateRoamingNpc(){}},isCollision:()=>false,onPositionChange(){}});
roaming.scene=movingScene;roaming.syncVisibleNpcs();const npc=roaming.npcs[0];roaming.beginWalk(npc,0);roaming.stepTowardTarget(npc,0);
assert.deepEqual(movingEntity.position,{x:7,y:14});
assert.equal(movementState.get('flags.ch2MioReachedPhotoSpot'),true);

assert.deepEqual(dialogue('ch2_photo_spot_mio_request').lines.map(({text})=>text),['就是這裡。','等一下，幫我拍好看一點喔。','要求很多耶。','哪有。','好啦，站好。']);
assert.deepEqual(dialogue('ch2_photo01_post_dialogue').lines.map(({text})=>text),['這張拍得不錯耶。','妳剛剛不是還叫我拍好看一點。','所以有拍好看啊。','好啦。','走吧，再去看看其他地方。']);
assert.equal(quests.find((item)=>item.id==='ch2_explore_event').stages.find((item)=>item.id==='post_photo_explore').objective,'繼續逛逛活動會場。');
assert.match(gameSource,/ch2Photo01PostDialoguePending/);
assert.match(gameSource,/openPhoto01PostDialogue/);
assert.match(gameSource,/advance\('ch2_explore_event','post_photo_explore'\)/);
assert(!/ch2_photo01_post_dialogue[\s\S]{0,500}(openSecondRewardSelection|ch2LookingForMioEligible[^,]*true|openAct2Echo)/.test(gameSource));
assert.equal(commits.length,2);

console.log('CH2 TASK 04 PHOTO01 REFINEMENT: PASS');
