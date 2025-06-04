export class AdaptiveRenderer {
  constructor() {
    this.qualityProfile = this.detectDeviceProfile();
    this.applyQualitySettings();
  }

  detectDeviceProfile() {
    const gpuTier = detectGPU();
    return gpuTier.tier >= 3 ? 'ultra' : 'low';
  }

  applyQualitySettings() {
    const settings = {
      ultra: { shadowMap: true, anisotropy: 16 },
      low: { shadowMap: false, anisotropy: 0 }
    }[this.qualityProfile];
    
    renderer.shadowMap.enabled = settings.shadowMap;
    texture.anisotropy = settings.anisotropy;
  }
}
