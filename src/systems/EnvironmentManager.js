import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export default class EnvironmentManager {
  constructor(scene, renderer, loadingManager) {
    this.scene = scene;
    this.renderer = renderer;
    this.currentEnvironment = null;
    this.environments = new Map();
    // Use the provided loadingManager for all loaders (fix)
    this.rgbeLoader = new RGBELoader(loadingManager || new THREE.LoadingManager());
    this.cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager || new THREE.LoadingManager());
    this.textureLoader = new THREE.TextureLoader(loadingManager || new THREE.LoadingManager());
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
  }

  setupAsteroidBelt(environment, config) {
    this.rgbeLoader.load(
      'assets/hdri/asteroid-belt.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose();

        environment.skybox = envMap;
        this.scene.background = envMap;
        this.scene.environment = envMap;
      },
      undefined,
      (error) => {
        console.warn('HDRI loading failed, using solid color:', error);
        this.scene.background = new THREE.Color(0x101020);
      }
    );

    environment.lighting.ambient = new THREE.AmbientLight(0x404080, 0.15);
    environment.lighting.directional = new THREE.DirectionalLight(0x8080ff, 0.5);
    environment.lighting.directional.position.set(5, 10, 5);

    environment.fog = new THREE.Fog(0x101020, 100, 400);
    this.scene.fog = environment.fog;

    this.createSpaceDust(environment, 200, 0x606080);
  }

  setupNebulaCore(environment, config) {
    this.rgbeLoader.load(
      'assets/hdri/nebula-core.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose();

        environment.skybox = envMap;
        this.scene.background = envMap;
        this.scene.environment = envMap;
      },
      undefined,
      (error) => {
        console.warn('HDRI loading failed, using solid color:', error);
        this.scene.background = new THREE.Color(0x601040);
      }
    );

    environment.lighting.ambient = new THREE.AmbientLight(0xff6040, 0.25);
    environment.lighting.directional = new THREE.DirectionalLight(0xff8060, 0.7);
    environment.lighting.directional.position.set(-3, 8, 4);

    environment.fog = new THREE.FogExp2(0x601040, 0.008);
    this.scene.fog = environment.fog;

    this.createNebulaGas(environment, 500, [0xff6040, 0x8040ff, 0x40ff80]);
  }

  setupStellarStorm(environment, config) {
    this.rgbeLoader.load(
      'assets/hdri/stellar-storm.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose();

        environment.skybox = envMap;
        this.scene.background = envMap;
        this.scene.environment = envMap;
      },
      undefined,
      (error) => {
        console.warn('HDRI loading failed, using solid color:', error);
        this.scene.background = new THREE.Color(0xff4000);
      }
    );

    environment.lighting.ambient = new THREE.AmbientLight(0xffa040, 0.6);
    environment.lighting.directional = new THREE.DirectionalLight(0xffff80, 1.5);
    environment.lighting.directional.position.set(0, 5, -10);

    for(let i = 0; i < 3; i++) {
      const pointLight = new THREE.PointLight(0xff8000, 2.0, 50);
      pointLight.position.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 50,
        -20 - Math.random() * 30
      );
      environment.lighting.point.push(pointLight);
    }

    environment.fog = new THREE.Fog(0xff4000, 80, 300);
    this.scene.fog = environment.fog;

    this.createSolarStorm(environment, 800, 0xffaa00);
  }

  createSpaceDust(environment, count, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for(let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = -Math.random() * 300;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = 0.1 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(geometry, material);
    environment.particles.push(particles);
    this.scene.add(particles);
  }

  createNebulaGas(environment, count, colors) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors_array = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for(let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = -Math.random() * 400;

      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      colors_array[i * 3] = color.r;
      colors_array[i * 3 + 1] = color.g;
      colors_array[i * 3 + 2] = color.b;

      sizes[i] = 2.0 + Math.random() * 3.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors_array, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // FIX: vertexColors: true is needed for color attribute
    const material = new THREE.PointsMaterial({
      color: colors[0],
      size: 2.5,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    environment.particles.push(particles);
    this.scene.add(particles);
  }

  createSolarStorm(environment, count, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for(let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = -Math.random() * 500;

      velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 2] = 0.2 + Math.random() * 0.15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    environment.particles.push(particles);
    this.scene.add(particles);
  }

  switchEnvironment(levelConfig) {
    if (!levelConfig) {
      console.error("Invalid level config:", levelConfig);
      return;
    }

    if (this.currentEnvironment) {
      this.cleanupEnvironment(this.currentEnvironment);
    }

    this.currentEnvironment = this.createEnvironment(levelConfig);
    this.applyEnvironmentToScene();
  }

  applyEnvironmentToScene() {
    if (!this.currentEnvironment) return;

    this.scene.fog = this.currentEnvironment.fog;

    if (this.currentEnvironment.lighting.ambient) {
      this.scene.add(this.currentEnvironment.lighting.ambient);
    }
    if (this.currentEnvironment.lighting.directional) {
      this.scene.add(this.currentEnvironment.lighting.directional);
    }
    this.currentEnvironment.lighting.point.forEach(light => {
      this.scene.add(light);
    });
  }

  cleanupEnvironment(environment) {
    if(environment.lighting.ambient) this.scene.remove(environment.lighting.ambient);
    if(environment.lighting.directional) this.scene.remove(environment.lighting.directional);
    environment.lighting.point.forEach(light => this.scene.remove(light));

    environment.particles.forEach(particle => {
      this.scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    });

    this.scene.fog = null;
    this.scene.background = null;
    this.scene.environment = null;
  }

  createEnvironment(levelConfig) {
    const environment = {
      skybox: null,
      fog: null,
      lighting: {
        ambient: null,
        directional: null,
        point: []
      },
      particles: [],
      backgroundColor: levelConfig.backgroundColor
    };

    switch(levelConfig.type) {
      case 'asteroid-belt':
        this.setupAsteroidBelt(environment, levelConfig);
        break;
      case 'nebula-core':
        this.setupNebulaCore(environment, levelConfig);
        break;
      case 'stellar-storm':
        this.setupStellarStorm(environment, levelConfig);
        break;
      default:
        console.warn('Unknown environment type:', levelConfig.type);
        this.setupAsteroidBelt(environment, levelConfig);
        break;
    }

    return environment;
  }

  updateParticles(deltaTime) {
    if (!this.currentEnvironment) return;

    this.currentEnvironment.particles.forEach(particleSystem => {
      const positions = particleSystem.geometry.attributes.position;
      const velocities = particleSystem.geometry.attributes.velocity;

      if (velocities) {
        for (let i = 0; i < positions.count; i++) {
          positions.array[i * 3] += velocities.array[i * 3] * deltaTime;
          positions.array[i * 3 + 1] += velocities.array[i * 3 + 1] * deltaTime;
          positions.array[i * 3 + 2] += velocities.array[i * 3 + 2] * deltaTime;

          if (positions.array[i * 3 + 2] > 50) {
            positions.array[i * 3] = (Math.random() - 0.5) * 200;
            positions.array[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions.array[i * 3 + 2] = -Math.random() * 300;
          }
        }
        positions.needsUpdate = true;
      }
    });
  }

  dispose() {
    if (this.currentEnvironment) {
      this.cleanupEnvironment(this.currentEnvironment);
    }

    this.pmremGenerator.dispose();
    this.environments.clear();
  }
}
