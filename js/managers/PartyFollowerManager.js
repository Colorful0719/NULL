import { GAME_MODE } from '../core/GameMode.js';

const DIRECTIONS=[
  {id:'down',dx:0,dy:1},{id:'left',dx:-1,dy:0},
  {id:'right',dx:1,dy:0},{id:'up',dx:0,dy:-1}
];
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const key=(point)=>`${point.x},${point.y}`;

export class PartyFollowerManager {
  constructor({gameState,view,saveManager,isCollision,onPositionChange}){
    this.gameState=gameState;this.view=view;this.saveManager=saveManager;this.isCollision=isCollision;this.onPositionChange=onPositionChange;
    this.scene=null;this.playerPosition=null;this.followers=[];this.timer=null;
  }

  enter(scene,playerPosition){
    this.stop();this.scene=scene;this.playerPosition={...playerPosition};this.followers=[];
    this.syncFollowers({sceneEntry:true});
    if(this.followers.length){this.timer=setInterval(()=>this.tick(Date.now()),120);this.timer?.unref?.();}
  }

  setFollower(characterId,{targetDistance=2,stepMs=320}={}){
    const previous=this.record(characterId);
    this.gameState.set(`flags.partyFollowers.${characterId}`,{...previous,active:true,targetDistance,stepMs,sceneId:this.scene?.id??previous.sceneId??null});
    this.syncFollowers();this.ensureTimer();this.saveManager?.save();
  }

  clearFollower(characterId){
    const previous=this.record(characterId);
    this.gameState.set(`flags.partyFollowers.${characterId}`,{...previous,active:false});
    const follower=this.followers.find((item)=>item.entity.characterId===characterId);
    if(follower){follower.state='IDLE';follower.frame=1;this.update(follower);}
    this.followers=this.followers.filter((item)=>item.entity.characterId!==characterId);
    if(!this.followers.length)this.stop();
    this.saveManager?.save();
  }

  isFollowing(characterId){return Boolean(this.record(characterId).active);}

  recordPlayerPosition(position){
    this.playerPosition={...position};
    for(const follower of this.followers){const last=follower.trail.at(-1);if(!last||last.x!==position.x||last.y!==position.y)follower.trail.push({...position});if(follower.trail.length>96)follower.trail.splice(0,follower.trail.length-96);}
  }

  syncFollowers({sceneEntry=false}={}){
    for(const [characterId,record] of Object.entries(this.gameState.get('flags.partyFollowers')??{})){
      if(!record?.active||this.followers.some((item)=>item.entity.characterId===characterId))continue;
      const entity=(this.scene?.entities??[]).find((item)=>item.type==='npc'&&item.characterId===characterId);
      if(!entity)continue;
      const saved=this.gameState.get(`flags.partyFollowerPositions.${characterId}`);
      if(saved&&record.sceneId===this.scene.id&&this.valid(saved)&&!this.isCollision(saved,entity.id))entity.position={x:saved.x,y:saved.y};
      const follower={entity,state:'IDLE',frame:1,walkFrame:0,direction:saved?.direction??'down',nextStepAt:0,failedRoutes:0,trail:this.playerPosition?[{...this.playerPosition}]:[]};
      this.followers.push(follower);
      if(sceneEntry&&(record.sceneId!==this.scene.id||distance(entity.position,this.playerPosition)>14))this.recoverNearPlayer(follower);
      this.gameState.set(`flags.partyFollowers.${characterId}.sceneId`,this.scene.id);
      this.refreshFronts(entity);this.update(follower);
    }
  }

  ensureTimer(){if(!this.timer&&this.followers.length){this.timer=setInterval(()=>this.tick(Date.now()),120);this.timer?.unref?.();}}

  tick(now){
    this.syncFollowers();this.ensureTimer();
    if(!this.scene||this.gameState.get('mode')!==GAME_MODE.EXPLORATION||this.gameState.get('playerMovementLocked'))return;
    for(const follower of this.followers)this.followBreadcrumb(follower,now);
  }

  followBreadcrumb(follower,now){
    const record=this.record(follower.entity.characterId),gap=record.targetDistance??2;
    if(!record.active)return;
    while(follower.trail.length>gap&&this.same(follower.entity.position,follower.trail[0]))follower.trail.shift();
    while(follower.trail.length>gap&&this.isCollision(follower.trail[0],follower.entity.id))follower.trail.shift();
    if(follower.trail.length<=gap){this.idle(follower);return;}
    if(now<follower.nextStepAt)return;
    const target=follower.trail[0],route=this.findRoute(follower.entity,target);
    if(!route.length){
      follower.failedRoutes+=1;
      if(follower.failedRoutes>=8&&distance(follower.entity.position,this.playerPosition)>14)this.recoverNearPlayer(follower);
      else this.idle(follower);
      follower.nextStepAt=now+240;return;
    }
    follower.failedRoutes=0;this.step(follower,route[0],now,record.stepMs??320);
  }

  step(follower,next,now,stepMs){
    if(this.isCollision(next,follower.entity.id)){this.idle(follower);return false;}
    const dx=next.x-follower.entity.position.x,dy=next.y-follower.entity.position.y;
    follower.direction=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    follower.state='FOLLOW';follower.nextStepAt=now+stepMs;follower.entity.position={...next};
    const frames=[0,1,2,1];follower.frame=frames[follower.walkFrame%frames.length];follower.walkFrame+=1;
    this.refreshFronts(follower.entity);this.persist(follower);this.update(follower);this.onPositionChange?.();return true;
  }

  findRoute(entity,target){
    const start=entity.position;if(this.same(start,target))return [];
    const queue=[start],visited=new Map([[key(start),null]]);
    while(queue.length){
      const current=queue.shift();
      for(const direction of DIRECTIONS){
        const next={x:current.x+direction.dx,y:current.y+direction.dy},nextKey=key(next);
        if(visited.has(nextKey)||!this.valid(next)||this.isCollision(next,entity.id))continue;
        visited.set(nextKey,current);
        if(this.same(next,target)){const route=[next];let cursor=current;while(cursor&&!this.same(cursor,start)){route.unshift(cursor);cursor=visited.get(key(cursor));}return route;}
        queue.push(next);
      }
    }
    return [];
  }

  recoverNearPlayer(follower){
    const candidates=DIRECTIONS.map(({dx,dy})=>({x:this.playerPosition.x-dx,y:this.playerPosition.y-dy}));
    const safe=candidates.find((point)=>this.valid(point)&&!this.isCollision(point,follower.entity.id));
    if(!safe)return false;
    follower.entity.position={...safe};follower.failedRoutes=0;this.refreshFronts(follower.entity);this.persist(follower);this.update(follower);this.onPositionChange?.();return true;
  }

  idle(follower){if(follower.state==='IDLE')return;follower.state='IDLE';follower.frame=1;follower.walkFrame=0;this.update(follower);}
  refreshFronts(entity){if(!entity.interaction)return;const {x,y}=entity.position;entity.interaction.frontPositions=[{x,y:y+1,facing:'up'},{x:x-1,y,facing:'right'},{x:x+1,y,facing:'left'},{x,y:y-1,facing:'down'}];}
  persist(follower){const {characterId}=follower.entity;this.gameState.set(`flags.partyFollowerPositions.${characterId}`,{...follower.entity.position,direction:follower.direction});this.saveManager?.save();}
  update(follower){this.view.updateRoamingNpc?.(follower.entity,follower);}
  record(characterId){return this.gameState.get(`flags.partyFollowers.${characterId}`)??{};}
  valid(point){const grid=this.scene?.grid;return Number.isInteger(point?.x)&&Number.isInteger(point?.y)&&point.x>=0&&point.y>=0&&point.x<grid.width&&point.y<grid.height;}
  same(a,b){return a?.x===b?.x&&a?.y===b?.y;}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
