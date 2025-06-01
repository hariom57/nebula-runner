import * as THREE from 'three';

export default class Player {
  constructor(gltfScene) {
    this.mesh = gltfScene;
    this.mesh.scale.set(0.8, 0.8, 0.8);
    this.score = 0;
    this.initMaterials();
  }

  initMaterials() {
    this.mesh.traverse(child => {
      if(child.isMesh) {
        child.material.roughness = 0.18;
        child.material.metalness = 0.92;
        child.material.emissive = new THREE.Color(0x00e0ff);
        child.material.emissiveIntensity = 1.2;
      }
    });
  }

  update(delta) {
    // Movement logic
  }
}
