import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync(new URL('../data/scenes.json',import.meta.url),'utf8'));
const scene=data.scenes.find((item)=>item.id==='ch2_community_event');
assert(scene,'CH2 community map must exist');

const entity=(id)=>scene.entities.find((item)=>item.id===id);
const point=(id)=>entity(id).interaction.frontPosition;
const key=({x,y})=>`${x},${y}`;
const staticBlocked=({x,y})=>scene.collisions.some((item)=>item.x===x&&item.y===y)
  ||scene.collisionRects.some((rect)=>x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height);

function reachable(start,{visibleNpcIds=[]}={}){
  const npcBlocks=new Set(visibleNpcIds.map((id)=>key(entity(id).position)));
  const queue=[start];
  const seen=new Set([key(start)]);
  while(queue.length){
    const current=queue.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const next={x:current.x+dx,y:current.y+dy};
      const nextKey=key(next);
      if(next.x<0||next.y<0||next.x>=scene.grid.width||next.y>=scene.grid.height||seen.has(nextKey)||staticBlocked(next)||npcBlocks.has(nextKey))continue;
      seen.add(nextKey);queue.push(next);
    }
  }
  return seen;
}

const routes=[
  ['SPAWN → EVENT BOARD',scene.spawn,point('ch2_event_board')],
  ['SPAWN → EVENT MAP',scene.spawn,point('ch2_event_map')],
  ['SPAWN → MIO',scene.spawn,point('ch2_mio')],
  ['MIO → PHOTO SPOT',point('ch2_mio'),point('ch2_photo_spot')],
  ['PHOTO SPOT → MEETING POINT',point('ch2_photo_spot'),point('ch2_meeting_point')],
  ['MEETING POINT → KAI',point('ch2_meeting_point'),point('ch2_kai')],
  ['ACT 2 → RIN',point('ch2_act2_photo_booth'),point('ch2_rin')],
  ['RIN → GROUP PHOTO',point('ch2_rin'),point('ch2_group_photo_area')],
  ['GROUP PHOTO → EXIT',point('ch2_group_photo_area'),scene.triggers.find((item)=>item.id==='ch2_community_to_neighborhood').position]
];
for(const [label,start,end] of routes){
  assert(!staticBlocked(start),`${label}: start must be walkable`);
  assert(!staticBlocked(end),`${label}: destination must be walkable`);
  assert(reachable(start,{visibleNpcIds:['ch2_mio','ch2_rin','ch2_kai']}).has(key(end)),`${label}: route must remain reachable with NPC collision`);
}

for(const [leftId,rightId] of [['west_upper_stalls','center_left_stalls'],['west_lower_garden','lower_left_stalls'],['lower_right_stalls','east_rest_area']]){
  const left=scene.collisionRects.find((item)=>item.id===leftId);
  const right=scene.collisionRects.find((item)=>item.id===rightId);
  assert(right.x-(left.x+left.width)>=2,`${leftId} / ${rightId}: navigation clearance must be at least two tiles`);
}

assert.equal(entity('ch2_kai').interaction.hiddenUntilFlag,'ch2KaiCanMeet');
assert.equal(entity('ch2_kai').interaction.dialogueId,'ch2_act1_kai_meet');
assert.equal(entity('ch2_rin').interaction.dialogueId,'ch2_rin_wait');
assert.equal(entity('ch2_rin').interaction.requiredFlag,'ch2ConsentForeshadowSeen');
assert.equal(entity('ch2_rin').interaction.dialogueWhenReadyId,'ch2_act2_meet_rin');
assert.equal(entity('ch2_group_photo_area').interaction.requiredFlag,'ch2Act2Complete');
assert.equal(entity('ch2_mio').interaction.dialogueId,'ch2_act1_mio_photo_plan');

console.log('CH2 MAP PLAYABILITY: PASS');
