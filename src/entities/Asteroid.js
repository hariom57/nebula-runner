import * as THREE from 'three';

export default class Asteroid {
  constructor(gltfScene) {
    this.mesh = gltfScene.clone();
    this.mesh.scale.set(1.1 + Math.random() * 0.5, 1.1 + Math.random() * 0.5, 1.1 + Math.random() * 0.5);
    this.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this.velocity = new THREE.Vector3(0, 0, -0.25);
  }

  update(delta) {
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta * 60));
    this.mesh.rotation.x += 0.005 * delta * 60;
    this.mesh.rotation.y += 0.005 * delta * 60;
  }
}
