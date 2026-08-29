import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { PhoneManager } from '../js/managers/PhoneManager.js';
import { PING_REPLIES } from '../js/views/PhoneView.js';

class FakeView {
  bind(callbacks){this.callbacks=callbacks;}
  showNotification(){this.notification=true;}
  hideNotification(){this.notification=false;}
  open(reply){this.opened=true;this.reply=reply;}
  close(){this.opened=false;}
}

for(const reply of Object.keys(PING_REPLIES)){
  const state=new GameState();const view=new FakeView();let completed=0;let closed=0;
  const manager=new PhoneManager({gameState:state,saveManager:{save(){}},view,onComplete:()=>completed++,onClose:()=>closed++});
  manager.presentNotification();
  assert.equal(view.notification,true,'PING 通知必須可見');
  assert.equal(view.opened,undefined,'通知不得自動開啟 Phone');
  manager.open();
  assert.equal(view.opened,true,'PLAYER 必須能手動開啟 Phone');
  assert.equal(state.get('playerMovementLocked'),true,'Phone 由 Game onOpen 鎖定；manager 不建立第二套輸入邏輯');
  manager.selectReply(reply);
  assert.equal(state.get('flags.ch2PingReply'),reply);
  assert.equal(state.get('flags.ch2PingCompleted'),true);
  assert.equal(state.get('flags.ch2TravelToEventAvailable'),true);
  assert.equal(PING_REPLIES[reply].mio.at(-1).includes('找我'),true);
  assert.equal(completed,1,'回覆只完成一次');
  manager.selectReply(reply);
  assert.equal(completed,1,'完成後不得重複回覆');
  manager.close();assert.equal(closed,1);
}

const scenes=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8')).scenes;
const neighborhood=scenes.find((scene)=>scene.id==='neighborhood');
const exit=neighborhood.triggers.find((item)=>item.id==='neighborhood_to_ch2_community_event');
assert.equal(exit.condition.flag,'ch2TravelToEventAvailable','活動會場出口必須由 PING 完成解鎖');
const ch2=scenes.find((scene)=>scene.id==='ch2_community_event');
assert.equal(ch2.triggers.find((item)=>item.id==='ch2_start_explore').stageId,'find_mio','抵達後不得覆蓋回舊任務');

const quests=JSON.parse(fs.readFileSync(new URL('../data/quests.json',import.meta.url),'utf8')).quests;
const stages=quests.find((quest)=>quest.id==='ch2_explore_event').stages;
assert.equal(stages.find((stage)=>stage.id==='travel_to_event').objective,'前往社區活動會場。');
assert.equal(stages.find((stage)=>stage.id==='find_mio').objective,'在活動會場找到 MIO。');

const gameSource=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
assert.match(gameSource,/onComplete:\(\)=>this\.mapManager\.view\.transition\(\(\)=>this\.startCh2OpeningScene\(\)\)/);
assert.doesNotMatch(gameSource,/onComplete:\(\)=>this\.mapManager\.view\.transition\(\(\)=>this\.startCh2\(\)\)/);
assert.match(gameSource,/completeCh2Arrival\(\)/);

console.log('CH2 TASK 02 OPENING/PING/TRAVEL: PASS');
