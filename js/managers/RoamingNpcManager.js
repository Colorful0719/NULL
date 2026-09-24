import { GAME_MODE } from '../core/GameMode.js';

const DIRECTIONS=Object.freeze([
  {id:'down',dx:0,dy:1},{id:'left',dx:-1,dy:0},
  {id:'right',dx:1,dy:0},{id:'up',dx:0,dy:-1}
]);
const randomBetween=(min,max)=>Math.round(min+Math.random()*(max-min));
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const shuffled=(items)=>items.map((value)=>({value,sort:Math.random()})).sort((a,b)=>a.sort-b.sort).map(({value})=>value);

export class RoamingNpcManager {
  constructor({gameState,view,saveManager,isCollision,onPositionChange,onApproach}){
    this.gameState=gameState;this.view=view;this.saveManager=saveManager;this.isCollision=isCollision;this.onPositionChange=onPositionChange;this.onApproach=onApproach;
    this.scene=null;this.npcs=[];this.timer=null;
  }

  enter(scene){
    this.stop();this.scene=scene;this.npcs=[];this.syncVisibleNpcs();
    if((scene.entities??[]).some((entity)=>entity.roaming)){this.timer=setInterval(()=>this.tick(Date.now()),140);this.timer?.unref?.();}
  }

  syncVisibleNpcs(){
    for(const entity of this.scene?.entities??[]){
      if(!entity.roaming||this.npcs.some((npc)=>npc.entity.id===entity.id)||!this.isVisible(entity))continue;
      const saved=this.gameState.get(`flags.roamingNpcs.${entity.id}`)??{};
      if(Number.isInteger(saved.x)&&Number.isInteger(saved.y)){entity.position.x=saved.x;entity.position.y=saved.y;}
      const now=Date.now(),roaming=entity.roaming;
      this.npcs.push({entity,direction:saved.direction??roaming.direction??'down',state:'IDLE',frame:1,walkFrame:0,target:null,path:[],nextActionAt:now+this.idleDuration(roaming),nextStepAt:0,pausedUntil:0});
      this.refreshFronts(entity);
      this.view.updateRoamingNpc?.(entity,{direction:saved.direction??roaming.direction??'down',state:'IDLE',frame:1});
    }
  }

  tick(now){
    this.syncVisibleNpcs();
    if(!this.scene||this.gameState.get('mode')!==GAME_MODE.EXPLORATION||this.gameState.get('playerMovementLocked'))return;
    for(const npc of this.npcs){
      if(!this.isVisible(npc.entity))continue;
      if(this.handleRecognition(npc,this.playerPosition(),now)){this.update(npc);continue;}
      if(!this.isActive(npc.entity)){this.update(npc);continue;}
      if(now<npc.pausedUntil){this.update(npc);continue;}
      const player=this.playerPosition();
      if(this.shouldFollow(npc,player))this.follow(npc,player,now);
      else if(npc.state==='IDLE'&&now>=npc.nextActionAt)this.beginWalk(npc,now);
      else if(npc.state==='WALK'){
        if(!npc.path.length&&now>=npc.nextStepAt)this.beginIdle(npc,now);
        else if(now>=npc.nextStepAt)this.stepTowardTarget(npc,now);
      }else if(npc.state==='FOLLOW'&&now>=npc.nextActionAt)this.beginIdle(npc,now);
      this.update(npc);
    }
  }

  idleDuration(roaming){return randomBetween(roaming.idleDuration?.min??1500,roaming.idleDuration?.max??4000);}
  beginWalk(npc,now){const route=this.chooseRoute(npc.entity);if(!route){this.beginIdle(npc,now,700);return;}npc.target={...route.at(-1)};npc.path=route;npc.state='WALK';npc.walkFrame=0;npc.frame=0;npc.nextStepAt=now;}
  beginIdle(npc,now,minimum=0){npc.state='IDLE';npc.frame=1;npc.walkFrame=0;npc.target=null;npc.path=[];npc.nextActionAt=now+Math.max(minimum,this.idleDuration(npc.entity.roaming));}
  chooseRoute(entity){const roaming=entity.roaming,area=roaming.roamArea,points=[];if(roaming.destination)points.push(roaming.destination);else if(roaming.roamAnchors?.length)points.push(...roaming.roamAnchors.filter((point)=>distance(entity.position,point)>=3));else if(area)for(let y=area.y;y<area.y+area.height;y++)for(let x=area.x;x<area.x+area.width;x++)if(distance(entity.position,{x,y})>=3)points.push({x,y});else{const home=roaming.home??entity.position,radius=roaming.roamRadius??3;for(let y=home.y-radius;y<=home.y+radius;y++)for(let x=home.x-radius;x<=home.x+radius;x++)if(distance(home,{x,y})<=radius&&distance(entity.position,{x,y})>=3)points.push({x,y});}for(const target of shuffled(points)){if(this.isBlocked(entity,target))continue;const route=this.findRoute(entity,target);if(route?.length)return route;}return null;}
  findRoute(entity,target){const start=entity.position,queue=[start],visited=new Map([[`${start.x},${start.y}`,null]]);while(queue.length){const current=queue.shift();if(current.x===target.x&&current.y===target.y){const route=[];let cursor=current;while(cursor&&!(cursor.x===start.x&&cursor.y===start.y)){route.unshift(cursor);cursor=visited.get(`${cursor.x},${cursor.y}`);}return route;}for(const direction of DIRECTIONS){const next={x:current.x+direction.dx,y:current.y+direction.dy},key=`${next.x},${next.y}`;if(visited.has(key)||!this.inRoamArea(entity,next)||this.isBlocked(entity,next))continue;visited.set(key,current);queue.push(next);}}return null;}
  isBlocked(entity,point){return this.isCollision(point,entity.id)||this.isReserved(point,entity.id);}
  stepTowardTarget(npc,now,delay=null){const next=npc.path[0];if(!next)return false;const dx=next.x-npc.entity.position.x,dy=next.y-npc.entity.position.y;npc.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');if(this.isBlocked(npc.entity,next)){this.beginIdle(npc,now,700);return false;}npc.nextStepAt=now+(delay??npc.entity.roaming.movementSpeed??520);npc.entity.position={...next};npc.path.shift();const frames=[0,1,2,1];npc.frame=frames[npc.walkFrame%frames.length];npc.walkFrame+=1;if(!npc.path.length&&npc.entity.roaming.completeFlag)this.gameState.set(`flags.${npc.entity.roaming.completeFlag}`,true);this.refreshFronts(npc.entity);this.persist(npc);this.onPositionChange?.();return true;}
  step(npc,now,delay=null){
    const direction=DIRECTIONS.find((item)=>item.id===npc.direction)??DIRECTIONS[0];
    const next={x:npc.entity.position.x+direction.dx,y:npc.entity.position.y+direction.dy};
    npc.nextStepAt=now+(delay??npc.entity.roaming.movementSpeed??520);
    if(!this.inRoamArea(npc.entity,next)||this.isCollision(next,npc.entity.id)||this.isReserved(next,npc.entity.id)){this.beginIdle(npc,now);return false;}
    npc.entity.position={...next};const frames=[0,1,2,1];npc.frame=frames[npc.walkFrame%frames.length];npc.walkFrame+=1;this.refreshFronts(npc.entity);this.persist(npc);this.onPositionChange?.();return true;
  }

  shouldFollow(npc,player){const follow=npc.entity.roaming.follow;if(!follow||!player||this.gameState.get(`flags.${follow.completeFlag}`))return false;return (follow.requiredFlags??[]).every((flag)=>Boolean(this.gameState.get(`flags.${flag}`)))&&distance(npc.entity.position,player)<= (follow.noticeRadius??5);}
  follow(npc,player,now){
    const gap=distance(npc.entity.position,player);
    if(gap<=1){npc.state='IDLE';npc.frame=1;npc.direction=this.faceToward(npc.entity.position,player);npc.pausedUntil=now+700;return;}
    if(now<npc.nextStepAt)return;
    npc.state='FOLLOW';
    const dx=player.x-npc.entity.position.x,dy=player.y-npc.entity.position.y;
    const preferred=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    const alternate=Math.abs(dx)>=Math.abs(dy)?(dy<0?'up':'down'):(dx<0?'left':'right');
    npc.direction=preferred;if(!this.step(npc,now,npc.entity.roaming.follow.stepMs??420)){npc.direction=alternate;this.step(npc,now,npc.entity.roaming.follow.stepMs??420);}
  }

  handleRecognition(npc,player,now){
    const recognition=npc.entity.roaming?.recognition;if(!recognition||!player||this.gameState.get(`flags.${recognition.completeFlag}`))return false;
    if(!(recognition.requiredFlags??[]).every((flag)=>Boolean(this.gameState.get(`flags.${flag}`))))return false;
    const recognized=Boolean(this.gameState.get(`flags.${recognition.recognitionFlag}`));
    if(!recognized){
      if(distance(npc.entity.position,player)>(recognition.radius??6))return false;
      this.gameState.set(`flags.${recognition.recognitionFlag}`,true);this.saveManager?.save();
      this.view.showNpcRecognition?.(npc.entity,900);
    }
    if(this.gameState.get(`flags.${recognition.dialogueStartedFlag}`))return true;
    if(distance(npc.entity.position,player)<=(recognition.conversationDistance??1)){
      npc.state='IDLE';npc.frame=1;npc.path=[];npc.target=null;npc.direction=this.faceToward(npc.entity.position,player);
      this.gameState.set(`flags.${recognition.dialogueStartedFlag}`,true);this.persist(npc);this.onApproach?.(npc.entity,recognition);return true;
    }
    if(now<npc.nextStepAt)return true;
    const route=this.routeToConversation(npc.entity,player,recognition.conversationDistance??1);
    if(!route.length){npc.state='IDLE';npc.frame=1;npc.nextStepAt=now+300;return true;}
    npc.path=route;npc.state='FOLLOW';this.stepTowardTarget(npc,now,recognition.stepMs??420);return true;
  }

  routeToConversation(entity,player,conversationDistance){
    const candidates=[];
    for(let y=player.y-conversationDistance;y<=player.y+conversationDistance;y++)for(let x=player.x-conversationDistance;x<=player.x+conversationDistance;x++){
      const point={x,y};if(distance(point,player)!==conversationDistance||this.isBlocked(entity,point))continue;
      const route=this.findRoute(entity,point);if(route.length)candidates.push(route);
    }
    return candidates.sort((a,b)=>a.length-b.length)[0]??[];
  }

  pause(id,player){const npc=this.npcs.find((item)=>item.entity.id===id);if(!npc)return;const now=Date.now();npc.state='IDLE';npc.frame=1;npc.walkFrame=0;npc.target=null;npc.path=[];npc.direction=this.faceToward(npc.entity.position,player);npc.pausedUntil=now+900;npc.nextActionAt=npc.pausedUntil+this.idleDuration(npc.entity.roaming);this.update(npc);}
  faceToward(from,to){const dx=to.x-from.x,dy=to.y-from.y;return Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
  refreshFronts(entity){if(!entity.interaction)return;const {x,y}=entity.position;entity.interaction.frontPositions=[{x,y:y+1,facing:'up'},{x:x-1,y,facing:'right'},{x:x+1,y,facing:'left'},{x,y:y-1,facing:'down'}];}
  update(npc){this.view.updateRoamingNpc?.(npc.entity,npc);}
  playerPosition(){return this.gameState.get(`exploration.mapPositions.${this.scene.id}`);}
  inRoamArea(entity,point){const roaming=entity.roaming,area=roaming.navigationArea??roaming.roamArea;if(area)return point.x>=area.x&&point.x<area.x+area.width&&point.y>=area.y&&point.y<area.y+area.height;return distance(point,roaming.home??entity.position)<=(roaming.roamRadius??3);}
  isReserved(point,id){return (this.scene.entities??[]).some((entity)=>entity.id!==id&&entity.position.x===point.x&&entity.position.y===point.y)||(this.scene.triggers??[]).some((trigger)=>trigger.position.x===point.x&&trigger.position.y===point.y);}
  isVisible(entity){const interaction=entity.interaction??{};return (interaction.visibleWhenAllFlags??[]).every((flag)=>this.gameState.get(`flags.${flag}`))&&(!interaction.hiddenUntilFlag||this.gameState.get(`flags.${interaction.hiddenUntilFlag}`))&&(!interaction.hiddenWhenFlag||!this.gameState.get(`flags.${interaction.hiddenWhenFlag}`));}
  isActive(entity){const roaming=entity.roaming??{};return (roaming.requiredFlags??[]).every((flag)=>Boolean(this.gameState.get(`flags.${flag}`)))&&(!roaming.completeFlag||!this.gameState.get(`flags.${roaming.completeFlag}`));}
  persist(npc){this.gameState.set(`flags.roamingNpcs.${npc.entity.id}`,{x:npc.entity.position.x,y:npc.entity.position.y,direction:npc.direction});if(npc.entity.roaming.persistSteps)this.saveManager?.save();}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
