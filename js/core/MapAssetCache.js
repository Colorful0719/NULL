const sceneAssetUrls = (scene) => {
  const urls = [scene?.mapArt?.baseImage, scene?.mapArt?.objectImage, scene?.mapArt?.playerSprite?.sheet];
  for (const entity of scene?.entities ?? []) urls.push(entity.mapSprite?.sheet);
  for (const enemy of scene?.roamingEnemies ?? []) urls.push(enemy.sprite);
  return [...new Set(urls.filter(Boolean))];
};

export class MapAssetCache {
  constructor({ ImageClass = globalThis.Image } = {}) {
    this.ImageClass = ImageClass;
    this.entries = new Map();
  }

  preload(url) {
    if (!url || typeof this.ImageClass !== 'function') return Promise.resolve(false);
    if (this.entries.has(url)) return this.entries.get(url);
    const promise = new Promise((resolve) => {
      const image = new this.ImageClass();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode?.(); } catch {}
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = url;
      if (image.complete && image.naturalWidth > 0) image.onload();
    });
    this.entries.set(url, promise);
    return promise;
  }

  preloadScene(scene) {
    return Promise.all(sceneAssetUrls(scene).map((url) => this.preload(url)));
  }

  preloadNeighbors(scene, scenes) {
    const ids = new Set((scene?.connections ?? []).map((connection) => connection.to));
    for (const trigger of scene?.triggers ?? []) {
      if (trigger.type !== 'exit') continue;
      ids.add(trigger.to);
      if (trigger.destinationWhen?.to) ids.add(trigger.destinationWhen.to);
    }
    return Promise.all([...ids].map((id) => this.preloadScene(scenes.find((candidate) => candidate.id === id))));
  }

  has(url) { return this.entries.has(url); }
}

