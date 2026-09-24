import {CH2_DATA_PROFILE_BALANCE} from './NullBossSemantics.js?v=task10e2b';
export const FIELD=Object.freeze({width:640,height:300,radius:11,speed:170});
export const PACING=Object.freeze({1:35,2:45,3:60,storm:15,warning:1,active:2.5,nodeRange:58});
const NODE_POSITIONS=[{x:160,y:170},{x:475,y:115},{x:230,y:85}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}

export class NullBossField {
  constructor(round=1,plan={},progress={}){
    progress??={};
    this.round=round;this.plan=plan;this.types=plan[round===1?'round1':'round2']??[];
    this.duration=PACING[round]??PACING[1];this.time=clamp(Number(progress.time)||0,0,this.duration);
    this.resolvedNodes=[...new Set(progress.resolvedNodes??[])].filter(id=>[1,2,3].includes(id));
    this.stormTime=this.resolvedNodes.length===3&&this.time>=this.duration?clamp(Number(progress.stormTime)||0,0,PACING.storm):0;
    this.storm=this.round===3&&this.time>=this.duration&&this.resolvedNodes.length===3;
    this.clock=this.time+this.stormTime;this.nextSpawn=this.clock+.6;this.nextConnection=this.clock+2;
    this.serial=0;this.connectionSerial=0;this.player={x:320,y:260};this.objects=[];this.network=[];
    this.contactsThisPhase=0;this.lastContact=null;this.feedbackUntil=0;this.traces=[];this.node=null;this.breakEffect=null;
    this.graceUntil=this.clock+(this.time>0?2:0);this.profileMaxStability=plan.profileMaxStability??CH2_DATA_PROFILE_BALANCE.BASE_STABILITY;
    this.profileStability=plan.profileStability??this.profileMaxStability;
    this.pairs=(plan.connections??plan.pairs??[]).filter(p=>this.types.some(t=>t.id===p.fromId)&&this.types.some(t=>t.id===p.toId));
    this.updateNode();
  }
  checkpoint(){return{time:this.time,resolvedNodes:[...this.resolvedNodes],stormTime:this.stormTime};}
  get tier(){return this.storm?3:Math.min(2,Math.floor(this.time/(this.duration/3)));}
  get connectionLimit(){return this.round===1?0:this.storm?3:Math.min(3,1+this.tier);}
  get inNodeRange(){return Boolean(this.node&&Math.hypot(this.player.x-this.node.x,this.player.y-this.node.y)<=PACING.nodeRange);}
  move(dx,dy,dt){const length=Math.hypot(dx,dy);if(!length)return;const r=FIELD.radius;this.player.x=clamp(this.player.x+dx/length*FIELD.speed*dt,r,FIELD.width-r);this.player.y=clamp(this.player.y+dy/length*FIELD.speed*dt,r,FIELD.height-r);}
  updateNode(){
    if(this.round!==3||this.node||this.resolvedNodes.length===3)return;
    const index=this.resolvedNodes.length;if(this.time<[12,30,48][index])return;
    const pair=this.pairs[index%Math.max(1,this.pairs.length)];
    this.node={id:index+1,...NODE_POSITIONS[index],state:pair?.state??'UNRESOLVED',relation:pair?.relation??null};
    // Broad access lane to the bottom refuge prevents a node from being boxed in.
    this.objects=this.objects.filter(o=>!this.inAccessLane(o,o.r+FIELD.radius));
    this.network=this.network.filter(n=>!this.crossesAccessLane(n.a,n.b));
  }
  inAccessLane(p,padding=0){return Boolean(this.node&&Math.abs(p.x-this.node.x)<44+padding&&p.y>this.node.y-65-padding);}
  crossesAccessLane(a,b){if(!this.node)return false;for(let i=0;i<=20;i++)if(this.inAccessLane({x:a.x+(b.x-a.x)*i/20,y:a.y+(b.y-a.y)*i/20},18))return true;return false;}
  interact(){
    if(!this.inNodeRange)return false;
    const node=this.node;this.resolvedNodes.push(node.id);this.node=null;
    this.profileStability=Math.max(0,this.profileMaxStability*(1-this.resolvedNodes.length/4));
    this.breakEffect={...node,until:this.clock+1};this.network=[];this.objects=[];
    this.nextSpawn=this.clock+.8;this.nextConnection=this.clock+1.2;return true;
  }
  spawn(){
    if(!this.types.length||this.objects.length>=(this.storm?16:6+this.round*2+this.tier*2))return;
    const i=this.serial++,semantic=this.types[i%this.types.length];
    const side=i%4,vertical=side>=2;const x=vertical?100+(i*97)%440:side===0?62:578;
    const y=vertical?(side===2?48:215):65+(i*43)%130;const speed=semantic.type==='PHOTO'?64:78;
    const object={id:i,semantic:semantic.type,state:semantic.state??'UNRESOLVED',sourceId:semantic.id,x,y,
      vx:vertical?(this.tier?((i%3)-1)*24:0):(side===0?speed:-speed),vy:vertical?(side===2?speed*.7:-speed*.7):(this.tier?((i%3)-1)*22:0),
      r:semantic.type==='PHOTO'?18:14,contacted:false,warningUntil:this.clock+.8,until:this.clock+6};
    if(!this.inAccessLane(object,object.r+FIELD.radius))this.objects.push(object);
  }
  spawnConnection(){
    if(!this.pairs.length||this.network.length>=this.connectionLimit)return;
    const i=this.connectionSerial++,pair=this.pairs[i%this.pairs.length];
    // Finite interior segments never seal the wide lower/side refuge.
    const left=i%2===0;const a={x:left?85:350,y:55+(i*37)%105},b={x:left?285:555,y:100+(i*23)%100};
    if(this.crossesAccessLane(a,b))return;
    this.network.push({...pair,id:i,a,b,warningUntil:this.clock+PACING.warning,until:this.clock+PACING.warning+PACING.active,active:false,contacted:false});
  }
  contact(source){
    if(this.clock<this.graceUntil||this.feedbackUntil>this.clock)return;
    this.lastContact={...source};this.contactsThisPhase++;this.feedbackUntil=this.clock+.7;
    this.traces.push({x:this.player.x,y:this.player.y,until:this.clock+1.4});
  }
  step(dt,dx=0,dy=0){
    dt=clamp(dt,0,.05);this.clock+=dt;
    if(this.storm)this.stormTime=Math.min(PACING.storm,this.stormTime+dt);else this.time=Math.min(this.duration,this.time+dt);
    this.lastContact=null;this.move(dx,dy,dt);this.updateNode();
    if(this.round===3&&!this.storm&&this.time>=this.duration&&this.resolvedNodes.length===3){this.storm=true;this.network=[];this.objects=[];this.nextSpawn=this.clock+.8;this.nextConnection=this.clock+1.2;}
    if(this.clock>=this.nextSpawn){this.spawn();this.nextSpawn=this.clock+(this.storm ? .42 : Math.max(.48,1.35-this.round*.15-this.tier*.22));}
    if(this.round>=2&&this.clock>=this.nextConnection){this.spawnConnection();this.nextConnection=this.clock+(this.storm?1.25:2.8-this.tier*.65);}
    for(const o of this.objects){
      if(this.clock<o.warningUntil)continue;
      o.x+=o.vx*dt;o.y+=o.vy*dt;
      if(o.x<60||o.x>580){o.vx*=-1;o.x=clamp(o.x,60,580);}
      if(o.y<45||o.y>215){o.vy*=-1;o.y=clamp(o.y,45,215);}
      if(!o.contacted&&Math.hypot(o.x-this.player.x,o.y-this.player.y)<o.r+FIELD.radius){o.contacted=true;this.contact(o);}
    }
    this.objects=this.objects.filter(o=>o.until>this.clock&&!this.inAccessLane(o,o.r+FIELD.radius));
    for(const n of this.network){n.active=this.clock>=n.warningUntil;if(n.active&&!n.contacted&&segmentDistance(this.player,n.a,n.b)<FIELD.radius+4){n.contacted=true;this.contact({semantic:'CONNECTION',state:n.state});}}
    this.network=this.network.filter(n=>n.until>this.clock);this.traces=this.traces.filter(t=>t.until>this.clock);
    return this.round===3?this.storm&&this.stormTime>=PACING.storm:this.time>=this.duration;
  }
}
