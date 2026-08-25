import assert from 'node:assert/strict';
import { GameState } from '../js/core/GameState.js';
import { EchoManager } from '../js/managers/EchoManager.js';
import { ECHO_PHOTO_ASSETS } from '../js/echo/EchoAssets.js';
import { migrateGameState } from '../js/managers/SaveManager.js';

class MemorySave { constructor(state){this.state=state;this.saved=[];} save(){this.saved.push(this.state.get());} }
class FakeView { open(session,handlers){this.session=structuredClone(session);this.handlers=handlers;this.opened=true;} close(){this.opened=false;} notify(message){this.message=message;} }
const state=new GameState();const save=new MemorySave(state);const view=new FakeView();let locked=false;let restored=false;
const echo=new EchoManager({gameState:state,saveManager:save,view,onOpen:()=>locked=true,onClose:()=>restored=true});

assert.deepEqual(Object.keys(ECHO_PHOTO_ASSETS),['CH2-MIO-PHOTO-01','CH2-MIO-PHOTO-02','CH2-GROUP-PHOTO-01']);
echo.open({id:'story-1',mode:'STORY',photo:'CH2-MIO-PHOTO-01',location:{value:'GENERAL_AREA'},timing:{value:'SHARE_NOW'},audience:{value:'FRIENDS'},contacts:[{id:'mio',label:'MIO'},{id:'kai',label:'KAI'}]});
assert.equal(view.opened,true);assert.equal(view.session.mode,'STORY');assert.equal(view.session.photo.id,'CH2-MIO-PHOTO-01');assert.equal(view.session.location,'GENERAL_AREA');assert.equal(view.session.audience,'FRIENDS');assert.equal(locked,true);assert.equal(state.get('activeFlow.echo.id'),'story-1');
assert.equal(echo.select('location','CURRENT_LOCATION'),true);assert.equal(echo.select('timing','SHARE_LATER'),true);assert.equal(echo.select('audience','SELECTED'),true);assert.equal(echo.toggleSelected('mio'),true);assert.deepEqual(view.session.selectedAudience,['mio']);
const post=echo.publish();assert.equal(post.posted,true);assert.equal(post.type,'STORY');assert.equal(post.audience,'SELECTED');assert.equal(view.opened,false);assert.equal(restored,true);assert.equal(state.get('activeFlow.echo'),null);

echo.open({id:'post-1',mode:'POST',photo:'CH2-GROUP-PHOTO-01',controls:{location:{visible:false},timing:{locked:true}},audience:{value:'PUBLIC'}});
assert.equal(view.session.mode,'POST');assert.equal(view.session.controls.location.visible,false);assert.equal(echo.select('timing','SHARE_LATER'),false);const draft=echo.saveForLater();assert.equal(draft.status,'DRAFT');
assert.equal(echo.changeAudience('story-1','PRIVATE'),true);assert.equal(echo.deletePost('story-1'),true);const history=echo.history();assert.equal(history.length,2);assert.equal(history[0].deleted,true);assert.equal(history[0].audience,'PRIVATE');assert.equal(history[1].status,'DRAFT');assert.ok(echo.notifications().length>=4);assert.ok(save.saved.length>=4);
const migrated=migrateGameState({version:'0.3.0',mode:'MENU',playerMovementLocked:true});assert.equal(migrated.version,'0.4.0');assert.deepEqual(migrated.echo,{drafts:[],posts:[],notifications:[],nextOrder:1});
console.log('CH2_BATCH2_ECHO_OK');
