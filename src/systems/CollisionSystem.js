export default class CollisionSystem {
  update(entities) {
    entities.asteroids.forEach(asteroid => {
      if(this.checkCollision(entities.player.mesh, asteroid.mesh)) {
        this.handleCollision();
      }
    });
  }

  checkCollision(obj1, obj2) {
    return obj1.position.distanceTo(obj2.position) < 1.5;
  }

  handleCollision() {
    // Collision response logic
  }
}
