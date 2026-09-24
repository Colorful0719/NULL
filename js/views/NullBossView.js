import {FIELD,PACING} from '../final/NullBossField.js?v=task10e2b';
import {FRAGMENT_ASSETS} from '../final/NullBossSemantics.js?v=task10e2b';

export class NullBossView {
  constructor(root){
    this.root=root;this.screen=document.createElement('section');this.screen.id='null-boss-screen';this.screen.className='null-boss-screen';this.screen.hidden=true;this.screen.setAttribute('aria-label','資料輪廓 · 資料場');
    this.screen.innerHTML=`<header class="null-boss-header"><div><p>資料輪廓</p><h1>流動之間</h1><p class="null-boss-stability" aria-live="polite">輪廓穩定度</p></div><img class="null-boss-presence-art" src="assets/characters/null/NULL-DATA-SELF-FINAL.png" alt="不完整的資料輪廓" decoding="async"><span class="null-boss-phase"></span></header>
      <div class="null-data-field" role="img" aria-label="資料場：移動光點，穿過流動的資訊"><svg class="null-data-network" viewBox="0 0 640 300" preserveAspectRatio="none"></svg><div class="null-connection-objective"></div><div class="null-data-traces"></div><div class="null-data-objects"></div><span class="null-player-node" aria-label="PLAYER 光點"></span><span class="null-contact-light" aria-hidden="true"></span></div>
      <footer class="null-boss-footer"><div class="null-boss-copy"><p class="null-boss-response" aria-live="polite"></p><p class="null-boss-instructions"></p><p class="null-node-hint" role="status"></p><button class="null-boss-interact" type="button" hidden>中斷連結（E）</button><button class="null-boss-continue" type="button">繼續</button></div><div class="null-boss-directions" role="group" aria-label="資料場方向控制"></div></footer>`;
    const directions=[['左上',-1,-1,'↖'],['上',0,-1,'↑'],['右上',1,-1,'↗'],['左',-1,0,'←'],['右',1,0,'→'],['左下',-1,1,'↙'],['下',0,1,'↓'],['右下',1,1,'↘']];
    const controls=this.screen.querySelector('.null-boss-directions');
    for(const [name,x,y,arrow]of directions){const button=document.createElement('button');button.type='button';button.textContent=arrow;button.dataset.dx=x;button.dataset.dy=y;button.setAttribute('aria-label',`光點向${name}`);controls.append(button);}
    root.append(this.screen);this.interact=this.screen.querySelector('.null-boss-interact');this.objective=this.screen.querySelector('.null-connection-objective');this.field=this.screen.querySelector('.null-data-field');this.node=this.screen.querySelector('.null-player-node');this.objects=this.screen.querySelector('.null-data-objects');this.network=this.screen.querySelector('.null-data-network');this.traces=this.screen.querySelector('.null-data-traces');this.action=this.screen.querySelector('.null-boss-continue');
  }
  open(background){this.screen.style.setProperty('--null-world',`url("${new URL(background,document.baseURI).href}")`);this.screen.hidden=false;}
  phase(phase,round,model=null){
    this.screen.dataset.phase=phase;this.screen.dataset.round=round;this.screen.classList.remove('is-collapsed','is-collapsing');this.network.classList.remove('is-collapsing');this.interact.hidden=phase!=='DODGE'||round!==3;this.screen.querySelector('.null-boss-phase').textContent=phase==='DODGE'?'資料流動中':phase==='COMPLETE'?'片刻安靜':`第 ${round} 段`;
    this.screen.querySelector('.null-boss-response').textContent=phase==='COMPLETE'?'光點慢慢停了下來。那個輪廓仍在前方。':phase==='DODGE'?'沿著間隙移動。':round===1?'資訊在輪廓周圍流動，間隙時而出現。':'流動的方向，開始有些不同。';
    this.screen.querySelector('.null-boss-instructions').textContent=this.root.dataset.touchCapable==='true'?'按住方向按鈕移動，也可以使用斜向按鈕。':'方向鍵或 WASD 移動；同時按兩個方向可斜向移動。';
    this.action.hidden=phase==='DODGE'||phase==='COLLAPSE';this.action.textContent=phase==='COMPLETE'?'回到資料世界':'繼續';this.screen.classList.remove('is-narrative-paused');
    this.screen.querySelectorAll('.null-boss-directions button').forEach(b=>b.disabled=phase!=='DODGE');
    this.objects.replaceChildren();this.network.replaceChildren();this.traces.replaceChildren();this.field.classList.remove('has-contact');if(model)this.render(model);
  }
  render(model){
    this.node.style.left=`${model.player.x/FIELD.width*100}%`;this.node.style.top=`${model.player.y/FIELD.height*100}%`;
    this.screen.querySelector('.null-boss-stability').textContent=`輪廓穩定度　${Math.ceil(model.profileStability??0)}／${model.profileMaxStability??0}`;
    this.objects.replaceChildren(...model.objects.map(o=>{const el=document.createElement('img');el.className=`null-data-shard is-${o.semantic.toLowerCase().replaceAll('_','-')} state-${String(o.state??'UNRESOLVED').toLowerCase()}`;el.src=FRAGMENT_ASSETS[o.semantic];el.alt=o.state==='UNRESOLVED'?'尚未形成的資訊':'資訊碎片';el.style.left=`${o.x/FIELD.width*100}%`;el.style.top=`${o.y/FIELD.height*100}%`;if(o.warningUntil>model.clock)el.classList.add('is-preview');return el;}));
    this.network.replaceChildren(...model.network.flatMap(n=>{if(!n.a||!n.b)return[];const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',n.a.x);line.setAttribute('y1',n.a.y);line.setAttribute('x2',n.b.x);line.setAttribute('y2',n.b.y);line.setAttribute('class',`connection-${String(n.state??'UNRESOLVED').toLowerCase()} ${n.active?'is-active':'is-preview'}`);const node=document.createElementNS('http://www.w3.org/2000/svg','circle');node.setAttribute('cx',(n.a.x+n.b.x)/2);node.setAttribute('cy',(n.a.y+n.b.y)/2);node.setAttribute('r','3');node.setAttribute('class',`connection-node-${String(n.state??'UNRESOLVED').toLowerCase()}`);const ends=[['fromType',n.a],['toType',n.b]].map(([key,p])=>{const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',FRAGMENT_ASSETS[n[key]]);image.setAttribute('x',p.x-14);image.setAttribute('y',p.y-14);image.setAttribute('width',28);image.setAttribute('height',28);image.setAttribute('opacity',n.state==='UNRESOLVED'?'.4':n.state==='CONTEXTUAL'?'.7':'1');const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=n.state==='EXPLICIT'?'已明示的資訊連結':n.state==='CONTEXTUAL'?'可能的線索連結':'尚未確定的連結';image.append(title);return image;});return[line,node,...ends];}));
    this.traces.replaceChildren(...model.traces.map(t=>{const el=document.createElement('i');el.style.left=`${t.x/FIELD.width*100}%`;el.style.top=`${t.y/FIELD.height*100}%`;return el;}));
    this.field.classList.toggle('has-contact',model.feedbackUntil>model.clock);
    const names={1:'資訊散落',2:'資訊連結',3:'輪廓形成'};
    this.screen.dataset.storm=String(model.storm);this.screen.querySelector('h1').textContent=names[model.round];
    this.screen.querySelector('.null-boss-phase').textContent=model.storm?'資料風暴 · '+Math.ceil(PACING.storm-model.stormTime)+' 秒':names[model.round]+' · '+Math.max(0,Math.ceil(model.duration-model.time))+' 秒';
    this.objective.replaceChildren();
    if(model.node){const marker=document.createElement('span');marker.className='null-connection-node';marker.textContent=String(model.node.id);marker.style.left=model.node.x/FIELD.width*100+'%';marker.style.top=model.node.y/FIELD.height*100+'%';this.objective.append(marker);}
    if(model.breakEffect?.until>model.clock){const effect=document.createElement('span');effect.className='null-node-break';effect.style.left=model.breakEffect.x/FIELD.width*100+'%';effect.style.top=model.breakEffect.y/FIELD.height*100+'%';effect.textContent='連結已中斷';this.objective.append(effect);}
    this.interact.disabled=!model.inNodeRange;this.interact.hidden=model.round!==3||model.storm||this.screen.dataset.phase!=='DODGE';
    this.screen.querySelector('.null-node-hint').textContent=model.round===3?'已中斷 '+model.resolvedNodes.length+'／3 · '+(model.storm?'穿過最後的流動':model.resolvedNodes.length===3?'繼續避讓，資料風暴即將開始':model.node?(model.inNodeRange?'按 E 或下方按鈕中斷連結':'靠近圓形節點；下方留有通行空間'):'觀察流動，下一個節點即將出現'):model.round===2?'線閃爍 1 秒後啟動；虛線表示可能或尚未確定的連結。':'碎片先閃示再移動；下方留有通行空間。';
  }
  showNarrative(lines,event){
    this.screen.dataset.narrativeEvent=event??'';this.screen.classList.add('is-narrative-paused');
    const response=this.screen.querySelector('.null-boss-response');response.textContent=lines.join('\n');response.style.whiteSpace='pre-line';
    this.screen.querySelector('.null-boss-instructions').textContent='讀完後按「繼續」，資料流動會接著開始。';this.action.hidden=false;this.action.textContent='繼續';
    this.screen.querySelectorAll('.null-boss-directions button').forEach(button=>{button.disabled=true;});
  }
  showReaction(lines,event){
    if(!lines?.length)return;this.screen.dataset.narrativeEvent=event??'';const response=this.screen.querySelector('.null-boss-response');response.textContent=lines.join('\n');response.style.whiteSpace='pre-line';
  }
  beginCollapse(model){
    this.screen.dataset.phase='COLLAPSE';this.screen.querySelector('.null-node-hint').textContent='';
    this.screen.classList.add('is-collapsing');
    this.screen.querySelector('.null-boss-phase').textContent='連結正在鬆開';
    this.screen.querySelector('.null-boss-response').textContent='連結……斷開了。';
    this.screen.querySelector('.null-boss-instructions').textContent='資訊碎片仍留在資料世界。';
    this.action.hidden=true;this.interact.hidden=true;this.objective.replaceChildren();
    this.screen.querySelectorAll('.null-boss-directions button').forEach(button=>{button.disabled=true;});
    this.screen.querySelector('.null-boss-stability').textContent=`輪廓穩定度　0／${model?.profileMaxStability??0}`;
    this.objects.querySelectorAll('img').forEach((node,index)=>{node.style.setProperty('--collapse-delay',`${index*70}ms`);node.classList.add('is-collapsing');});
    this.network.classList.add('is-collapsing');
  }
  completeCollapse(){
    this.screen.classList.remove('is-collapsing');
    this.screen.classList.add('is-collapsed');
    this.screen.dataset.phase='COMPLETE';this.screen.querySelector('.null-node-hint').textContent='';
    this.screen.querySelector('.null-boss-phase').textContent='片刻安靜';
    this.screen.querySelector('.null-boss-response').textContent='碎片分開了，但仍留在資料之中。';
    this.screen.querySelector('.null-boss-instructions').textContent='準備好後返回資料世界。';
    this.action.hidden=false;
    this.action.textContent='回到資料世界';
  }
  close(){this.screen.hidden=true;this.objects.replaceChildren();this.network.replaceChildren();this.traces.replaceChildren();}
}
