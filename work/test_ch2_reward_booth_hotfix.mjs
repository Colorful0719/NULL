import fs from 'node:fs';

const scenes=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8')).scenes;
const map=scenes.find((scene)=>scene.id==='ch2_community_event');
const booth=map.entities.find((entity)=>entity.id==='ch2_game_reward_booth');
const kai=map.entities.find((entity)=>entity.id==='ch2_kai');
const game=fs.readFileSync(new URL('../js/core/Game.js',import.meta.url),'utf8');
const mapView=fs.readFileSync(new URL('../js/views/MapView.js',import.meta.url),'utf8');

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(booth?.landmarkId==='game_reward_booth','canonical booth landmark missing');
assert(booth?.visualBounds?.x===9&&booth.visualBounds.y===13&&booth.visualBounds.width===2&&booth.visualBounds.height===4,'canonical booth visual bounds mismatch');
assert(booth?.iconAnchor?.x===.5&&booth.iconAnchor.y===.3,'booth icon anchor mismatch');
const iconWorldX=booth.visualBounds.x+booth.visualBounds.width*booth.iconAnchor.x;
const iconWorldY=booth.visualBounds.y+booth.visualBounds.height*booth.iconAnchor.y;
assert(iconWorldX===10&&iconWorldY===14.2,'booth icon is not anchored to the actual booth beside KAI');
assert(kai?.position?.x===11&&kai.position.y===16,'KAI position changed');
assert(booth?.interaction?.frontPositions?.every(({x,y})=>x===11&&y>=13&&y<=15),'booth interaction bounds changed');
assert(booth?.interactionIcon==='assets/ui/ch2/interactions/booth.png','formal booth icon missing');
assert(booth?.closeupAsset==='assets/images/ch2/environment/ch2_game_reward_booth_bg.png','formal booth closeup missing');
assert(booth?.interaction?.hiddenUntilFlag==='ch2KaiRewardBoothMentioned','booth is not gated by KAI dialogue');
assert(booth?.interaction?.eventId==='game_reward_survey','booth lost existing reward event');
assert(kai?.interaction?.dialogueWhenReadyId==='ch2_kai_reward_booth','KAI post-PHOTO01 reward dialogue changed');
assert(game.includes("if(dialogue?.id==='ch2_kai_reward_booth')"),'KAI dialogue handler missing');
assert(game.includes("this.state.set('flags.ch2KaiRewardBoothMentioned',true)"),'KAI dialogue does not unlock canonical flag');
assert(game.includes("this.openRewardBooth();this.saveManager.save();return ''"),'booth does not open existing closeup flow');
assert(game.includes("image:'assets/images/ch2/environment/ch2_game_reward_booth_bg.png'"),'booth closeup is not rendered before survey');
assert(mapView.includes('entity.visualBounds&&entity.iconAnchor'),'icon is not derived from canonical visual bounds');
assert(fs.existsSync(new URL('../assets/ui/ch2/interactions/booth.png',import.meta.url)),'booth icon asset does not load');
assert(fs.existsSync(new URL('../assets/images/ch2/environment/ch2_game_reward_booth_bg.png',import.meta.url)),'booth background asset does not load');

console.log('CH2 REWARD BOOTH HOTFIX: PASS');
