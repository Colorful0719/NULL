export const DATA_MANIFEST = Object.freeze({
  chapters: { file: 'chapters.json', root: 'chapters', shape: 'array', required: ['id'] },
  scenes: { file: 'scenes.json', root: 'scenes', shape: 'array', required: ['id'] },
  characters: { file: 'characters.json', root: 'characters', shape: 'object', required: ['displayName'] },
  dialogues: { file: 'dialogues.json', root: 'dialogues', shape: 'array', required: ['id', 'lines'] },
  bossDialogues: { file: 'boss_dialogues.json', root: 'bossDialogues', shape: 'array', required: ['id', 'lines'] },
  act3Dialogues: { file: 'act3_dialogues.json', root: 'act3Dialogues', shape: 'array', required: ['id', 'lines'] },
  environmentDialogues: { file: 'environment_dialogues.json', root: 'environmentDialogues', shape: 'array', required: ['id', 'lines'] },
  choices: { file: 'choices.json', root: 'choices', shape: 'array', required: ['id'] },
  quests: { file: 'quests.json', root: 'quests', shape: 'array', required: ['id'] },
  puzzles: { file: 'puzzles.json', root: 'puzzles', shape: 'array', required: ['id'] },
  memories: { file: 'memories.json', root: 'memories', shape: 'array', required: ['id', 'image', 'questions'] },
  enemies: { file: 'enemies.json', root: 'enemies', shape: 'array', required: ['id', 'displayName'] },
  bosses: { file: 'bosses.json', root: 'bosses', shape: 'array', required: ['id', 'displayName'] },
  skills: { file: 'skills.json', root: 'skills', shape: 'array', required: ['id', 'displayName'] },
  items: { file: 'items.json', root: 'items', shape: 'array', required: ['id', 'displayName'] },
  endings: { file: 'endings.json', root: 'endings', shape: 'array', required: ['id'] }
  ,reflections: { file: 'reflections.json', root: 'reflections', shape: 'array', required: ['id', 'questions'] }
});

export class DataLoadError extends Error {
  constructor(dataset, reason, cause) {
    super(`資料「${dataset}」載入失敗：${reason}`, { cause });
    this.name = 'DataLoadError';
    this.dataset = dataset;
  }
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isInteger = (value) => Number.isInteger(value);
const pointKey = (point) => `${point.x},${point.y}`;

const assertMapPoint = (dataset, scene, point, label) => {
  if (!isRecord(point) || !isInteger(point.x) || !isInteger(point.y)) {
    throw new DataLoadError(dataset, `場景「${scene.id}」的${label}座標必須是整數 x／y。`);
  }
  if (point.x < 0 || point.y < 0 || point.x >= scene.grid.width || point.y >= scene.grid.height) {
    throw new DataLoadError(dataset, `場景「${scene.id}」的${label}座標超出地圖邊界。`);
  }
};

const assertUniqueIds = (dataset, scene, records, label) => {
  const ids = new Set();
  records.forEach((record) => {
    if (!isRecord(record) || typeof record.id !== 'string' || !record.id) {
      throw new DataLoadError(dataset, `場景「${scene.id}」的${label}缺少有效 ID。`);
    }
    if (ids.has(record.id)) throw new DataLoadError(dataset, `場景「${scene.id}」有重複的${label} ID「${record.id}」。`);
    ids.add(record.id);
  });
};

const validateMapScenes = (dataset, scenes) => {
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  scenes.filter((scene) => scene.type === 'map').forEach((scene) => {
    if (!isRecord(scene.grid) || !isInteger(scene.grid.width) || !isInteger(scene.grid.height) || scene.grid.width < 1 || scene.grid.height < 1) {
      throw new DataLoadError(dataset, `地圖場景「${scene.id}」需要正整數 grid.width／grid.height。`);
    }
    assertMapPoint(dataset, scene, scene.spawn, '出生點');
    const collisions = scene.collisions ?? [];
    const entities = scene.entities ?? [];
    const triggers = scene.triggers ?? [];
    if (!Array.isArray(collisions) || !Array.isArray(entities) || !Array.isArray(triggers)) {
      throw new DataLoadError(dataset, `場景「${scene.id}」的 collisions、entities、triggers 必須是陣列。`);
    }
    const collisionKeys = new Set();
    collisions.forEach((point) => {
      assertMapPoint(dataset, scene, point, '碰撞');
      const key = pointKey(point);
      if (collisionKeys.has(key)) throw new DataLoadError(dataset, `場景「${scene.id}」有重複碰撞座標「${key}」。`);
      collisionKeys.add(key);
    });
    const collisionRects=scene.collisionRects??[];
    if(!Array.isArray(collisionRects))throw new DataLoadError(dataset,`場景「${scene.id}」的 collisionRects 必須是陣列。`);
    collisionRects.forEach((rect)=>{if(!isInteger(rect.x)||!isInteger(rect.y)||!isInteger(rect.width)||!isInteger(rect.height)||rect.width<1||rect.height<1||rect.x<0||rect.y<0||rect.x+rect.width>scene.grid.width||rect.y+rect.height>scene.grid.height)throw new DataLoadError(dataset,`場景「${scene.id}」有無效的碰撞矩形。`);});
    assertUniqueIds(dataset, scene, entities, '地圖實體');
    entities.forEach((entity) => {
      assertMapPoint(dataset, scene, entity.position, `地圖實體「${entity.id}」`);
      if (!['npc', 'object'].includes(entity.type)) throw new DataLoadError(dataset, `地圖實體「${entity.id}」的 type 無效。`);
      if (typeof entity.spriteId !== 'string' || !entity.spriteId) throw new DataLoadError(dataset, `地圖實體「${entity.id}」缺少 spriteId。`);
      if (entity.interaction && typeof entity.interaction.prompt !== 'string') throw new DataLoadError(dataset, `地圖實體「${entity.id}」缺少繁中互動提示。`);
    });
    const roamingEnemies=scene.roamingEnemies??[];
    if(!Array.isArray(roamingEnemies))throw new DataLoadError(dataset,`場景「${scene.id}」的 roamingEnemies 必須是陣列。`);
    assertUniqueIds(dataset,scene,roamingEnemies,'遊走敵人');
    roamingEnemies.forEach((enemy)=>{assertMapPoint(dataset,scene,{x:enemy.spawnX,y:enemy.spawnY},`遊走敵人「${enemy.id}」出生點`);if(enemy.mapId!==scene.id||typeof enemy.encounterId!=='string'||typeof enemy.sprite!=='string')throw new DataLoadError(dataset,`遊走敵人「${enemy.id}」資料不完整。`);});
    assertUniqueIds(dataset, scene, triggers, 'Trigger');
    triggers.forEach((trigger) => {
      assertMapPoint(dataset, scene, trigger.position, `Trigger「${trigger.id}」`);
      if (!['exit', 'quest', 'puzzle', 'battle', 'boss', 'event'].includes(trigger.type)) throw new DataLoadError(dataset, `Trigger「${trigger.id}」的 type 無效。`);
      if (!['enter', 'interact'].includes(trigger.activation)) throw new DataLoadError(dataset, `Trigger「${trigger.id}」的 activation 無效。`);
      if (trigger.activation === 'interact' && typeof trigger.prompt !== 'string') throw new DataLoadError(dataset, `Trigger「${trigger.id}」缺少繁中互動提示。`);
      if (trigger.type === 'exit' && (!sceneIds.has(trigger.to) || trigger.to === scene.id)) throw new DataLoadError(dataset, `出口 Trigger「${trigger.id}」指向無效場景。`);
      if(trigger.type==='exit'&&trigger.targetPosition){const targetScene=scenes.find((item)=>item.id===trigger.to);assertMapPoint(dataset,targetScene,trigger.targetPosition,`出口 Trigger「${trigger.id}」的目的地`);if(!['up','down','left','right'].includes(trigger.targetDirection))throw new DataLoadError(dataset,`出口 Trigger「${trigger.id}」缺少有效的目的地方向。`);}
      if(trigger.type==='exit'&&trigger.destinationWhen){const destination=trigger.destinationWhen;const targetScene=scenes.find((item)=>item.id===destination.to);if(!targetScene||targetScene.id===scene.id||typeof destination.flag!=='string'||typeof destination.prompt!=='string')throw new DataLoadError(dataset,`出口 Trigger「${trigger.id}」的條件目的地無效。`);if(destination.targetPosition){assertMapPoint(dataset,targetScene,destination.targetPosition,`出口 Trigger「${trigger.id}」的條件目的地`);if(!['up','down','left','right'].includes(destination.targetDirection))throw new DataLoadError(dataset,`出口 Trigger「${trigger.id}」的條件目的地方向無效。`);}}
      if (trigger.type === 'quest' && !trigger.questId) throw new DataLoadError(dataset, `任務 Trigger「${trigger.id}」缺少 questId。`);
      if (trigger.type === 'puzzle' && !trigger.puzzleId) throw new DataLoadError(dataset, `解謎 Trigger「${trigger.id}」缺少 puzzleId。`);
      if (trigger.type === 'battle' && !trigger.enemyId) throw new DataLoadError(dataset, `戰鬥 Trigger「${trigger.id}」缺少 enemyId。`);
      if (trigger.type === 'boss' && !trigger.bossId) throw new DataLoadError(dataset, `Boss Trigger「${trigger.id}」缺少 bossId。`);
    });
  });
};

export class DataLoader {
  #cache = new Map();

  constructor({ baseUrl = './data/', fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('DataLoader 需要 fetch 函式。');
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.fetchImpl = fetchImpl;
  }

  async load(name, { force = false } = {}) {
    const schema = DATA_MANIFEST[name];
    if (!schema) throw new DataLoadError(name, '未定義的資料集。');
    if (!force && this.#cache.has(name)) return structuredClone(this.#cache.get(name));
    let response;
    try {
      response = await this.fetchImpl.call(globalThis, `${this.baseUrl}${schema.file}`, { cache: 'no-store' });
    } catch (error) {
      throw new DataLoadError(name, '無法連線到資料檔案。', error);
    }
    if (!response?.ok) throw new DataLoadError(name, `HTTP ${response?.status ?? '未知錯誤'}。`);
    let document;
    try { document = await response.json(); }
    catch (error) { throw new DataLoadError(name, 'JSON 格式無效。', error); }
    const value = this.validate(name, document);
    this.#cache.set(name, value);
    return structuredClone(value);
  }

  async loadAll() {
    const entries = await Promise.all(Object.keys(DATA_MANIFEST).map(async (name) => [name, await this.load(name)]));
    return Object.fromEntries(entries);
  }

  validate(name, document) {
    const schema = DATA_MANIFEST[name];
    if (!isRecord(document)) throw new DataLoadError(name, '根節點必須是物件。');
    if (!(schema.root in document)) throw new DataLoadError(name, `缺少根欄位「${schema.root}」。`);
    const value = document[schema.root];
    if (schema.shape === 'array' && !Array.isArray(value)) throw new DataLoadError(name, `欄位「${schema.root}」必須是陣列。`);
    if (schema.shape === 'object' && !isRecord(value)) throw new DataLoadError(name, `欄位「${schema.root}」必須是物件。`);
    const records = Array.isArray(value) ? value : Object.entries(value).map(([id, record]) => ({ id, ...record }));
    records.forEach((record, index) => {
      if (!isRecord(record)) throw new DataLoadError(name, `第 ${index + 1} 筆資料必須是物件。`);
      const missing = schema.required.filter((field) => !(field in record));
      if (missing.length) throw new DataLoadError(name, `第 ${index + 1} 筆缺少必要欄位：${missing.join('、')}。`);
    });
    if (name === 'scenes') validateMapScenes(name, records);
    return value;
  }

  clear(name) { name ? this.#cache.delete(name) : this.#cache.clear(); }
  has(name) { return this.#cache.has(name); }
}
