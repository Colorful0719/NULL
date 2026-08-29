import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const characters=JSON.parse(fs.readFileSync(path.join(root,'data','characters.json'),'utf8')).characters;
const updated=['player','parent','kai','mio','rin','photo_keeper'];
const expressions=['neutral','happy','sad','nervous','surprised','angry','thinking','determined'];

function pngDimensions(buffer){
  assert.equal(buffer.toString('ascii',1,4),'PNG');
  return{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),colorType:buffer[25]};
}

for(const characterId of updated){
  const character=characters[characterId];
  assert(character,'missing character '+characterId);
  assert.equal(Object.keys(character.portraits).length,8);
  for(const expression of expressions){
    const asset=character.portraits[expression];
    assert(asset.endsWith('.png'),characterId+' '+expression+' must use canonical PNG');
    assert(!asset.endsWith('.webp'));
    const absolute=path.join(root,...asset.split('/'));
    assert(fs.existsSync(absolute),'missing '+asset);
    const dimensions=pngDimensions(fs.readFileSync(absolute));
    assert.deepEqual(dimensions,{width:384,height:512,colorType:6},asset+' must be 384x512 RGBA PNG');
  }
}

const dialogueFiles=['dialogues.json','act3_dialogues.json','boss_dialogues.json','environment_dialogues.json'];
const used=[];
function visit(value){
  if(Array.isArray(value)){value.forEach(visit);return;}
  if(!value||typeof value!=='object')return;
  if(updated.includes(value.speakerId)&&value.expression)used.push([value.speakerId,value.expression]);
  if(updated.includes(value.characterId)&&value.expression)used.push([value.characterId,value.expression]);
  Object.values(value).forEach(visit);
}
for(const file of dialogueFiles)visit(JSON.parse(fs.readFileSync(path.join(root,'data',file),'utf8')));
for(const [characterId,expression] of used)assert(characters[characterId].portraits[expression],characterId+' missing '+expression);

const config=fs.readFileSync(path.join(root,'data','characters.json'),'utf8');
for(const characterId of updated)assert(!config.includes('assets/characters/'+characterId+'/portraits/neutral.webp'));

console.log('PORTRAIT ASSET UPDATE: PASS');
console.log('CANONICAL PNG ASSETS: 48/48');
console.log('DIALOGUE EXPRESSION REFERENCES:',used.length);
