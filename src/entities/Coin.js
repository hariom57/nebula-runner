import * as THREE from 'three';

export default class Coin {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        roughness: 0.08,
        metalness: 0.92,
        emissive: 0xffe066,
        emissiveIntensity: 2.0
      })
    );
    this.velocity = new THREE.Vector3(0, 0, -0.25);
  }

  update(delta) {
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta * 60));
    this.mesh.rotation.y += 0.1 * delta * 60;
  }
}
