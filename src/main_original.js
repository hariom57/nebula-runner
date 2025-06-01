import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

class NebulaRunner {
  constructor() {
    this.currentLane = 1;
    this.asteroids = [];
    this.coins = [];
    this.score = 0;
    this.coinsCollected = 0;
    this.gameOver = false;
    this.lanePositions = [-4, 0, 4];
    this.asteroidTimer = 0;
    this.coinTimer = 0;
    this.floatingCubes = [];
    this.floatingCubeTimer = 0;
    this.shake = 0;
    this.playerLight = null;
    this.bgStars = [];
    this.fireTexture = new THREE.TextureLoader().load('assets/fire_particle.png');
    this.flashMesh = null;
    this.flashAlpha = 0;

    //custom asteroids
    this.asteroidModels = [];
    this.asteroidModelCount = 4; // variation k liye

    this.initEngine();
    this.createScene();
    this.createStarfield();
    this.createPostProcessing();
    this.loadAssets().then(() => {
      this.setupEventListeners();
      this.gameLoop();
    });
  }

  async loadAssets() {
    // Load player
    await new Promise(resolve => {
      // new GLTFLoader().load('assets/player.glb', glb => {
      new GLTFLoader().load('assets/player_updated.glb', glb => {
        this.player = glb.scene;
        this.player.scale.set(0.6, 0.6, 0.6);
        this.player.traverse(child => {
          if (child.isMesh) {
            child.material.color.set(0x00e0ff);
            child.material.roughness = 0.18;
            child.material.metalness = 0.92;
            // child.material.emissive = new THREE.Color(0x00e0ff);
            // child.material.emissiveIntensity = 1.4;
            child.castShadow = true;
          }
        });
        this.scene.add(this.player);

        if (!this.playerLight) {
          this.playerLight = new THREE.PointLight(0x00fff7, 2.2, 16);
          this.scene.add(this.playerLight);
        }

        if (glb.animations.length) {
          this.mixer = new THREE.AnimationMixer(this.player);
          this.mixer.clipAction(glb.animations[0]).play();
        }
        resolve();
      }, undefined, () => {
        this.createFallbackPlayer();
        resolve();
      });
    });

    // Load all asteroid models
    const loader = new GLTFLoader();
    const promises = [];
    for (let i = 1; i <= this.asteroidModelCount; i++) {
      promises.push(new Promise(res => {
        loader.load(
          `assets/asteroid${i}.glb`,
          glb => {
            // Center and scale asteroid if needed
            glb.scene.traverse(child => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            this.asteroidModels.push(glb.scene);
            res();
          },
          undefined,
          err => {
            console.warn(`Could not load assets/asteroid${i}.glb`, err);
            res();
          }
        );
      }));
    }
    await Promise.all(promises);
    if (this.asteroidModels.length === 0) {
      console.error('No asteroid models loaded! Falling back to spheres.');
    }
  }

  createFallbackPlayer() {
    const material = new THREE.MeshStandardMaterial({
      color: 0x00e0ff,
      roughness: 0.18,
      metalness: 0.92,
      emissive: 0x00e0ff,
      emissiveIntensity: 1.2
    });
    this.player = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 12), material);
    this.scene.add(this.player);

    if (!this.playerLight) {
      this.playerLight = new THREE.PointLight(0x00fff7, 2.2, 16);
      this.scene.add(this.playerLight);
    }
  }

  initEngine() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181c28);
    this.scene.fog = new THREE.FogExp2(0x181c28, 0.025);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 3.5, 12);

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  createScene() {
    // Ambient and directional light for global illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x14202c,
        roughness: 0.25,
        metalness: 0.85,
        envMapIntensity: 1.8
      })
    );
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Fullscreen white flash mesh (for explosion effect)
    const flashGeo = new THREE.PlaneGeometry(2, 2);
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.flashMesh.position.z = -0.5;
    this.flashMesh.frustumCulled = false;
    this.scene.add(this.flashMesh);
  }

  createStarfield() {
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BufferGeometry();
      const count = 500 + i * 300;
      const pos = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) {
        pos[j*3] = (Math.random() - 0.5) * (600 + i * 200);
        pos[j*3+1] = (Math.random() - 0.5) * (300 + i * 100);
        pos[j*3+2] = -100 - i * 300 - Math.random() * 500;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08 + i * 0.05,
        opacity: 0.15 - i * 0.03,
        transparent: true
      });
      const stars = new THREE.Points(geo, mat);
      this.scene.add(stars);
      this.bgStars.push(stars);
    }
  }

  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    const ssaoPass = new SSAOPass(this.scene, this.camera, 1024, 1024);
    ssaoPass.kernelRadius = 0.32;
    ssaoPass.minDistance = 0.0005;
    ssaoPass.maxDistance = 0.07;
    this.composer.addPass(ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.82, 0.23, 0.88
    );
    this.composer.addPass(this.bloomPass);

    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms["offset"].value = 0.92;
    vignettePass.uniforms["darkness"].value = 1.25;
    this.composer.addPass(vignettePass);

    this.composer.addPass(new OutputPass());
  }

  gameLoop() {
    const delta = this.clock.getDelta();
    if (!this.gameOver) {
      requestAnimationFrame(() => this.gameLoop());
      this.animateStarfield();
      this.animateFloatingCubes(delta);
      this.updatePlayer(delta);
      this.spawnEntities(delta);
      this.updateEntities(delta);
      this.updateScore();
    }
    // Animate fullscreen flash fade-out
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.04;
      this.flashMat.opacity = Math.max(0, this.flashAlpha);
    }
    this.composer.render();
  }

  animateStarfield() {
    for (let i = 0; i < this.bgStars.length; i++) {
      this.bgStars[i].position.z += 0.05 + i * 0.05;
      if (this.bgStars[i].position.z > 0) {
        this.bgStars[i].position.z = -400 - i * 300;
      }
    }
  }

  animateFloatingCubes(delta) {
    for (let i = this.floatingCubes.length - 1; i >= 0; i--) {
      const cube = this.floatingCubes[i];
      cube.position.z += 1.05 * (delta * 60);
      cube.rotation.x += delta * 0.8;
      cube.rotation.y += delta * 0.8;
      if (cube.position.z > 0) {
        this.scene.remove(cube);
        this.floatingCubes.splice(i, 1);
      }
    }
    this.floatingCubeTimer += delta;
    if (this.floatingCubeTimer > 0.032) {
      this.spawnFloatingCube();
      this.floatingCubeTimer = 0;
    }
  }

  spawnFloatingCube() {
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.1,
      metalness: 0.7,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 1.0
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), mat);
    cube.position.set(
      (Math.random() - 0.5) * 13,
      (Math.random() - 0.5) * 10 + 2,
      -14 - Math.random() * 320
    );
    this.scene.add(cube);
    this.floatingCubes.push(cube);
  }

  updatePlayer(delta) {
    if (!this.player) return;
    const targetX = this.lanePositions[this.currentLane];
    this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, targetX, 0.19);
    this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, (targetX - this.player.position.x) * 0.09, 0.25);
    this.player.position.y = THREE.MathUtils.lerp(
      this.player.position.y,
      Math.sin(Date.now() * 0.001) * 0.3 + 1,
      0.13
    );
    if (this.player.material) {
      this.player.material.emissiveIntensity = Math.abs(Math.sin(Date.now() * 0.003)) * 1.0 + 1.0;
    }
    if (this.playerLight && this.player) {
      this.playerLight.position.copy(this.player.position).add(new THREE.Vector3(0, 1, 2));
    }
    if (this.mixer) this.mixer.update(delta);

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x * 0.35, 0.14);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.player.position.y + 2.2, 0.13);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.player.position.z + 7, 0.10);
    this.camera.lookAt(this.player.position.x, this.player.position.y, this.player.position.z - 7);

    if (this.shake > 0.01) this.shake *= 0.85;
    else this.shake = 0;
  }

  spawnEntities(delta) {
    this.asteroidTimer += delta;
    this.coinTimer += delta;
    if (this.asteroidTimer > 0.95) {
      this.spawnAsteroid();
      this.asteroidTimer = 0;
    }
    if (this.coinTimer > 1.18) {
      this.spawnCoin();
      this.coinTimer = 0;
    }
  }

  spawnAsteroid() {
    const lane = Math.floor(Math.random() * 3);
    let asteroid;
    if (this.asteroidModels.length > 0) {
      //randomness k liye
      const baseAsteroid = this.asteroidModels[Math.floor(Math.random() * this.asteroidModels.length)];
      asteroid = baseAsteroid.clone(true);
      asteroid.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      // const scale = 1.1 + Math.random() * 0.5;
      const scale = 0.25;
      asteroid.scale.set(scale, scale, scale);
    } else {
      // Fallback: purple sphere
      asteroid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.35, 2),
        new THREE.MeshStandardMaterial({
          color: 0x7d4cff,
          roughness: 0.33,
          metalness: 0.7,
          emissive: 0x5e3cff,
          emissiveIntensity: 0.7
        })
      );
      const scale = 1.1 + Math.random() * 0.5;
      asteroid.scale.set(scale, scale, scale);
    }
    asteroid.position.set(this.lanePositions[lane], 1, -40);
    this.asteroids.push(asteroid);
    this.scene.add(asteroid);
  }

  spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    const coin = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        roughness: 0.08,
        metalness: 0.92,
        emissive: 0xffe066,
        emissiveIntensity: 1.5
      })
    );
    coin.position.set(this.lanePositions[lane], 1, -40);
    this.coins.push(coin);
    this.scene.add(coin);
  }

  updateEntities(delta) {
    this.updateAsteroids(delta);
    this.updateCoins(delta);
  }

  updateAsteroids(delta) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.position.z += (0.25 + this.score * 0.0005) * delta * 60;
      asteroid.rotation.x += delta * 0.55;
      asteroid.rotation.y += delta * 0.55;
      if (asteroid.position.z > 10) {
        this.scene.remove(asteroid);
        this.asteroids.splice(i, 1);
      } else if (this.player && this.checkSphereCollision(this.player, asteroid, 1.35)) {
        this.createFireExplosion(this.player.position.clone());
        this.triggerFlash();
        this.handleCollision();
        this.endGame();
      }
    }
  }

  updateCoins(delta) {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.position.z += (0.25 + this.score * 0.0005) * delta * 60;
      coin.rotation.y += delta * 2.8;
      if (coin.position.z > 10) {
        this.scene.remove(coin);
        this.coins.splice(i, 1);
      } else if (this.player && this.checkSphereCollision(this.player, coin, 1.1)) {
        this.coinsCollected += 1;
        const coinSpan = document.getElementById('coins')?.querySelector('span');
        if (coinSpan) {
          coinSpan.textContent = this.coinsCollected;
          coinSpan.classList.add('coin-pulse');
          setTimeout(() => coinSpan.classList.remove('coin-pulse'), 300);
        }
        this.scene.remove(coin);
        this.coins.splice(i, 1);
      }
    }
  }

  checkSphereCollision(obj1, obj2, fudge = 1.2) {
    const p1 = obj1.position;
    const p2 = obj2.position;
    return p1.distanceTo(p2) < fudge;
  }

  handleCollision() {
    this.shake = 0.7;
    this.camera.position.z += 0.5;
    setTimeout(() => this.camera.position.z -= 0.5, 100);
  }

  createFireExplosion(position) {
    // Fire-like particle explosion with fire sprite
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < particleCount; i++) {
      // Random direction and speed
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.2 + Math.random() * 7.5; // Large spread!
      positions.push(
        position.x + radius * Math.sin(phi) * Math.cos(theta),
        position.y + radius * Math.sin(phi) * Math.sin(theta),
        position.z + radius * Math.cos(phi)
      );
      // Fire color: yellow/orange/red
      color.setHSL(0.04 + Math.random() * 0.09, 1, 0.5 + Math.random() * 0.2);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 6.0,
      vertexColors: true,
      map: this.fireTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    // Animate/fade out
    let life = 0;
    const animate = () => {
      life += 0.025;
      material.size = 6.0 * (1 - life);
      material.opacity = 1 - life;
      if (life < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  // Fullscreen white flash for explosion
  triggerFlash() {
    this.flashAlpha = 1.0;
    this.flashMat.opacity = 1.0;
  }

  updateScore() {
    this.score++;
    document.getElementById('score').querySelector('span').textContent = this.score.toLocaleString();
  }

  endGame() {
    this.gameOver = true;
    this.bloomPass.strength = 1.1;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = this.score.toLocaleString();
  }

  setupEventListeners() {
    window.addEventListener('keydown', e => {
      if (this.gameOver) return;
      if (['ArrowLeft', 'a'].includes(e.key)) {
        this.currentLane = Math.max(0, this.currentLane - 1);
      }
      if (['ArrowRight', 'd'].includes(e.key)) {
        this.currentLane = Math.min(2, this.currentLane + 1);
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.bloomPass.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}

new NebulaRunner();
