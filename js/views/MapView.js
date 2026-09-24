import { CameraController } from '../controllers/CameraController.js?v=v25c1';
import { DEBUG_MAP } from '../config/DebugConfig.js?v=v25d1';

export class MapView {
  constructor(root, gameState = null) {
    this.root = root;
    this.gameState = gameState;
    this.screen = root.querySelector('#map-screen');
    this.grid = root.querySelector('#map-grid');
    this.viewport = root.querySelector('#map-viewport');
    this.camera = new CameraController({ viewport: this.viewport, world: this.grid });
    this.title = root.querySelector('#map-title');
    this.description = root.querySelector('#map-description');
    this.exits = root.querySelector('#map-exits');
    this.player = root.querySelector('#map-player');
    this.groundLayer = root.querySelector('#map-ground-layer');
    this.objectLayer = root.querySelector('#map-object-layer');
    this.collisionLayer = root.querySelector('#map-collision-layer');
    this.entityLayer = root.querySelector('#map-entity-layer');
    this.debugLayer = root.querySelector('#map-debug-layer');
    this.debugInfo = root.querySelector('#map-debug-info');
    this.interactionPrompt = root.querySelector('#map-interaction-prompt');
    this.touchInteract = root.querySelector('#touch-interact');
    this.message = root.querySelector('#map-message');
    this.onResize = () => this.lastPosition && this.camera.follow(this.lastPosition, this.lastGrid);
    window.addEventListener('resize', this.onResize);
  }
  open() { this.root.querySelector('#title-screen').hidden = true; this.root.querySelector('#dialogue-scene').hidden = true; this.screen.hidden = false; }
  transition(run){
    this.screen.classList.add('is-transitioning');
    window.requestAnimationFrame(()=>{
      run();
      window.requestAnimationFrame(()=>this.screen.classList.remove('is-transitioning'));
    });
  }
  render(scene, position, onExit, onEncounter, onPuzzle) {
    this.scene=scene;
    this.screen.classList.remove('is-null-forming','has-null-revealed','is-null-encounter');
    this.screen.dataset.theme = scene.theme;
    this.screen.dataset.debugMap = String(DEBUG_MAP);
    this.grid.style.setProperty('--map-columns', scene.grid?.width ?? 6);
    this.grid.style.setProperty('--map-rows', scene.grid?.height ?? 4);
    const mapArt=scene.mapArt??null;
    this.grid.style.setProperty('--map-world-width', `${(scene.grid?.width ?? 6) * (mapArt?.tileSize ?? 48)}px`);
    this.playerSprite=mapArt?.playerSprite??null;this.playerStep=0;this.lastPlayerPosition=null;
    this.player.classList.toggle('has-map-sprite',Boolean(this.playerSprite));
    const logicalWidth=mapArt?.logicalSize?.width??scene.grid?.width??6;
    const logicalHeight=mapArt?.logicalSize?.height??scene.grid?.height??4;
    this.grid.style.setProperty('--map-aspect',`${logicalWidth} / ${logicalHeight}`);
    this.grid.dataset.mapArt=String(Boolean(mapArt?.baseImage));
    this.grid.dataset.gridVisible=String(mapArt?.gridVisible!==false);
    this.grid.setAttribute('aria-label',`${scene.displayName}，${scene.grid?.width??6} 乘 ${scene.grid?.height??4} 格探索地圖`);
    if(this.groundLayer){this.groundLayer.hidden=!mapArt?.baseImage;if(this.groundLayer.getAttribute('src')!==(mapArt?.baseImage??''))this.groundLayer.src=mapArt?.baseImage??'';}
    if(this.objectLayer){this.objectLayer.hidden=!mapArt?.objectImage;if(this.objectLayer.getAttribute('src')!==(mapArt?.objectImage??''))this.objectLayer.src=mapArt?.objectImage??'';}
    this.title.textContent = scene.displayName;
    this.description.textContent = scene.description;
    this.player.style.setProperty('--player-x', position.x);
    this.player.style.setProperty('--player-y', position.y);
    this.collisionLayer?.replaceChildren(...(scene.collisions ?? []).map((point) => {
      const tile = document.createElement('span');
      tile.className = 'map-collision';
      tile.style.setProperty('--tile-x', point.x);
      tile.style.setProperty('--tile-y', point.y);
      tile.setAttribute('aria-hidden', 'true');
      return tile;
    }));
    this.entityLayer?.replaceChildren(this.createFragmentConnections(scene),...(scene.entities ?? []).filter((entity)=>this.isEntityVisible(entity)).map((entity) => this.createEntitySprite(entity)));
    this.entityVisibilityKey=this.visibleEntityKey(scene);
    this.renderDebug(scene);
    this.lastGrid=scene.grid;this.showMessage('');
    const buttons=scene.connections.map((connection) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = connection.direction;
      button.title = connection.label;
      button.addEventListener('click', () => onExit(connection.to));
      return button;
    });
    if(scene.puzzleId){ const puzzle=document.createElement('button'); puzzle.type='button'; puzzle.textContent='進行照片檢查'; puzzle.className='puzzle-button'; puzzle.addEventListener('click',()=>onPuzzle(scene.puzzleId)); buttons.unshift(puzzle); }
    this.exits.replaceChildren(...buttons);
  }
  isEntityVisible(entity){const interaction=entity.interaction??{};const all=(interaction.visibleWhenAllFlags??[]).every((flag)=>this.gameState?.get(`flags.${flag}`));return all&&(!interaction.hiddenUntilFlag||this.gameState?.get(`flags.${interaction.hiddenUntilFlag}`))&&(!interaction.hiddenWhenFlag||!this.gameState?.get(`flags.${interaction.hiddenWhenFlag}`));}
  visibleEntityKey(scene=this.scene){return(scene?.entities??[]).filter((entity)=>this.isEntityVisible(entity)).map((entity)=>entity.id).join('|');}
  refreshEntityVisibility(scene=this.scene){
    if(!scene||this.visibleEntityKey(scene)===this.entityVisibilityKey)return false;
    this.entityLayer?.querySelectorAll(':scope > .map-entity').forEach((node)=>node.remove());
    const sprites=(scene.entities??[]).filter((entity)=>this.isEntityVisible(entity)).map((entity)=>this.createEntitySprite(entity));
    this.entityLayer?.prepend(...sprites);this.entityVisibilityKey=this.visibleEntityKey(scene);return true;
  }
  createEntitySprite(entity){
      const sprite = document.createElement('span');
      sprite.className = `map-entity map-entity--${entity.type}`;
      if(entity.interaction?.kind)sprite.classList.add(`map-entity--interaction-${entity.interaction.kind}`);
      if(entity.fragmentType)sprite.classList.add(`map-fragment--${entity.fragmentType.toLowerCase()}`);
      if(entity.id==='ch2_final_convergence')sprite.classList.add('map-final-convergence');
      if(entity.presentationClass)sprite.classList.add(`map-entity--${entity.presentationClass}`);
      if(entity.convergenceReady)sprite.classList.add('is-ready');
      sprite.dataset.entityId = entity.id;
      if(entity.viewed)sprite.dataset.viewed='true';
      const iconWorldAnchor=entity.visualBounds&&entity.iconAnchor?{
        x:entity.visualBounds.x+entity.visualBounds.width*entity.iconAnchor.x,
        y:entity.visualBounds.y+entity.visualBounds.height*entity.iconAnchor.y
      }:null;
      sprite.style.setProperty('--entity-x', iconWorldAnchor?iconWorldAnchor.x-.5:entity.position.x);
      sprite.style.setProperty('--entity-y', iconWorldAnchor?iconWorldAnchor.y-.5:entity.position.y);
      const label = entity.displayLabel??(entity.characterId ? entity.characterId.replaceAll('_', ' ').toUpperCase() : '物件');
      if(entity.mapSprite){
        const {sheet,sheetSize,frame,display,animation}=entity.mapSprite;
        if(animation){
          sprite.classList.add('map-entity--sprite','map-entity--animated-sprite');
          sprite.style.width=`${display?.width??animation.frameWidth}px`;
          sprite.style.height=`${display?.height??animation.frameHeight}px`;
          sprite.style.backgroundImage=`url("${sheet}")`;
          sprite.dataset.direction=animation.defaultDirection??'down';sprite.dataset.state='IDLE';
          this.applyAnimatedNpcFrame(sprite,entity.mapSprite,{direction:animation.defaultDirection??'down',state:'IDLE',frame:animation.idleColumn??1});
        }else{
        const scale=(display?.width??frame.width)/frame.width;
        sprite.classList.add('map-entity--sprite');
        sprite.style.width=`${display?.width??frame.width}px`;
        sprite.style.height=`${display?.height??Math.round(frame.height*scale)}px`;
        sprite.style.backgroundImage=`url("${sheet}")`;
        sprite.style.backgroundSize=`${sheetSize.width*scale}px ${sheetSize.height*scale}px`;
        sprite.style.backgroundPosition=`-${frame.x*scale}px -${frame.y*scale}px`;
        }
      }else if(entity.image){
        sprite.classList.add('map-entity--image');
        sprite.style.backgroundImage=`url("${entity.image}")`;
      }else if(!entity.presentationClass)sprite.textContent = label;
      const friendlyCharacters=['parent','kai','rin','mio','photo_kid','photo_keeper'];
      if(entity.type==='npc'&&friendlyCharacters.includes(entity.characterId)){
        const nameTag=document.createElement('span');nameTag.className='map-friendly-label';nameTag.textContent=label;sprite.append(nameTag);
      }
      if(entity.interactionIcon){sprite.classList.add('map-entity--has-interaction-icon');if(iconWorldAnchor)sprite.classList.add('map-entity--world-icon-anchor');sprite.style.setProperty('--interaction-icon-offset-x',`${entity.interactionIconOffset?.x??0}px`);sprite.style.setProperty('--interaction-icon-offset-y',`${entity.interactionIconOffset?.y??8}px`);const icon=document.createElement('img');icon.className='map-interaction-icon';icon.src=entity.interactionIcon;icon.alt='可互動';sprite.append(icon);}
      sprite.setAttribute('aria-label', entity.type==='npc'?`${label} 地圖角色`:`${label} 可互動物件`);
      return sprite;
  }
  createFragmentConnections(scene){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('map-fragment-connections');svg.setAttribute('viewBox',`0 0 ${scene.grid?.width??1} ${scene.grid?.height??1}`);svg.setAttribute('aria-hidden','true');
    const byId=new Map((scene.fragmentNodes??[]).map((node)=>[node.id,node]));
    for(const edge of scene.fragmentConnections??[]){const from=byId.get(edge.from),to=byId.get(edge.to);if(!from||!to)continue;const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',from.position.x+.5);line.setAttribute('y1',from.position.y+.5);line.setAttribute('x2',to.position.x+.5);line.setAttribute('y2',to.position.y+.5);svg.append(line);}
    return svg;
  }
  beginNullFormation(){
    this.screen.classList.add('is-null-forming','is-null-encounter');
    this.entityLayer?.querySelectorAll('.map-entity--interaction-ch2_final_fragment[data-viewed="true"]').forEach((node)=>node.classList.add('is-null-reacting'));
    const svg=this.entityLayer?.querySelector('.map-fragment-connections');svg?.classList.add('is-null-reacting');
    // Temporary light flow from actual viewed nodes, not additional semantic connections.
    for(const node of this.scene.fragmentNodes??[]){if(!node.viewed)continue;const ray=document.createElementNS('http://www.w3.org/2000/svg','line');ray.classList.add('null-formation-ray');ray.setAttribute('x1',node.position.x+.5);ray.setAttribute('y1',node.position.y+.5);ray.setAttribute('x2',9.5);ray.setAttribute('y2',2.5);svg?.append(ray);}
    this.entityLayer?.querySelector('.map-final-convergence')?.classList.add('is-null-reacting');
  }
  revealNull(){this.screen.classList.add('has-null-revealed','is-null-encounter');this.entityLayer?.querySelector('[data-entity-id="ch2_final_null"]')?.classList.add('is-revealed');}
  finishNullFormation(){this.screen.classList.remove('is-null-forming');this.entityLayer?.querySelectorAll('.null-formation-ray').forEach((node)=>node.remove());this.entityLayer?.querySelectorAll('.is-null-reacting').forEach((node)=>node.classList.remove('is-null-reacting'));this.revealNull();}
  updateRoamingNpc(entity,npc){
    const sprite=this.entityLayer?.querySelector(`.map-entity[data-entity-id="${entity.id}"]`);if(!sprite)return;
    sprite.style.setProperty('--entity-x',entity.position.x);sprite.style.setProperty('--entity-y',entity.position.y);
    const animation=entity.mapSprite?.animation;if(!animation)return;
    this.applyAnimatedNpcFrame(sprite,entity.mapSprite,npc);
    sprite.dataset.direction=npc.direction;sprite.dataset.state=npc.state;
  }
  showNpcRecognition(entity,duration=900){
    const sprite=this.entityLayer?.querySelector(`.map-entity[data-entity-id="${entity.id}"]`);if(!sprite)return;
    sprite.querySelector('.map-npc-recognition-emote')?.remove();
    const emote=document.createElement('span');emote.className='map-npc-recognition-emote';emote.textContent='!';emote.setAttribute('aria-label','注意到玩家');sprite.append(emote);
    setTimeout(()=>emote.remove(),duration);
  }
  applyAnimatedNpcFrame(sprite,mapSprite,npc){
    const animation=mapSprite.animation,rows=animation.directionRows??{down:0,left:1,right:2,up:3};
    const column=npc.state==='IDLE'?(animation.idleColumn??1):(npc.frame??0),row=rows[npc.direction]??0;
    const frameWidth=animation.frameWidth,frameHeight=animation.frameHeight;
    const originX=animation.frameOrigin?.x??0,originY=animation.frameOrigin?.y??0;
    const scaleX=(mapSprite.display?.width??frameWidth)/frameWidth;
    const scaleY=(mapSprite.display?.height??frameHeight)/frameHeight;
    sprite.style.backgroundSize=`${mapSprite.sheetSize.width*scaleX}px ${mapSprite.sheetSize.height*scaleY}px`;
    sprite.style.backgroundPosition=`-${(originX+column*frameWidth)*scaleX}px -${(originY+row*frameHeight)*scaleY}px`;
  }
  move(position, facing = 'down', {blocked=false}={}) {
    this.player.style.setProperty('--player-x', position.x);
    this.player.style.setProperty('--player-y', position.y);
    this.player.dataset.facing = facing;
    const moved=this.lastPlayerPosition&&(this.lastPlayerPosition.x!==position.x||this.lastPlayerPosition.y!==position.y);
    if(this.playerSprite){const frames=this.playerSprite.directions?.[facing]??this.playerSprite.directions?.down??[];if(moved&&!blocked&&frames.length)this.playerStep=(this.playerStep+1)%frames.length;const frame=frames[this.playerStep%Math.max(frames.length,1)];if(frame)this.applyPlayerFrame(frame);}
    this.lastPlayerPosition={...position};this.lastPosition={...position};this.camera.follow(position,this.lastGrid);
    this.root.querySelector('#map-position').textContent = `位置：${position.x + 1}，${position.y + 1}`;
    if(DEBUG_MAP&&this.debugInfo)this.debugInfo.textContent=`Map: ${this.sceneId} · Tile: ${position.x}, ${position.y}`;
  }
  renderRoamingEnemies(enemies){
    this.entityLayer?.querySelectorAll('.map-roaming-enemy').forEach((node)=>node.remove());
    this.debugLayer?.querySelectorAll('.map-roam-debug').forEach((node)=>node.remove());
    for(const enemy of enemies){
      const sprite=document.createElement('span');sprite.className='map-roaming-enemy';sprite.dataset.enemyId=enemy.id;sprite.setAttribute('aria-label',`${enemy.enemyType} 地圖敵人`);
      const label=document.createElement('span');label.className='map-roaming-enemy-label';label.textContent=enemy.enemyType;sprite.append(label);this.entityLayer?.append(sprite);this.updateRoamingEnemy(enemy);
      if(enemy.roamArea&&this.debugLayer){const area=document.createElement('span');area.className='map-roam-debug map-roam-debug-area';area.style.setProperty('--roam-x',enemy.roamArea.x);area.style.setProperty('--roam-y',enemy.roamArea.y);area.style.setProperty('--roam-width',enemy.roamArea.width);area.style.setProperty('--roam-height',enemy.roamArea.height);area.textContent=`${enemy.id} ROAM`;this.debugLayer.append(area);const spawn=document.createElement('span');spawn.className='map-roam-debug map-roam-debug-spawn';spawn.style.setProperty('--tile-x',enemy.spawnX);spawn.style.setProperty('--tile-y',enemy.spawnY);spawn.textContent='S';this.debugLayer.append(spawn);}
    }
  }
  updateRoamingEnemy(enemy){
    const sprite=this.entityLayer?.querySelector(`.map-roaming-enemy[data-enemy-id="${enemy.id}"]`);if(!sprite)return;
    const rows={down:0,left:1,right:2,up:3};const column=enemy.state==='WALK'?(enemy.frame??0):1;
    sprite.style.setProperty('--enemy-x',enemy.x);sprite.style.setProperty('--enemy-y',enemy.y);sprite.style.setProperty('--enemy-frame-x',String(column));sprite.style.setProperty('--enemy-frame-y',String(rows[enemy.direction]??0));sprite.style.backgroundImage=`url("${enemy.sprite}")`;sprite.dataset.state=enemy.state;
  }
  removeRoamingEnemy(id){this.entityLayer?.querySelector(`.map-roaming-enemy[data-enemy-id="${id}"]`)?.remove();}
  renderDebug(scene){this.sceneId=scene.id;if(!this.debugLayer||!this.debugInfo)return;this.debugInfo.hidden=!DEBUG_MAP;if(!DEBUG_MAP){this.debugLayer.replaceChildren();return;}const tiles=[];const add=(className,x,y,label)=>{const tile=document.createElement('span');tile.className=`map-debug-tile ${className}`;tile.style.setProperty('--tile-x',x);tile.style.setProperty('--tile-y',y);tile.textContent=label;tiles.push(tile);};for(const rect of scene.collisionRects??[])for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)add('map-debug-collision',x,y,'C');for(const entity of scene.entities??[]){if(entity.type==='npc'){const radius=entity.interactionRadius??1;for(let y=entity.position.y-radius;y<=entity.position.y+radius;y++)for(let x=entity.position.x-radius;x<=entity.position.x+radius;x++)if(Math.abs(x-entity.position.x)+Math.abs(y-entity.position.y)<=radius)add('map-debug-interaction',x,y,'I');}}for(const trigger of scene.triggers??[])add(trigger.type==='exit'?'map-debug-transition':'map-debug-event',trigger.position.x,trigger.position.y,trigger.type==='exit'?'T':'E');this.debugLayer.replaceChildren(...tiles);}
  applyPlayerFrame(frame){const sprite=this.playerSprite;const scale=(sprite.display?.width??sprite.frameSize.width)/sprite.frameSize.width;this.player.style.width=`${sprite.display?.width??sprite.frameSize.width}px`;this.player.style.height=`${sprite.display?.height??Math.round(sprite.frameSize.height*scale)}px`;this.player.style.backgroundImage=`url("${sprite.sheet}")`;this.player.style.backgroundSize=`${sprite.sheetSize.width*scale}px ${sprite.sheetSize.height*scale}px`;this.player.style.backgroundPosition=`-${frame.x*scale}px -${frame.y*scale}px`;}
  setInteraction(prompt, targetId) {
    const touchCapable=this.root.dataset.touchCapable==='true';
    const touchLabel=this.getTouchLabel(prompt);
    const visiblePrompt=touchCapable?String(prompt).replace(/\[?E\]?\s*/gi,'').replace(/按\s*互動/,'').replace(/按\s*/,'').trim():prompt;
    this.interactionPrompt.textContent = visiblePrompt;
    this.interactionPrompt.hidden = !prompt;
    this.interactionPrompt.dataset.targetId = targetId ?? '';
    if(this.touchInteract){
      this.touchInteract.textContent=touchLabel;
      this.touchInteract.setAttribute('aria-label',touchLabel);
      this.touchInteract.dataset.targetId=targetId??'';
      this.touchInteract.hidden=!prompt||!touchCapable;
    }
  }
  getTouchLabel(prompt=''){
    const text=String(prompt);
    if(/交談|對話/.test(text))return '對話';
    if(/布告欄|公布欄|查看|調查/.test(text))return '查看';
    if(/照片|檢查/.test(text))return '檢查';
    if(/進入|出口|離開|門/.test(text))return '進入';
    return '互動';
  }
  showMessage(message) { this.message.textContent = message; this.message.hidden = !message; }
}
