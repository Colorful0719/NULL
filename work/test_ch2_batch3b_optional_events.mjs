import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameState } from '../js/core/GameState.js';
import { ChoiceManager } from '../js/managers/ChoiceManager.js';

const read=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scenes=read('data/scenes.json').scenes;
const dialogues=read('data/dialogues.json').dialogues;
const choices=read('data/choices.json').choices;
const scene=scenes.find((item)=>item.id==='ch2_community_event');
const booth=scene.entities.find((item)=>item.id==='ch2_game_reward_booth');
const follower=scene.entities.find((item)=>item.id==='ch2_online_follower');
const consequence=scene.triggers.find((item)=>item.id==='ch2_survey_delayed_consequence');
assert(booth&&follower&&consequence);
assert.equal(booth.interaction.kind,'ch2_optional');
assert.equal(follower.interaction.hiddenUntilFlag,'ch2Act1EchoDecided');
assert.equal(follower.interaction.hiddenWhenFlag,'mioFollowerEncountered');
assert.equal(consequence.type,'event');

const blocked=(position)=>scene.collisions.some((item)=>item.x===position.x&&item.y===position.y)||scene.collisionRects.some((rect)=>position.x>=rect.x&&position.x<rect.x+rect.width&&position.y>=rect.y&&position.y<rect.y+rect.height);
for(const position of [booth.interaction.frontPosition,follower.interaction.frontPosition,consequence.position])assert.equal(blocked(position),false,`optional event tile ${position.x},${position.y} must be reachable`);
assert.equal(Math.abs(booth.interaction.frontPosition.x-consequence.position.x)+Math.abs(booth.interaction.frontPosition.y-consequence.position.y),1);
const consequenceTriggers=scene.triggers.filter((item)=>item.eventId==='ch2_survey_delayed_consequence');
assert.equal(consequenceTriggers.length,3);
for(const trigger of consequenceTriggers)assert.equal(blocked(trigger.position),false);

for(const id of ['ch2_optional_survey_promo','ch2_optional_survey_intro','ch2_optional_survey_name','ch2_optional_survey_email','ch2_optional_survey_phone','ch2_optional_survey_birthday','ch2_optional_survey_school','ch2_optional_survey_account','ch2_optional_survey_complete','ch2_optional_follower_current_now','ch2_optional_follower_general_now','ch2_optional_follower_none_now','ch2_optional_follower_later','ch2_optional_follower_ask_mio','ch2_optional_mio_exact_consequence'])assert(dialogues.some((item)=>item.id===id),`missing dialogue ${id}`);

const state=new GameState();const manager=new ChoiceManager(state);
const apply=(id)=>manager.apply(choices.find((item)=>item.id===id));
apply('ch2_survey_reward_skin');apply('ch2_survey_begin');
for(const id of ['ch2_survey_name_skip','ch2_survey_email_skip','ch2_survey_phone_skip','ch2_survey_birthday_skip','ch2_survey_school_skip','ch2_survey_account_skip'])apply(id);
assert.equal(state.get('flags.surveyRewardType'),'skin');
assert.equal(state.get('flags.surveySkipSchool'),true);
apply('ch2_follower_ask_first');
assert.equal(state.get('flags.mioLocationResponse'),'ask_first');
assert.equal(state.get('flags.mioLocationShared'),false);
assert.equal(state.get('flags.mioConsentAsked'),true);

const source=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
const stateSources=source+JSON.stringify(choices);
for(const token of ['surveyDiscovered','surveyCompleted','surveyRewardType','surveyDataShared','surveyOptionalFieldsSkipped','surveyRewardReceived','surveyThirdPartyContact','mioFollowerEncountered','mioLocationResponse','mioLocationShared','mioConsentAsked'])assert(stateSources.includes(token),`missing state ${token}`);
for(const forbidden of ['setTimeout(180)','privacy score','SAFE / UNSAFE'])assert(!source.includes(forbidden));
const ch2Quest=read('data/quests.json').quests.find((item)=>item.id==='ch2_explore_event');
assert(!JSON.stringify(ch2Quest).includes('surveyCompleted'));
assert(!JSON.stringify(ch2Quest).includes('mioFollowerEncountered'));
console.log('CH2 BATCH 3B OPTIONAL EVENTS: PASS');
