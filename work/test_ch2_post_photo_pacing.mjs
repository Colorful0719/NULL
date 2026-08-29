import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const scene=read('data/scenes.json').scenes.find((item)=>item.id==='ch2_community_event');
const quest=read('data/quests.json').quests.find((item)=>item.id==='ch2_explore_event');
const dialogues=read('data/dialogues.json').dialogues;
const source=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');

assert.equal(scene.triggers.some((item)=>item.id==='ch2_act1_fast_consequence'),false);
assert.equal(scene.entities.find((item)=>item.id==='ch2_online_follower').interaction.hiddenUntilFlag,'ch2LookingForMioEligible');
assert.deepEqual(scene.entities.find((item)=>item.id==='ch2_kai').interaction.dialogueWhenAllFlags,['ch2PhotoCaptured','ch2Act1EchoDecided']);
assert.equal(quest.stages.find((item)=>item.id==='observe_consequence').objective,'繼續在會場走走，看看發布後的變化。');
assert(!JSON.stringify(quest).includes('去集合點附近找 KAI'));
assert.match(source,/ch2PostPhotoWorldActions/);
assert.match(source,/timing==='later'\?'ch2_act1_consequence_later'/);
assert.match(source,/dialogue\?\.id==='ch2_report_to_mio'[\s\S]*completeCh2Act1Consequence\('high'\)/);
const kai=dialogues.find((item)=>item.id==='ch2_kai_reward_booth');
assert.equal(kai.lines[0].text,'欸，你也逛到這邊啦。');
assert(!JSON.stringify(kai).includes('你來得正好'));
console.log('CH2 POST-PHOTO NARRATIVE PACING: PASS');
