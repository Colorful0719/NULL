export class CameraController {
  constructor({ viewport, world }) { this.viewport = viewport; this.world = world; }

  static calculate({ viewportWidth, viewportHeight, worldWidth, worldHeight, targetX, targetY }) {
    const maxX = Math.max(0, worldWidth - viewportWidth);
    const maxY = Math.max(0, worldHeight - viewportHeight);
    return {
      x: Math.max(0, Math.min(maxX, targetX - viewportWidth / 2)),
      y: Math.max(0, Math.min(maxY, targetY - viewportHeight / 2)),
      maxX, maxY
    };
  }

  follow(position, grid) {
    if (!this.viewport || !this.world || !grid?.width || !grid?.height) return;
    const viewportWidth = this.viewport.clientWidth;
    const viewportHeight = this.viewport.clientHeight;
    const worldWidth = this.world.offsetWidth;
    const worldHeight = this.world.offsetHeight;
    const targetX = (position.x + 0.5) * worldWidth / grid.width;
    const targetY = (position.y + 0.5) * worldHeight / grid.height;
    const camera = CameraController.calculate({ viewportWidth, viewportHeight, worldWidth, worldHeight, targetX, targetY });
    this.world.style.setProperty('--camera-x', `${-camera.x}px`);
    this.world.style.setProperty('--camera-y', `${-camera.y}px`);
    this.viewport.dataset.cameraActive = String(camera.maxX > 0 || camera.maxY > 0);
  }
}
