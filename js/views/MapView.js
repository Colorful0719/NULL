import { CameraController } from '../controllers/CameraController.js?v=v25c1';
import { DEBUG_MAP } from '../config/DebugConfig.js?v=v25d1';

export class MapView {
  constructor(root) {
    this.root = root;
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
  transition(run){this.screen.classList.add('is-transitioning');window.setTimeout(()=>{run();window.requestAnimationFrame(()=>this.screen.classList.remove('is-transitioning'));},180);}
  render(scene, position, onExit, onEncounter, onPuzzle) {
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
    if(this.groundLayer){this.groundLayer.hidden=!mapArt?.baseImage;this.groundLayer.src=mapArt?.baseImage??'';}
    if(this.objectLayer){this.objectLayer.hidden=!mapArt?.objectImage;this.objectLayer.src=mapArt?.objectImage??'';}
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
    this.entityLayer?.replaceChildren(...(scene.entities ?? []).map((entity) => {
      const sprite = document.createElement('span');
      sprite.className = `map-entity map-entity--${entity.type}`;
      if(entity.interaction?.kind)sprite.classList.add(`map-entity--interaction-${entity.interaction.kind}`);
      sprite.dataset.entityId = entity.id;
      sprite.style.setProperty('--entity-x', entity.position.x);
      sprite.style.setProperty('--entity-y', entity.position.y);
      const label = entity.displayLabel??(entity.characterId ? entity.characterId.replaceAll('_', ' ').toUpperCase() : '物件');
      if(entity.mapSprite){
        const {sheet,sheetSize,frame,display}=entity.mapSprite;
        const scale=(display?.width??frame.width)/frame.width;
        sprite.classList.add('map-entity--sprite');
        sprite.style.width=`${display?.width??frame.width}px`;
        sprite.style.height=`${display?.height??Math.round(frame.height*scale)}px`;
        sprite.style.backgroundImage=`url("${sheet}")`;
        sprite.style.backgroundSize=`${sheetSize.width*scale}px ${sheetSize.height*scale}px`;
        sprite.style.backgroundPosition=`-${frame.x*scale}px -${frame.y*scale}px`;
      }else sprite.textContent = label;
      const friendlyCharacters=['parent','kai','rin','mio','photo_kid','photo_keeper'];
      if(entity.type==='npc'&&friendlyCharacters.includes(entity.characterId)){
        const nameTag=document.createElement('span');nameTag.className='map-friendly-label';nameTag.textContent=label;sprite.append(nameTag);
      }
      sprite.setAttribute('aria-label', entity.type==='npc'?`${label} 地圖角色`:`${label} 可互動物件`);
      return sprite;
    }));
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
