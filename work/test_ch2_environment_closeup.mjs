import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ECHO_PHOTO_ASSETS,resolveEchoPhoto} from '../js/echo/EchoAssets.js';

const root=new URL('../',import.meta.url);
const read=(path)=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const scenes=read('data/scenes.json').scenes;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const board=scene.entities.find((item)=>item.id==='ch2_event_board');
const booth=scene.entities.find((item)=>item.id==='ch2_game_reward_booth');
assert.equal(board.closeupAsset,'assets/images/ch2/environment/ch2_event_board_bg.png');
assert.equal(booth.closeupAsset,'assets/images/ch2/environment/ch2_game_reward_booth_bg.png');
assert.deepEqual(board.interactionIconOffset,{x:0,y:39});
assert.deepEqual(booth.visualBounds,{x:9,y:13,width:2,height:4});
assert.deepEqual(booth.iconAnchor,{x:.5,y:.3});

const dimensions=(path)=>{const bytes=fs.readFileSync(new URL(path,root));return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};};
assert.deepEqual(dimensions(board.closeupAsset),{width:1448,height:1086});
assert.deepEqual(dimensions(booth.closeupAsset),{width:1536,height:1024});
assert.equal(ECHO_PHOTO_ASSETS['CH2-GAME-REWARD-BOOTH-BG'],'./assets/images/ch2/environment/ch2_game_reward_booth_bg.png');
assert(resolveEchoPhoto('CH2-GAME-REWARD-BOOTH-BG').src);

const game=fs.readFileSync(new URL('js/core/Game.js',root),'utf8');
for(const token of ["target.id==='ch2_event_board'","this.openRewardBooth()","this.openBonusShareOffer()","sourceEventId:'ch2_reward_bonus_share'","reward===first","this.state.get('flags.secondReward')","set('flags.rewardEventCompleted',true)"])assert(game.includes(token),`missing flow token: ${token}`);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
assert(html.includes('id="environment-closeup-screen"'));
const css=fs.readFileSync(new URL('css/survey.css',root),'utf8');
assert(css.includes('object-fit:contain'));
assert(css.includes('@media(max-width:900px),(orientation:portrait)'));
console.log('CH2 ENVIRONMENT CLOSE-UP + BONUS REWARD: PASS');
