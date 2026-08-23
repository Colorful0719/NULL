import { GAME_MODE } from '../core/GameMode.js';

const DIRECTIONS=Object.freeze([
  {id:'down',dx:0,dy:1,row:0},{id:'left',dx:-1,dy:0,row:1},
  {id:'right',dx:1,dy:0,row:2},{id:'up',dx:0,dy:-1,row:3}
]);
const randomBetween=(min,max)=>Math.round(min+Math.random()*(max-min));

export class RoamingEnemyManager {
  constructor({gameState,view,saveManager,isCollision,onEncounter}){
    this.gameState=gameState;this.view=view;this.saveManager=saveManager;this.isCollision=isCollision;this.onEncounter=onEncounter;
    this.scene=null;this.enemies=[];this.timer=null;
  }

  enter(scene){
    this.stop();this.scene=scene;
    this.enemies=(scene.roamingEnemies??[]).filter((enemy)=>!this.isDefeated(enemy)).map((definition)=>this.restore(definition));
    this.view.renderRoamingEnemies?.(this.enemies);if(this.enemies.length){this.timer=setInterval(()=>this.tick(Date.now()),120);this.timer?.unref?.();}
  }

  restore(definition){
    const saved=this.gameState.get(`flags.roamingEnemies.${definition.id}`)??{};
    return {...definition,x:Number.isInteger(saved.x)?saved.x:definition.spawnX,y:Number.isInteger(saved.y)?saved.y:definition.spawnY,
      direction:saved.direction??definition.direction??'down',state:'IDLE',frame:1,nextActionAt:Date.now()+randomBetween(definition.idleDuration?.min??500,definition.idleDuration?.max??2000),nextStepAt:0,walkUntil:0};
  }

  tick(now){
    if(!this.scene||this.gameState.get('mode')!==GAME_MODE.EXPLORATION||this.gameState.get('playerMovementLocked'))return;
    for(const enemy of this.enemies){
      const player=this.playerPosition();
      if(player&&this.canSeePlayer(enemy,player))this.beginChase(enemy,now,player);
      else if(enemy.state==='CHASE')this.beginIdle(enemy,now);
      else if(enemy.state==='IDLE'&&now>=enemy.nextActionAt)this.beginWalk(enemy,now);
      else if(enemy.state==='WALK'){
        if(now>=enemy.walkUntil){this.beginIdle(enemy,now);continue;}
        if(now>=enemy.nextStepAt)this.step(enemy,now);
      }
      this.view.updateRoamingEnemy?.(enemy);
    }
  }

  beginWalk(enemy,now){const direction=DIRECTIONS[Math.floor(Math.random()*DIRECTIONS.length)];enemy.direction=direction.id;enemy.state='WALK';enemy.frame=0;enemy.walkUntil=now+randomBetween(enemy.moveDuration?.min??800,enemy.moveDuration?.max??2500);enemy.nextStepAt=now;}
  beginChase(enemy,now,player){
    enemy.state='CHASE';
    if(now<enemy.nextStepAt)return;
    const dx=player.x-enemy.x,dy=player.y-enemy.y;
    enemy.direction=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    this.step(enemy,now,enemy.chaseStepMs??260);
  }
  beginIdle(enemy,now){enemy.state='IDLE';enemy.frame=1;enemy.nextActionAt=now+randomBetween(enemy.idleDuration?.min??500,enemy.idleDuration?.max??2000);this.persist(enemy);}

  step(enemy,now,stepDelay=null){
    const direction=DIRECTIONS.find((item)=>item.id===enemy.direction)??DIRECTIONS[0];
    const next={x:enemy.x+direction.dx,y:enemy.y+direction.dy};enemy.nextStepAt=now+(stepDelay??enemy.movementSpeed??360);
    if(!this.inRoamArea(enemy,next)||this.isCollision(next)||this.isReserved(next,enemy)){this.beginIdle(enemy,now);return false;}
    enemy.x=next.x;enemy.y=next.y;enemy.frame=(enemy.frame+1)%3;this.persist(enemy);
    if(this.playerTouches(next))this.encounter(enemy);
    return true;
  }

  checkPlayer(position){if(this.isImmune())return false;const enemy=this.enemies.find((item)=>item.x===position.x&&item.y===position.y);if(!enemy)return false;this.encounter(enemy);return true;}
  encounter(enemy){if(this.isImmune()||this.gameState.get('playerMovementLocked'))return false;enemy.state='IDLE';this.gameState.set('playerMovementLocked',true);this.view.updateRoamingEnemy?.(enemy);this.onEncounter?.(enemy);return true;}
  playerTouches(position){const player=this.gameState.get(`exploration.mapPositions.${this.scene.id}`);return player?.x===position.x&&player?.y===position.y;}
  playerPosition(){return this.gameState.get(`exploration.mapPositions.${this.scene.id}`);}
  canSeePlayer(enemy,player){
    if(this.isImmune()||!player)return false;
    const dx=player.x-enemy.x,dy=player.y-enemy.y,distance=Math.abs(dx)+Math.abs(dy);
    if(distance===0||distance>(enemy.detectionRadius??4)||(dx!==0&&dy!==0))return false;
    const stepX=Math.sign(dx),stepY=Math.sign(dy);
    for(let x=enemy.x+stepX,y=enemy.y+stepY;x!==player.x||y!==player.y;x+=stepX,y+=stepY){
      if(this.isCollision({x,y}))return false;
    }
    return this.inRoamArea(enemy,player);
  }
  isImmune(){return Date.now()<(this.gameState.get('flags.encounterImmunityUntil')??0);}
  inRoamArea(enemy,point){const area=enemy.roamArea;if(area)return point.x>=area.x&&point.x<area.x+area.width&&point.y>=area.y&&point.y<area.y+area.height;return Math.abs(point.x-enemy.spawnX)+Math.abs(point.y-enemy.spawnY)<=(enemy.roamRadius??3);}
  isReserved(point,current){return this.enemies.some((enemy)=>enemy!==current&&enemy.x===point.x&&enemy.y===point.y)||(this.scene.triggers??[]).some((trigger)=>trigger.position.x===point.x&&trigger.position.y===point.y);}
  isDefeated(enemy){return enemy.respawnPolicy!=='RESPAWN'&&Boolean(this.gameState.get(`flags.enemyDefeated.${enemy.id}`));}
  persist(enemy){this.gameState.set(`flags.roamingEnemies.${enemy.id}`,{x:enemy.x,y:enemy.y,direction:enemy.direction,state:enemy.state});this.saveManager.save();}
  markDefeated(id){this.gameState.set(`flags.enemyDefeated.${id}`,true);this.enemies=this.enemies.filter((enemy)=>enemy.id!==id);this.view.removeRoamingEnemy?.(id);this.saveManager.save();}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
