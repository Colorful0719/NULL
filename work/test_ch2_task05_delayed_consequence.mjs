import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PhoneManager } from '../js/managers/PhoneManager.js';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const json=(path)=>JSON.parse(read(path));
const game=read('js/core/Game.js');
const phoneCss=read('css/phone.css');
const input=read('js/managers/InputManager.js');
const dialogues=json('data/dialogues.json').dialogues;
const choices=json('data/choices.json').choices;
const quests=json('data/quests.json').quests;
const scenes=json('data/scenes.json').scenes;
const dialogue=(id)=>dialogues.find((item)=>item.id===id);

assert.match(game,/ch2PostPhotoFreeExplore',true/,'PHOTO01 must restore free exploration');
assert.match(game,/post_photo_explore/);
assert.match(JSON.stringify(quests),/繼續逛逛活動會場/);
assert.match(game,/recordCh2PostPhotoExplorationStep/);
assert.match(game,/steps>=12/,'active exploration fallback must exist');
assert.match(game,/count===1\)this\.makeCh2EchoReactionAvailable/,'one meaningful action must enable the reaction');
assert.doesNotMatch(game,/setTimeout\([^)]*ch2EchoReaction/,'reaction must not rely on a fixed timer');

const flags={ch2EchoReactionAvailable:true,ch2EchoReactionSeen:false};
const state={get(path){return path.startsWith('flags.')?flags[path.slice(6)]:undefined;},set(path,value){if(path.startsWith('flags.'))flags[path.slice(6)]=value;}};
const calls=[];
const view={bind(actions){this.actions=actions;},showNotification(payload){calls.push(['notify',payload]);},hideNotification(){calls.push(['hide']);},close(){calls.push(['close']);}};
const phone=new PhoneManager({gameState:state,saveManager:{save(){}},view,onOpen:()=>calls.push(['open']),onEchoReaction:()=>calls.push(['reaction'])});
phone.presentEchoReactionNotification();
assert.equal(calls[0][0],'notify');
assert.equal(calls.some(([id])=>id==='reaction'),false,'notification must not auto-open ECHO');
phone.open();
assert.equal(calls.some(([id])=>id==='reaction'),true,'PLAYER can manually open the reaction');
assert.match(phoneCss,/not\(\[data-game-mode="exploration"\]\).*phone-notification/,'notification must hide over non-exploration UI');

assert.match(dialogue('ch2_act1_consequence_current_now').lines.map((line)=>line.text).join(' '),/今天那個活動/);
assert.match(dialogue('ch2_act1_consequence_general_now').lines.map((line)=>line.text).join(' '),/附近/);
const noneNow=dialogue('ch2_act1_consequence_none_now').lines.map((line)=>line.text).join(' ');
assert.match(noneNow,/沒有加位置|背景/);
assert.doesNotMatch(noneNow,/就在.*地點|地址顯示/);
const later=dialogue('ch2_act1_consequence_later').lines.map((line)=>line.text).join(' ');
assert.match(later,/草稿|沒有發布/);
assert.doesNotMatch(later,/現在就在|還在現場/);

assert.match(game,/record\?\.status==='POSTED'.*act1LocationMode'\)==='current'.*act1Timing'\)==='now'/s,'only actual CURRENT + NOW posts may take the high route');
assert.match(game,/ch2LowerConsequencePending/);
assert.ok(dialogue('ch2_act1_lower_mio'));
assert.ok(dialogue('ch2_act1_lower_mio_draft'));
assert.match(game,/completeCh2Act1Consequence\('lower'\)/);
assert.match(game,/completeCh2Act1Consequence\('high'\)/);

const scene=scenes.find((item)=>item.id==='ch2_community_event');
const kai=scene.entities.find((item)=>item.id==='ch2_kai');
const follower=scene.entities.find((item)=>item.id==='ch2_online_follower');
const booth=scene.entities.find((item)=>item.id==='ch2_game_reward_booth');
assert.ok(kai&&!kai.interaction.hiddenUntilFlag,'KAI remains physically present');
assert.equal(kai.interaction.dialogueWhenReadyId,'ch2_kai_reward_booth');
assert.ok(booth.interaction.hiddenUntilFlag==='ch2KaiRewardBoothMentioned');
assert.match(game,/recordCh2PostPhotoWorldAction\('kai-greeting'\)/);
assert.match(game,/recordCh2PostPhotoWorldAction\('reward-booth'\)/);
assert.doesNotMatch(dialogue('ch2_kai_reward_booth').lines.map((line)=>line.text).join(' '),/主線|任務|一定要/);
assert.equal(follower.interaction.hiddenUntilFlag,'ch2LookingForMioEligible');
assert.equal(follower.interaction.hiddenWhenFlag,'mioFollowerEncountered');
assert.ok(follower.roaming.destination,'Looking-for-MIO must enter through roaming architecture');

const followerDialogue=dialogue('ch2_optional_follower_current_now');
assert.equal(followerDialogue.choices.length,3);
for(const id of followerDialogue.choices){const choice=choices.find((item)=>item.id===id);assert.ok(choice);assert.equal(choice.next.id,'ch2_looking_for_mio_after_response');assert.doesNotMatch(`${choice.label} ${choice.resultText}`,/正確|錯誤|安全|危險|好|壞/);}
assert.match(dialogue('ch2_looking_for_mio_after_response').lines.map((line)=>line.text).join(' '),/根本不認識 MIO.*跟 MIO 說/s);
assert.match(dialogue('ch2_report_to_mio').lines.map((line)=>line.text).join(' '),/有看過妳的 ECHO/);
assert.match(game,/mioFollowerEncountered',true/);
assert.match(game,/ch2Act1ConsequenceResolved',true/);

const completion=game.slice(game.indexOf('completeCh2Act1Consequence('),game.indexOf('resumeFromState()'));
assert.doesNotMatch(completion,/advance\('ch2_explore_event','act2_explore'/,'Task 05 must stop at the ACT1 boundary');
assert.doesNotMatch(game,/advance\('ch2_explore_event','find_kai'|advance\('ch2_explore_event','meet_kai'/,'legacy KAI quests must not be active');
assert.ok(scene.entities.find((item)=>item.id==='ch2_act2_photo_booth')?.interaction.requiredFlag==='ch2Act2BridgeComplete','ACT2 remains reachable through the Task 06 bridge after canonical ACT1 completion');
assert.ok(scene.entities.find((item)=>item.id==='ch2_group_photo_area')?.interaction.requiredFlag==='ch2Act3AnnouncementComplete','ACT3 remains reachable after its bridge');
assert.match(input,/onTouchInteractPointerDown[\s\S]*requestInteraction\('touch'\)/,'touch interaction must share the canonical interaction handler');
assert.match(input,/onTouchMovePointerDown[\s\S]*moveFromButton/,'touch movement must remain available');

console.log('TASK 05 FOCUSED TEST: PASS');
