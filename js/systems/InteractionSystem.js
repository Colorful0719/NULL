const FACING_OFFSET = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const samePoint = (a, b) => a.x === b.x && a.y === b.y;

export class InteractionSystem {
  static findTarget(scene, playerPosition, facing = 'down') {
    const offset = FACING_OFFSET[facing] ?? FACING_OFFSET.down;
    const facedPosition = { x: playerPosition.x + offset.x, y: playerPosition.y + offset.y };
    const candidates = [];

    for (const entity of scene.entities ?? []) {
      if (!entity.interaction || entity.interaction.enabled === false) continue;
      const fronts=entity.interaction.frontPositions??(entity.interaction.frontPosition?[entity.interaction.frontPosition]:[]);
      if(fronts.length){
        const front=fronts.find((position)=>samePoint(playerPosition,position)&&facing===(position.facing??'up'));
        if(!front)continue;
        candidates.push({source:'entity',...entity,score:0});
        continue;
      }
      if(distance(playerPosition,entity.position)>1)continue;
      candidates.push({ source: 'entity', ...entity, score: samePoint(entity.position, facedPosition) ? 0 : 2 });
    }
    for (const trigger of scene.triggers ?? []) {
      if (trigger.activation !== 'interact' || distance(playerPosition, trigger.position) > 1) continue;
      const score = samePoint(trigger.position, playerPosition) ? 0 : samePoint(trigger.position, facedPosition) ? 1 : 3;
      candidates.push({ source: 'trigger', ...trigger, score });
    }
    return candidates.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))[0] ?? null;
  }
}
