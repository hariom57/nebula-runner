import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { isValidScore } from '../utils/security.js';
import UISystem from '../systems/UISystem.js';
import EnvironmentManager from '../systems/EnvironmentManager.js';

export default class GameEngine {
  constructor(levelConfig) {
    this.uiSystem = new UISystem();
    this.levelConfig = levelConfig;
    
    // Loading state management
    this.isFullyLoaded = false;
    this.assetsLoaded = false;
    this.sceneReady = false;
    this.loadingSteps = {
      assets: false,
      environment: false,
      postProcessing: false,
      scene: false
    };
    
    this.loadingManager = levelConfig.loadingManager || new THREE.LoadingManager();
    
    // Mobile detection
    this.isMobile = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    this.isLowEndDevice = navigator.hardwareConcurrency <= 4 || 
                         navigator.deviceMemory <= 4 || 
                         this.isMobile;
    
    // Game state
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
    this.flashMesh = null;
    this.flashAlpha = 0;
    this.animationFrameId = null;

    // Assets
    this.fireTexture = new THREE.TextureLoader(this.loadingManager).load('assets/fire_particle.png');
    this.asteroidModels = [];
    this.asteroidModelCount = 3;

    // HUD data
    this.hudData = {
      laneHistory: [],
      missionStartTime: Date.now(),
      currentLane: 1,
      velocity: 847,
      enginePower: 4.2,
      shieldPower: 100,
      altitude: 2.4
    };

    this.hudUpdateTimer = 0;
  }

  getAssetQuality() {
    if (this.isLowEndDevice) {
      return 'low';
    } else if (this.isMobile) {
      return 'medium';
    }
    return 'high';
  }

  checkLoadingComplete() {
    const allStepsComplete = Object.values(this.loadingSteps).every(step => step === true);
    
    if (allStepsComplete && !this.isFullyLoaded) {
      this.isFullyLoaded = true;
      setTimeout(() => {
        if (window.sciFiLoader) {
          window.sciFiLoader.hide();
        }
      }, 200);
    }
  }

  updateLoadingProgress() {
    const completedSteps = Object.values(this.loadingSteps).filter(step => step === true).length;
    const progress = (completedSteps / Object.keys(this.loadingSteps).length) * 100;
    
    if (window.sciFiLoader) {
      window.sciFiLoader.updateProgress(progress);
    }
  }

  async init() {
    this.initEngine();
    this.createScene();
    this.createStarfield();
    this.createPostProcessing();
    
    // Mark post-processing as complete
    this.loadingSteps.postProcessing = true;
    this.updateLoadingProgress();

    this.optimizeForMobile();
    this.initMobileUI();
    this.handleResize();

    this.environmentManager = new EnvironmentManager(this.scene, this.renderer, this.loadingManager);
    this.environmentManager.switchEnvironment(this.levelConfig);
    
    // Mark environment as complete after a small delay
    setTimeout(() => {
      this.loadingSteps.environment = true;
      this.updateLoadingProgress();
    }, 100);

    await this.loadAssets();
    
    // Mark assets as complete
    this.loadingSteps.assets = true;
    this.updateLoadingProgress();

    this.setupEventListeners();
    
    // Mark scene setup as complete
    this.loadingSteps.scene = true;
    this.updateLoadingProgress();
    
    // Check if loading is complete
    this.checkLoadingComplete();
    
    // Only start game loop after everything is loaded
    if (this.isFullyLoaded) {
      this.gameLoop();
    } else {
      const waitForLoading = () => {
        if (this.isFullyLoaded) {
          this.gameLoop();
        } else {
          setTimeout(waitForLoading, 50);
        }
      };
      waitForLoading();
    }
  }

  async loadAssets() {
    const gltfLoader = new GLTFLoader(this.loadingManager);

    // Load player
    await new Promise(resolve => {
      gltfLoader.load('assets/player.glb', glb => {
        this.player = glb.scene;
        this.player.scale.set(0.6, 0.6, 0.6);
        this.player.traverse(child => {
          if (child.isMesh) {
            child.material.color.set(0x00e0ff);
            child.material.roughness = 0.18;
            child.material.metalness = 0.92;
            child.castShadow = !this.isMobile; // No shadows on mobile
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

    // Load asteroid models with quality adjustment
    const asteroidFiles = ['asteroid1.glb', 'asteroid3.glb', 'asteroid4.glb'];
    const maxAsteroids = this.isMobile ? 2 : 3; // Fewer models on mobile
    
    const promises = asteroidFiles.slice(0, maxAsteroids).map(file => new Promise(res => {
      gltfLoader.load(
        `assets/${file}`,
        glb => {
          glb.scene.traverse(child => {
            if (child.isMesh) {
              child.castShadow = !this.isMobile;
              child.receiveShadow = !this.isMobile;
            }
          });
          this.asteroidModels.push(glb.scene);
          res();
        },
        undefined,
        err => {
          console.warn(`Could not load assets/${file}`, err);
          res();
        }
      );
    }));
    await Promise.all(promises);
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
      antialias: !this.isMobile, // Disable antialiasing on mobile
      powerPreference: "high-performance"
    });
    
    // Mobile-specific renderer optimizations
    if (this.isMobile) {
      this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
      this.renderer.shadowMap.enabled = false;
    } else {
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  createScene() {
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 10, 7);
    if (!this.isMobile) {
      directional.castShadow = true;
      directional.shadow.mapSize.width = 1024;
      directional.shadow.mapSize.height = 1024;
    }
    this.scene.add(directional);

    // Flash mesh
    const flashGeo = new THREE.PlaneGeometry(2, 2);
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.flashMesh.position.z = -0.5;
    this.flashMesh.frustumCulled = false;
    this.scene.add(this.flashMesh);
  }

  createStarfield() {
    const particleMultiplier = this.isMobile ? 0.3 : 1.0;
    const layerCount = this.isMobile ? 2 : 4;
    
    for (let i = 0; i < layerCount; i++) {
      const geo = new THREE.BufferGeometry();
      const count = Math.floor((500 + i * 300) * particleMultiplier);
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
    
    if (!this.isMobile) {
      // Only add expensive effects on desktop
      const ssaoPass = new SSAOPass(this.scene, this.camera, 1024, 1024);
      ssaoPass.kernelRadius = 0.32;
      ssaoPass.minDistance = 0.0005;
      ssaoPass.maxDistance = 0.07;
      this.composer.addPass(ssaoPass);
      this.ssaoPass = ssaoPass;
    }

    // Bloom pass with mobile optimization
    const bloomIntensity = this.isMobile ? 0.3 : 0.82;
    const bloomRadius = this.isMobile ? 0.1 : 0.23;
    const bloomThreshold = this.isMobile ? 0.5 : 0.88;
    
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomIntensity, bloomRadius, bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    if (!this.isMobile) {
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms["offset"].value = 0.92;
      vignettePass.uniforms["darkness"].value = 1.25;
      this.composer.addPass(vignettePass);
    }

    this.composer.addPass(new OutputPass());
  }

  optimizeForMobile() {
    if (this.isMobile) {
      console.log('Mobile device detected - applying optimizations');
      
      // Further reduce effects for low-end devices
      if (this.isLowEndDevice && this.bloomPass) {
        this.bloomPass.strength = 0.2;
        this.bloomPass.radius = 0.05;
      }
    }
  }

  initMobileUI() {
    if (this.isMobile) {
      // Hide complex HUD elements
      const bottomLeft = document.querySelector('.bottom-left');
      if (bottomLeft) bottomLeft.style.display = 'none';
      
      // Simplify scoring display
      const scoring = document.getElementById('scoring');
      if (scoring) {
        scoring.style.fontSize = '24px';
        scoring.style.padding = '15px';
      }
      
      // Hide less important HUD panels
      const hudPanels = document.querySelectorAll('.hud-panel');
      hudPanels.forEach((panel, index) => {
        if (index > 1) {
          panel.style.display = 'none';
        }
      });
    }
  }

  gameLoop() {
    const delta = this.clock.getDelta();
    if (!this.gameOver) {
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
      this.animateStarfield();
      this.animateFloatingCubes(delta);
      this.updatePlayer(delta);
      this.spawnEntities(delta);
      this.updateEntities(delta);
      this.updateScore();
      if (!this.isMobile) { // Skip complex HUD updates on mobile
        this.updateHUD(delta);
      }
      
      // Update environment particles
      if (this.environmentManager) {
        this.environmentManager.updateParticles(delta);
      }
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.04;
      this.flashMat.opacity = Math.max(0, this.flashAlpha);
    }
    this.composer.render();
  }

  updateHUD(delta) {
    this.hudUpdateTimer += delta;
    
    if (this.hudUpdateTimer > 0.1) {
      const laneValue = this.currentLane === 0 ? 1 : (this.currentLane === 1 ? 0 : -1);
      this.hudData.laneHistory.push(laneValue);
      if (this.hudData.laneHistory.length > 150) {
        this.hudData.laneHistory.shift();
      }
      
      const elapsed = Math.floor((Date.now() - this.hudData.missionStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      const missionTimeEl = document.getElementById('missionTime');
      if (missionTimeEl) missionTimeEl.textContent = `${minutes}:${seconds}`;
      
      const deviationEl = document.getElementById('currentDeviation');
      if (deviationEl) deviationEl.textContent = laneValue.toFixed(1);
      
      this.hudData.velocity = 847 + Math.sin(Date.now() * 0.001) * 50;
      this.hudData.enginePower = 4.2 + Math.random() * 0.3;
      this.hudData.altitude = 2.4 + Math.sin(Date.now() * 0.0005) * 0.8;
      
      const speedValueEl = document.getElementById('speedValue');
      if (speedValueEl) speedValueEl.textContent = Math.floor(this.hudData.velocity);
      
      const velocityEl = document.getElementById('velocity');
      if (velocityEl) velocityEl.textContent = `${Math.floor(this.hudData.velocity)} m/s`;
      
      const enginePowerEl = document.getElementById('enginePower');
      if (enginePowerEl) enginePowerEl.textContent = `${this.hudData.enginePower.toFixed(1)}kW`;
      
      const altitudeEl = document.getElementById('altitude');
      if (altitudeEl) altitudeEl.textContent = `${this.hudData.altitude.toFixed(1)}km`;
      
      this.drawNavGraph();
      this.drawRadar();
      
      this.hudUpdateTimer = 0;
    }
  }

  drawNavGraph() {
    const canvas = document.getElementById('navGraph');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0, 255, 208, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (canvas.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(0, 255, 208, 0.5)';
    ctx.lineWidth = 2;
    const centerY = canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    if (this.hudData.laneHistory.length > 1) {
      ctx.strokeStyle = '#00ffd0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      this.hudData.laneHistory.forEach((value, i) => {
        const x = (i / this.hudData.laneHistory.length) * canvas.width;
        const y = centerY - (value * 30);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  drawRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 5;

    ctx.strokeStyle = 'rgba(0, 255, 208, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    const sweepAngle = (Date.now() * 0.002 + Math.PI) % (Math.PI * 2);
    ctx.strokeStyle = '#00ffd0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(sweepAngle) * radius,
      centerY + Math.sin(sweepAngle) * radius
    );
    ctx.stroke();

    this.asteroids.forEach(asteroid => {
      if (asteroid.position.z > -20 && asteroid.position.z < 5) {
        const distance = Math.abs(asteroid.position.z) / 20;
        const angle = Math.atan2(asteroid.position.x, -asteroid.position.z);
        const blipX = centerX + Math.sin(angle) * distance * radius * 0.8;
        const blipY = centerY - Math.cos(angle) * distance * radius * 0.8;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(blipX, blipY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
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
    const spawnRate = this.isMobile ? 0.064 : 0.032; // Slower spawn on mobile
    if (this.floatingCubeTimer > spawnRate) {
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
      emissiveIntensity: this.isMobile ? 1.0 : 1.5, // Reduced intensity on mobile
      transparent: true,
      opacity: 1.0
    });
    const cubeSize = this.isMobile ? 0.1 : 0.13; // Smaller cubes on mobile
    const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), mat);
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
    
    const asteroidRate = this.isMobile ? 1.2 : 0.95; // Slower spawn on mobile
    const coinRate = this.isMobile ? 1.5 : 1.18;
    
    if (this.asteroidTimer > asteroidRate) {
      this.spawnAsteroid();
      this.asteroidTimer = 0;
    }
    if (this.coinTimer > coinRate) {
      this.spawnCoin();
      this.coinTimer = 0;
    }
  }

  spawnAsteroid() {
    const lane = Math.floor(Math.random() * 3);
    let asteroid;
    if (this.asteroidModels.length > 0) {
      const baseAsteroid = this.asteroidModels[Math.floor(Math.random() * this.asteroidModels.length)];
      asteroid = baseAsteroid.clone(true);
      asteroid.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const scale = this.isMobile ? 0.2 : 0.25; // Smaller on mobile
      asteroid.scale.set(scale, scale, scale);
    } else {
      const geometry = this.isMobile ? 
        new THREE.IcosahedronGeometry(1.2, 1) : // Lower detail on mobile
        new THREE.IcosahedronGeometry(1.35, 2);
      asteroid = new THREE.Mesh(
        geometry,
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
    const segments = this.isMobile ? 16 : 32; // Lower detail on mobile
    const coin = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, segments, segments),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        roughness: 0.08,
        metalness: 0.92,
        emissive: 0xffe066,
        emissiveIntensity: this.isMobile ? 1.0 : 1.5
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
        this.gameOver = true;
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
    const particleCount = this.isMobile ? 60 : 120; // Fewer particles on mobile
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.2 + Math.random() * 7.5;
      positions.push(
        position.x + radius * Math.sin(phi) * Math.cos(theta),
        position.y + radius * Math.sin(phi) * Math.sin(theta),
        position.z + radius * Math.cos(phi)
      );
      color.setHSL(0.04 + Math.random() * 0.09, 1, 0.5 + Math.random() * 0.2);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: this.isMobile ? 4.0 : 6.0,
      vertexColors: true,
      map: this.fireTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    let life = 0;
    const animate = () => {
      life += 0.025;
      material.size = (this.isMobile ? 4.0 : 6.0) * (1 - life);
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

  triggerFlash() {
    this.flashAlpha = 1.0;
    this.flashMat.opacity = 1.0;
  }

  updateScore() {
    this.score++;
    const scoreSpan = document.getElementById('score')?.querySelector('span');
    if (scoreSpan) scoreSpan.textContent = this.score.toLocaleString();
  }

  endGame() {
    this.gameOver = true;
    this.uiSystem.showGameOver(this.score);
    
    if (isValidScore(this.score)) {
      this.uiSystem.updatePersonalBest(this.score);
      this.uiSystem.updateGlobalLeaderboard(this.score);
    } else {
      console.error('Invalid score detected:', this.score);
    }

    if (this.score > 0) {
      this.uiSystem.updatePersonalBest(this.score);
    }
    
    if (this.bloomPass) this.bloomPass.strength = 1.1;
    const gameOverEl = document.getElementById('gameOver');
    if (gameOverEl) gameOverEl.style.display = 'block';
    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = this.score.toLocaleString();
  }

  setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', e => {
      if (this.gameOver) return;
      if (['ArrowLeft', 'a'].includes(e.key)) {
        this.currentLane = Math.max(0, this.currentLane - 1);
      }
      if (['ArrowRight', 'd'].includes(e.key)) {
        this.currentLane = Math.min(2, this.currentLane + 1);
      }
    });

    // Touch controls for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    document.getElementById('gameCanvas').addEventListener('touchstart', e => {
      if (this.gameOver) return;
      touchStartX = e.changedTouches[0].screenX;
      e.preventDefault();
    }, { passive: false });

    document.getElementById('gameCanvas').addEventListener('touchend', e => {
      if (this.gameOver) return;
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
      e.preventDefault();
    }, { passive: false });

    // Prevent mobile browser quirks
    document.addEventListener('touchmove', e => {
      if (!this.gameOver) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('contextmenu', e => {
      if (e.target.id === 'gameCanvas') {
        e.preventDefault();
      }
    });

    // Resize handlers
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  handleSwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = endX - startX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe right - move right
        this.currentLane = Math.min(2, this.currentLane + 1);
      } else {
        // Swipe left - move left
        this.currentLane = Math.max(0, this.currentLane - 1);
      }
    }
  }

  cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    THREE.Cache.clear();
    while(this.scene.children.length > 0) { 
      this.scene.remove(this.scene.children[0]); 
    }
    if (this.environmentManager) {
      this.environmentManager.dispose();
    }
    this.renderer.dispose();
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);

    if (this.composer) {
      this.composer.setSize(width, height);

      if (this.bloomPass) {
        this.bloomPass.setSize(width, height);
      }
      if (this.ssaoPass) {
        this.ssaoPass.setSize(width, height);
      }
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
