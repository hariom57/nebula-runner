import * as THREE from 'three';

export default class ParticleSystem {
  constructor() {
    this.particles = [];
    this.textureLoader = new THREE.TextureLoader();
    this.fireTexture = this.textureLoader.load('assets/textures/fire_particle.png');
  }

  createExplosion(position) {
    const geometry = new THREE.BufferGeometry();
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for(let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.2 + Math.random() * 7.5;
      
      positions[i * 3] = position.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = position.y + radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = position.z + radius * Math.cos(phi);
      
      color.setHSL(0.04 + Math.random() * 0.09, 1, 0.5 + Math.random() * 0.2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 6.0,
      vertexColors: true,
      map: this.fireTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    this.particles.push({ mesh: particles, life: 0 });
    return particles;
  }

  update(delta) {
    this.particles.forEach((p, i) => {
      p.life += delta;
      p.mesh.material.opacity = 1 - p.life;
      if(p.life > 1) {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    });
  }
}
