import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameState} from '../js/core/GameState.js';
import {GAME_MODE} from '../js/core/GameMode.js';
import {RoamingNpcManager} from '../js/managers/RoamingNpcManager.js';

const root=new URL('../',import.meta.url);
const scenes=JSON.parse(fs.readFileSync(new URL('data/scenes.json',root),'utf8')).scenes;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const male=scene.entities.find((item)=>item.id==='ch2_online_follower');
const female=scene.entities.find((item)=>item.id==='ch2_roaming_female');
const pngSize=(path)=>{const bytes=fs.readFileSync(new URL(path,root));assert.equal(bytes.toString('ascii',1,4),'PNG');return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};};

const maleSize=pngSize(male.mapSprite.sheet);
assert.deepEqual(maleSize,{width:1536,height:1024});
assert.deepEqual(male.mapSprite.animation.frameOrigin,{x:384,y:0});
assert.equal(male.mapSprite.animation.frameWidth,256);
assert.equal(male.mapSprite.animation.frameHeight,256);
for(let row=0;row<4;row++)for(let column=0;column<3;column++){
  const x=384+column*256,y=row*256;
  assert(x>=0&&y>=0&&x+256<=maleSize.width&&y+256<=maleSize.height,`male frame ${column},${row} must be inside source image`);
}

const blocked=new Set();
for(const rect of scene.collisionRects)for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)blocked.add(`${x},${y}`);
for(const entity of scene.entities)if(entity.id!==female.id)blocked.add(`${entity.position.x},${entity.position.y}`);
for(const trigger of scene.triggers)blocked.add(`${trigger.position.x},${trigger.position.y}`);
const state=new GameState();state.set('mode',GAME_MODE.EXPLORATION);state.set('playerMovementLocked',false);state.set('exploration.mapPositions.ch2_community_event',{x:14,y:20});
const positions=[];
const manager=new RoamingNpcManager({gameState:state,view:{updateRoamingNpc:()=>{}},isCollision:(point)=>blocked.has(`${point.x},${point.y}`),onPositionChange:()=>positions.push({...female.position})});
manager.enter(scene);manager.stop();const npc=manager.npcs.find((item)=>item.entity.id===female.id);assert(npc);
const destinations=[{x:12,y:18},{x:14,y:11},{x:14,y:6}];
let now=1000;
for(const target of destinations){female.roaming.roamAnchors=[target];manager.beginWalk(npc,now);assert(npc.path.length>=3,`route to ${target.x},${target.y} must exist`);while(npc.path.length){now+=600;manager.stepTowardTarget(npc,now);}assert.deepEqual(female.position,target);manager.beginIdle(npc,now,0);}
assert(positions.length>=20,'female must visibly cross multiple map tiles');
assert(destinations.some((point)=>point.y<=11),'female must enter the central event area');
console.log('MALE NPC 12 SOURCE FRAMES: PASS');
console.log('FEMALE NPC 3 DESTINATIONS: PASS');
