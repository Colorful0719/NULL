import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {MapManager} from '../js/managers/MapManager.js';

const root=new URL('../',import.meta.url);
const read=(path)=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const scenes=read('data/scenes.json').scenes;
const dialogues=read('data/dialogues.json').dialogues;
const community=scenes.find((item)=>item.id==='ch2_community_event');
const photo=scenes.find((item)=>item.id==='ch2_photo_spot');
assert(community&&photo,'both CH2 exploration maps must exist');

for(const path of ['assets/maps/ch2_photo_spot/photo_spot_map.png','assets/ui/ch2/photo_spot_camera.png','assets/images/ch2/photo_spot/photo_spot_event.png','assets/images/ch2/echo/ch2_mio_photo_01.png']){
  assert(fs.statSync(new URL(path,root)).size>1000,`${path} must be a real asset`);
}
const photoBytes=fs.readFileSync(new URL('assets/images/ch2/echo/ch2_mio_photo_01.png',root));
assert.equal(photoBytes.readUInt32BE(16),941,'official photo width must remain unchanged');
assert.equal(photoBytes.readUInt32BE(20),1672,'official photo height must remain unchanged');
assert.equal(photo.mapArt.logicalSize.width,1402);
assert.equal(photo.mapArt.logicalSize.height,1122);
assert.equal(photo.roamingEnemies.length,0,'Photo Spot must not add enemies');
assert.equal(photo.entities.find((item)=>item.id==='ch2_photo_spot_mio').interaction.kind,'ch2_photo_capture');
const back=photo.triggers.find((item)=>item.id==='ch2_photo_spot_return');
assert.equal(back.to,'ch2_community_event');
assert.deepEqual(back.targetPosition,{x:6,y:14});

const icon=community.entities.find((item)=>item.id==='ch2_photo_spot');
assert.equal(icon.image,'assets/ui/ch2/photo_spot_camera.png');
assert.equal(icon.interaction.kind,'ch2_photo_spot_entry');
const insideCollision=community.collisionRects.some((rect)=>icon.position.x>=rect.x&&icon.position.x<rect.x+rect.width&&icon.position.y>=rect.y&&icon.position.y<rect.y+rect.height);
assert.equal(insideCollision,false,'Photo Spot icon must not be placed inside collision');
assert(icon.interaction.frontPositions.some((front)=>Math.abs(front.x-icon.position.x)+Math.abs(front.y-icon.position.y)===1),'Photo Spot needs an adjacent interaction tile');
const initialTrigger=community.triggers.find((item)=>item.id==='ch2_start_explore');
const consequenceTrigger=community.triggers.find((item)=>item.id==='ch2_act1_fast_consequence');
assert(initialTrigger,'initial CH2 exploration trigger must remain');
assert.equal(consequenceTrigger,undefined,'PHOTO01 must not force an immediate map consequence trigger');

const state=new GameState();state.set('flags.ch2Started',true);
const view={open(){},render(){},move(){},setInteraction(){},showMessage(){},renderRoamingEnemies(){},refreshEntityVisibility(){}};
const manager=new MapManager({scenes,gameState:state,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
manager.enter(community.id,{resetToSpawn:true});
assert.equal(Boolean(manager.isEntityVisible(icon)),false,'Photo Spot icon must remain hidden before MIO');
state.set('flags.ch2Act1MioMet',true);
manager.refreshInteraction();
assert.equal(Boolean(manager.isEntityVisible(icon)),true,'Photo Spot icon must appear in the same map session');
manager.position={x:6,y:14};state.set('exploration.facing','left');manager.refreshInteraction();
assert.equal(manager.currentInteraction?.id,'ch2_photo_spot','Photo Spot icon must resolve through the normal interaction system');
const beforeReload=new GameState();beforeReload.set('flags.ch2Started',true);
const beforeManager=new MapManager({scenes,gameState:beforeReload,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
beforeManager.enter(community.id,{resetToSpawn:true});
assert.equal(Boolean(beforeManager.isEntityVisible(icon)),false,'reload before MIO must keep icon hidden');
const afterReload=new GameState();afterReload.set('flags.ch2Started',true);afterReload.set('flags.ch2Act1MioMet',true);
const afterManager=new MapManager({scenes,gameState:afterReload,view,saveManager:{save(){}},assetCache:{preloadNeighbors(){}}});
afterManager.enter(community.id,{resetToSpawn:true});
assert.equal(Boolean(afterManager.isEntityVisible(icon)),true,'reload after MIO must restore icon visibility');
for(const id of ['ch2_photo_spot_mio_request','ch2_photo_spot_photo_event','ch2_photo_spot_photo_preview'])assert(dialogues.some((item)=>item.id===id),`missing ${id}`);
assert.equal(dialogues.find((item)=>item.id==='ch2_photo_spot_photo_event').environmentImage,'assets/images/ch2/photo_spot/photo_spot_event.png');
assert.equal(dialogues.find((item)=>item.id==='ch2_photo_spot_photo_preview').environmentImage,'assets/images/ch2/echo/ch2_mio_photo_01.png');

const game=fs.readFileSync(new URL('js/core/Game.js',root),'utf8');
for(const token of ["kind==='ch2_photo_spot_entry'","kind==='ch2_photo_capture'","playSFX('photo_snap'","start('ch2_photo_spot_photo_preview'","sourceEventId:'ch2_act1_mio_story'","set('sceneId','ch2_community_event')","set('flags.ch2PostPhotoFreeExplore',true)"])assert(game.includes(token),`missing flow token ${token}`);
assert(game.includes("if(dialogue?.id==='ch2_act1_mio_photo_plan'){\n      this.state.set('flags.ch2Act1MioMet',true);"));
assert(game.includes("this.mapManager.view.refreshEntityVisibility?.(this.mapManager.scene);\n      this.mapManager.refreshInteraction?.();"),'MIO completion must immediately refresh map entities and interactions');
const mioPlan=dialogues.find((item)=>item.id==='ch2_act1_mio_photo_plan');
assert(mioPlan.lines.some((line)=>line.text==='嗯，入口附近有一個拍照的小標誌，滿好認的。'));
assert(mioPlan.lines.some((line)=>line.text.includes('拍照的小標誌')));
assert.equal(mioPlan.lines.at(-1).text,'好啊。');
assert(game.includes("set('exploration.mapPositions.ch2_community_event',{x:6,y:14})"),'ECHO must return to the Photo Spot entrance');
const dialogueCss=fs.readFileSync(new URL('css/dialogue.css',root),'utf8');
assert(dialogueCss.includes('width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain'),'photo preview must preserve its original aspect ratio without cropping');
console.log('CH2 PHOTO SPOT FULL INTEGRATION: PASS');
