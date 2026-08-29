import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../js/core/Game.js';
import { GameState } from '../js/core/GameState.js';
import { GuidanceManager } from '../js/managers/GuidanceManager.js';

const scenes=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8')).scenes;
const quests=JSON.parse(fs.readFileSync(new URL('../data/quests.json',import.meta.url),'utf8')).quests;
const state=new GameState();
state.set('quests.ch1_album_path',{status:'active',stageId:'speak_parent_after_album',completedStages:[]});
state.set('flags.ch1Complete',true);
state.set('chapter','CH1_COMPLETE');
const calls=[];
const game=Object.create(Game.prototype);
game.state=state;
game.data={scenes};
game.saveManager={save(){calls.push('save');}};
game.questManager={start(id){calls.push('start:'+id);},advance(id,stage){calls.push('advance:'+id+':'+stage);}};
game.mapManager={assetCache:{preloadScene(scene){calls.push('preload:'+scene.id);return Promise.resolve(true);}},enter(id){calls.push('enter:'+id);state.set('sceneId',id);},view:{showMessage(message){calls.push('message:'+message);}}};
game.guidanceManager={onExploration(){}};

game.startCh2OpeningScene();
assert.equal(state.get('flags.ch1Complete'),true);
assert.equal(state.get('flags.ch2Started'),undefined);
assert.equal(state.get('flags.ch2OpeningSceneActive'),true);
assert.equal(state.get('chapter'),'CH2_SHARE');
assert.equal(state.get('sceneId'),'home_map');
assert.equal(state.get('quests.ch1_album_path.status'),'completed');
assert(calls.includes('preload:ch2_community_event'));
assert(calls.includes('enter:home_map'));

game.completeOpeningPing();
assert(calls.includes('start:ch2_explore_event'));
assert(calls.includes('advance:ch2_explore_event:travel_to_event'));

game.completeCh2Arrival();
assert.equal(state.get('flags.ch2Started'),true);
assert.equal(state.get('flags.ch2ArrivedAtEvent'),true);
assert(calls.includes('advance:ch2_explore_event:find_mio'));

const guideState=new GameState();
guideState.set('flags.ch2Started',true);
guideState.set('flags.ch2ArrivedAtEvent',true);
guideState.set('quests.ch2_explore_event',{status:'active',stageId:'find_mio',completedStages:['travel_to_event']});
const guide=new GuidanceManager({gameState:guideState,saveManager:{save(){}},view:{},scenes});
assert.equal(guide.openingQuest().objective,'在活動會場找到 MIO。');

const openingState=new GameState();
openingState.set('flags.ch1Complete',true);
const openingLines=[];
let openingComplete=false;
const openingGuide=new GuidanceManager({gameState:openingState,saveManager:{save(){}},view:{openIntro(line,index,total,handlers){openingLines.push({line,index,total,handlers});},closeIntro(){}},scenes});
openingGuide.startChapter2Opening({onComplete:()=>{openingComplete=true;}});
assert.equal(openingState.get('flags.ch2Started'),undefined);
for(let index=0;index<5;index++)openingLines.at(-1).handlers.onContinue();
assert.equal(openingComplete,true);
assert(openingLines.some((entry)=>entry.line==='CHAPTER 02\nSHARE\n分享'));

assert(fs.readFileSync(new URL('../js/views/ChapterSummaryView.js',import.meta.url),'utf8').includes("this.menu.textContent='前往下一章'"));
assert.equal(quests.find((quest)=>quest.id==='ch2_explore_event').stages[0].id,'travel_to_event');
console.log('CH1 -> CH2 OPENING/PING/TRAVEL: PASS');
