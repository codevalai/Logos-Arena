import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FighterState, GameMatchState, PhilosopherProfile } from './types';
import { PHILOSOPHER_ROSTER } from './FighterRoster';
import { GROUND_Y } from './DeterministicKernel';

// Module-scope pre-allocated math objects to guarantee zero GC in 60 FPS loop
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _tempColor = new THREE.Color();

interface ArticulatedFighterRig {
  root: THREE.Group;
  philosopherKey: string;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  capePivot: THREE.Group;
  sacredRing: THREE.Mesh;
  guardDome: THREE.Mesh;
  slashArc: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  auraLight: THREE.PointLight;
}

interface Burst3DParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface Shockwave3DRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  targetScale: number;
}

export class LogosArena3DScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private clock: THREE.Clock;

  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private leftBrazierLight: THREE.PointLight;
  private rightBrazierLight: THREE.PointLight;

  private stageGroup: THREE.Group;
  private floatingMonuments: THREE.Mesh[] = [];
  private brazierFlames: THREE.Mesh[] = [];
  private currentStageKey = '';

  private p1Rig: ArticulatedFighterRig | null = null;
  private p2Rig: ArticulatedFighterRig | null = null;
  private projectileGroup: THREE.Group;
  private particles3D: Burst3DParticle[] = [];
  private shockwaves3D: Shockwave3DRing[] = [];
  private prevP1Health = 100;
  private prevP2Health = 100;

  private toonGradientMap: THREE.DataTexture;
  private currentLookAt = new THREE.Vector3(0, 1.9, 0);

  constructor(container: HTMLElement, width = 1200, height = 520) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Atmospheric Exponential Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a14);
    this.scene.fog = new THREE.FogExp2(0x070a14, 0.022);

    // 2. Fighting Game Perspective Camera (2.5D ArcSys Framing)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    this.camera.position.set(0, 3.1, 14.2);
    this.camera.lookAt(0, 1.9, 0);

    // 3. Modern High-Performance WebGLRenderer (Three.js r160+ Pipeline)
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)
    );
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.className = 'w-full h-full block rounded-xl select-none';
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear container and mount WebGL canvas
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Map Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Custom 4-Step Anime Cel-Shading Gradient Map
    const gradData = new Uint8Array([45, 115, 195, 255]);
    this.toonGradientMap = new THREE.DataTexture(gradData, 4, 1, THREE.RedFormat);
    this.toonGradientMap.minFilter = THREE.NearestFilter;
    this.toonGradientMap.magFilter = THREE.NearestFilter;
    this.toonGradientMap.needsUpdate = true;

    // 6. 3-Point Studio & Anime Rim Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 0.75);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    this.keyLight.position.set(6, 14, 9);
    this.keyLight.castShadow = !isHeadless;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    const d = 12;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 35;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // High-contrast Back Rim Light for Guilty Gear-style edge highlights
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 2.1);
    this.rimLight.position.set(0, 7, -10);
    this.scene.add(this.rimLight);

    // Flanking Fire Brazier Point Lights
    this.leftBrazierLight = new THREE.PointLight(0xf97316, 4.5, 14, 1.8);
    this.leftBrazierLight.position.set(-7.5, 2.5, -2.4);
    this.scene.add(this.leftBrazierLight);

    this.rightBrazierLight = new THREE.PointLight(0xf97316, 4.5, 14, 1.8);
    this.rightBrazierLight.position.set(7.5, 2.5, -2.4);
    this.scene.add(this.rightBrazierLight);

    // 7. Stage & Dynamic FX Groups
    this.stageGroup = new THREE.Group();
    this.scene.add(this.stageGroup);

    this.projectileGroup = new THREE.Group();
    this.scene.add(this.projectileGroup);

    // 8. Post-Processing Bloom Pipeline (EffectComposer + UnrealBloomPass)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.42, // strength
      0.35, // radius
      0.82 // threshold
    );
    this.composer.addPass(this.bloomPass);

    // Build initial stage
    this.rebuildStage('SOCRATES');
    this.renderer.compile(this.scene, this.camera);
  }

  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
  }

  private createMarbleFloorTexture(stage: PhilosopherProfile): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base stone fill
    ctx.fillStyle = stage.stagePalette.floorBottom;
    ctx.fillRect(0, 0, 1024, 1024);

    // Checkered 8x8 perspective marble tiles
    const tiles = 8;
    const tileSize = 1024 / tiles;
    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        ctx.fillStyle =
          (r + c) % 2 === 0 ? stage.stagePalette.floorTop : stage.stagePalette.floorBottom;
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

        // Subtle gold tile bevel border
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);
      }
    }

    // Center Sacred Rose Compass & Logos Seal
    ctx.save();
    ctx.translate(512, 512);
    ctx.strokeStyle = stage.stagePalette.accentGlow;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 165, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.lineTo(Math.cos(a) * 220, Math.sin(a) * 220);
      ctx.stroke();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  }

  private rebuildStage(stageOwnerKey: string): void {
    if (this.currentStageKey === stageOwnerKey) return;
    this.currentStageKey = stageOwnerKey;

    // Clear existing stage meshes
    while (this.stageGroup.children.length > 0) {
      const child = this.stageGroup.children[0];
      this.stageGroup.remove(child);
    }
    this.floatingMonuments = [];
    this.brazierFlames = [];

    const stage = PHILOSOPHER_ROSTER[stageOwnerKey] || PHILOSOPHER_ROSTER.SOCRATES;
    const skyColor = new THREE.Color(stage.stagePalette.skyBottom);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor.getHex(), 0.022);
    this.rimLight.color.set(stage.stagePalette.accentGlow);

    // 1. 3D Reflective Marble Arena Floor (y = 0)
    const floorTex = this.createMarbleFloorTexture(stage);
    const floorGeo = new THREE.PlaneGeometry(36, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.25,
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.stageGroup.add(floorMesh);

    // Front Arena Edge Plinth Step
    const plinthGeo = new THREE.BoxGeometry(36, 0.6, 0.8);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stage.stagePalette.accentGlow),
      roughness: 0.3,
      metalness: 0.75,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, -0.3, 4.2);
    this.stageGroup.add(plinthMesh);

    // 2. Semicircle Colonnade of 8 Architectural Pillars + Architrave
    const pillarMat = new THREE.MeshToonMaterial({
      color: new THREE.Color(stage.stagePalette.floorTop).lerp(new THREE.Color(0xffffff), 0.25),
      gradientMap: this.toonGradientMap,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.88,
    });

    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const angle = THREE.MathUtils.lerp(-0.95, 0.95, t);
      const radius = 11.5;
      const px = Math.sin(angle) * radius;
      const pz = -Math.cos(angle) * radius * 0.55 - 2.2;

      const colGroup = new THREE.Group();
      colGroup.position.set(px, 0, pz);

      // Base pedestal
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), pillarMat);
      baseMesh.position.y = 0.3;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      colGroup.add(baseMesh);

      // Fluted shaft
      const shaftMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.44, 5.4, 12),
        pillarMat
      );
      shaftMesh.position.y = 3.3;
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = true;
      colGroup.add(shaftMesh);

      // Golden capital ring
      const capRing = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.42, 0.35, 12), goldMat);
      capRing.position.y = 6.15;
      colGroup.add(capRing);

      // Top abacus slab
      const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 1.15), pillarMat);
      abacus.position.y = 6.45;
      colGroup.add(abacus);

      this.stageGroup.add(colGroup);
    }

    // 3. Flanking 3D Bronze Fire Braziers (-7.5 and +7.5)
    const brazierPositions = [-7.5, 7.5];
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.3,
      metalness: 0.85,
    });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
    });

    for (const bx of brazierPositions) {
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, 0, -2.4);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 1.5, 8), bronzeMat);
      stand.position.y = 0.75;
      stand.castShadow = true;
      bGroup.add(stand);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.35, 0.45, 12), bronzeMat);
      bowl.position.y = 1.65;
      bGroup.add(bowl);

      const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.25, 8), flameMat);
      flameCone.position.y = 2.35;
      bGroup.add(flameCone);
      this.brazierFlames.push(flameCone);

      this.stageGroup.add(bGroup);
    }

    // 4. Floating Platonic Solid Sanctuary Monuments in the Sky
    const monumentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(stage.stagePalette.accentGlow),
      emissive: new THREE.Color(stage.stagePalette.accentGlow),
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.8,
      wireframe: false,
      clearcoat: 1.0,
    });

    const centerOcta = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 0), monumentMat);
    centerOcta.position.set(0, 6.2, -7.8);
    this.stageGroup.add(centerOcta);
    this.floatingMonuments.push(centerOcta);

    const leftIcosa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), monumentMat);
    leftIcosa.position.set(-5.8, 5.6, -6.8);
    this.stageGroup.add(leftIcosa);
    this.floatingMonuments.push(leftIcosa);

    const rightIcosa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), monumentMat);
    rightIcosa.position.set(5.8, 5.6, -6.8);
    this.stageGroup.add(rightIcosa);
    this.floatingMonuments.push(rightIcosa);
  }

  private addAnimeOutline(mesh: THREE.Mesh, thickness = 1.06): void {
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x05070e,
      side: THREE.BackSide,
    });
    const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
    outlineMesh.scale.setScalar(thickness);
    mesh.add(outlineMesh);
  }

  private buildFighterRig(philosopherKey: string): ArticulatedFighterRig {
    const profile = PHILOSOPHER_ROSTER[philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    const root = new THREE.Group();

    const robeMat = new THREE.MeshToonMaterial({
      color: new THREE.Color(profile.visual.primaryRobe),
      gradientMap: this.toonGradientMap,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(profile.visual.secondaryTrim),
      roughness: 0.25,
      metalness: 0.82,
    });
    const skinMat = new THREE.MeshToonMaterial({
      color: new THREE.Color(profile.visual.skinTone),
      gradientMap: this.toonGradientMap,
    });
    const hairMat = new THREE.MeshToonMaterial({
      color: new THREE.Color(profile.visual.hairColor),
      gradientMap: this.toonGradientMap,
    });
    const darkBootMat = new THREE.MeshToonMaterial({
      color: 0x1e293b,
      gradientMap: this.toonGradientMap,
    });

    // 1. Sacred Floor Mandala Ring (Grounded at y = 0.02)
    const ringGeo = new THREE.RingGeometry(0.75, 1.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(profile.stagePalette.accentGlow),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const sacredRing = new THREE.Mesh(ringGeo, ringMat);
    sacredRing.rotation.x = -Math.PI / 2;
    sacredRing.position.y = 0.02;
    root.add(sacredRing);

    // 2 & 3. Articulated Left & Right Legs (Hip Pivot at y = 1.05)
    const buildLeg = (zOffset: number): THREE.Group => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(0, 1.05, zOffset);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 8, 12), robeMat);
      thigh.position.y = -0.28;
      thigh.castShadow = true;
      this.addAnimeOutline(thigh);
      hipPivot.add(thigh);

      const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.48, 10), trimMat);
      greave.position.y = -0.68;
      greave.castShadow = true;
      this.addAnimeOutline(greave);
      hipPivot.add(greave);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.24), darkBootMat);
      boot.position.set(0.08, -0.95, 0);
      boot.castShadow = true;
      this.addAnimeOutline(boot);
      hipPivot.add(boot);

      return hipPivot;
    };

    const leftLegPivot = buildLeg(0.22);
    const rightLegPivot = buildLeg(-0.22);
    root.add(leftLegPivot);
    root.add(rightLegPivot);

    // 4. Torso Group (Waist Tunic, Chest, Golden Philosophical Stole, Pauldrons)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.15, 0);
    root.add(torsoGroup);

    // Lower Tunic / Robe Skirt
    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.56, 0.72, 12),
      robeMat
    );
    skirtMesh.position.y = -0.15;
    skirtMesh.castShadow = true;
    this.addAnimeOutline(skirtMesh);
    torsoGroup.add(skirtMesh);

    // Upper Anatomical Torso
    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.56), robeMat);
    chestMesh.position.y = 0.52;
    chestMesh.castShadow = true;
    this.addAnimeOutline(chestMesh);
    torsoGroup.add(chestMesh);

    // Golden Belt Sash
    const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.6), trimMat);
    beltMesh.position.y = 0.12;
    torsoGroup.add(beltMesh);

    // Diagonal Philosopher's Stole
    const stoleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.86, 0.22), trimMat);
    stoleMesh.position.set(0.02, 0.52, 0);
    stoleMesh.rotation.z = 0.35;
    torsoGroup.add(stoleMesh);

    // 5. Flowing 3D Cloth Cape / Mantle (Reacts to velocity)
    const capePivot = new THREE.Group();
    capePivot.position.set(-0.28, 0.92, 0);
    const capeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.74), trimMat);
    capeMesh.position.set(-0.12, -0.68, 0);
    capeMesh.castShadow = true;
    this.addAnimeOutline(capeMesh, 1.04);
    capePivot.add(capeMesh);
    torsoGroup.add(capePivot);

    // 6 & 7. Left & Right Articulated Arms + Shoulder Pauldrons
    const buildArm = (zOffset: number): THREE.Group => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(0, 0.88, zOffset);

      // Pauldron
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), trimMat);
      pauldron.scale.set(1.1, 0.75, 1.1);
      this.addAnimeOutline(pauldron);
      shoulderPivot.add(pauldron);

      // Upper & Forearm
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.56, 8, 12), robeMat);
      armMesh.position.set(0.18, -0.32, 0);
      armMesh.rotation.z = 0.45;
      armMesh.castShadow = true;
      this.addAnimeOutline(armMesh);
      shoulderPivot.add(armMesh);

      // Sculpted Fist / Gauntlet
      const fistMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
      fistMesh.position.set(0.42, -0.52, 0);
      this.addAnimeOutline(fistMesh);
      shoulderPivot.add(fistMesh);

      return shoulderPivot;
    };

    const leftArmPivot = buildArm(0.38);
    const rightArmPivot = buildArm(-0.38);
    torsoGroup.add(leftArmPivot);
    torsoGroup.add(rightArmPivot);

    // 8. Sculpted Head, Expressive Eyes, Beard & Era Headwear
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.28, 0);
    torsoGroup.add(headGroup);

    const skullMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 18), skinMat);
    skullMesh.castShadow = true;
    this.addAnimeOutline(skullMesh, 1.06);
    headGroup.add(skullMesh);

    // Eyes (facing +X in local rig space)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat.clone());
    leftEye.position.set(0.29, 0.05, 0.12);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat.clone());
    rightEye.position.set(0.29, 0.05, -0.12);
    headGroup.add(rightEye);

    // Hair / Crown Dome
    if (profile.visual.headwear !== ' skullcap') {
      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
        hairMat
      );
      hairCap.position.y = 0.04;
      hairCap.rotation.z = 0.22;
      this.addAnimeOutline(hairCap, 1.04);
      headGroup.add(hairCap);
    }

    if (profile.visual.headwear === 'scholar_cap') {
      const bun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.28, 10), trimMat);
      bun.position.set(-0.04, 0.42, 0);
      this.addAnimeOutline(bun);
      headGroup.add(bun);
    }

    // Era-Specific 3D Beard
    if (
      profile.visual.beardStyle === 'full' ||
      profile.visual.beardStyle === 'long_white' ||
      profile.visual.beardStyle === 'goatee'
    ) {
      const beardCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 10), hairMat);
      beardCone.position.set(0.22, -0.26, 0);
      beardCone.rotation.z = Math.PI + 0.25;
      this.addAnimeOutline(beardCone);
      headGroup.add(beardCone);
    } else if (profile.visual.beardStyle === 'mustache') {
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.36), hairMat);
      mustache.position.set(0.31, -0.09, 0);
      this.addAnimeOutline(mustache);
      headGroup.add(mustache);
    }

    // Era-Specific 3D Headwear (Golden Laurel Wreath, Scholar Crown, or Enlightenment Hat)
    if (profile.era === 'Ancient Philosophy') {
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 20), trimMat);
      wreath.rotation.x = Math.PI / 2;
      wreath.rotation.y = -0.18;
      wreath.position.y = 0.16;
      headGroup.add(wreath);
    } else if (profile.era === 'Medieval & Renaissance') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 24), trimMat);
      halo.position.set(-0.12, 0.42, 0);
      halo.rotation.y = Math.PI / 2;
      headGroup.add(halo);
    }

    // 9. Hexagonal Energy Guard Shield Dome
    const guardGeo = new THREE.IcosahedronGeometry(1.35, 1);
    const guardMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const guardDome = new THREE.Mesh(guardGeo, guardMat);
    guardDome.position.set(0, 1.35, 0);
    guardDome.visible = false;
    root.add(guardDome);

    // 10. 3D Crescent Anime Strike Slash Arc
    const slashGeo = new THREE.TorusGeometry(1.15, 0.09, 8, 24, Math.PI * 0.85);
    const slashMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(profile.stagePalette.accentGlow),
      transparent: true,
      opacity: 0.9,
    });
    const slashArc = new THREE.Mesh(slashGeo, slashMat);
    slashArc.position.set(0.85, 1.45, 0);
    slashArc.rotation.z = -Math.PI * 0.4;
    slashArc.visible = false;
    root.add(slashArc);

    // 11. Dynamic Character Aura PointLight
    const auraLight = new THREE.PointLight(
      new THREE.Color(profile.stagePalette.accentGlow),
      0,
      6,
      2
    );
    auraLight.position.set(0, 1.5, 0.8);
    root.add(auraLight);

    return {
      root,
      philosopherKey,
      torsoGroup,
      headGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      capePivot,
      sacredRing,
      guardDome,
      slashArc,
      leftEye,
      rightEye,
      auraLight,
    };
  }

  private spawn3DImpactBurst(worldX: number, worldY: number, colorHex: string, isSuper: boolean): void {
    const count = isSuper ? 22 : 12;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
    const geo = new THREE.OctahedronGeometry(isSuper ? 0.14 : 0.09, 0);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = (isSuper ? 5.5 : 3.4) + (i % 4) * 0.9;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(worldX, worldY, (i % 3 - 1) * 0.25);
      this.scene.add(mesh);

      this.particles3D.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1.5,
        vz: ((i % 5) - 2) * 1.1,
        life: 0.35,
        maxLife: 0.35,
      });
    }

    // Spawn 3D Expanding Shockwave Ring
    const ringGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.95,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(worldX, worldY, 0.3);
    this.scene.add(ringMesh);
    this.shockwaves3D.push({
      mesh: ringMesh,
      life: 0.32,
      maxLife: 0.32,
      targetScale: isSuper ? 5.5 : 3.2,
    });
  }

  private updateFighterRig(
    rig: ArticulatedFighterRig,
    fighter: FighterState,
    frameNumber: number,
    dt: number
  ): void {
    // Map 2D kernel coordinates (0..1200, GROUND_Y=430) to 3D Arena Space
    const worldX = (fighter.position.x - 600) / 55;
    const worldY = Math.max(0, (GROUND_Y - fighter.position.y) / 55);

    rig.root.position.set(worldX, worldY, 0);
    rig.root.scale.x = fighter.facingRight ? 1 : -1;

    // Crouch compression
    const targetScaleY = fighter.crouching ? 0.74 : 1.0;
    rig.root.scale.y = THREE.MathUtils.damp(rig.root.scale.y, targetScaleY, 16, dt);

    // Rotate sacred geometry floor mandala
    rig.sacredRing.rotation.z = frameNumber * 0.035;

    // Dynamic cloth cape sway from horizontal & vertical velocity
    const targetCapeRotZ =
      0.18 + Math.min(0.65, Math.abs(fighter.velocity.x) * 0.05) + Math.sin(frameNumber * 0.14) * 0.08;
    rig.capePivot.rotation.z = THREE.MathUtils.damp(rig.capePivot.rotation.z, targetCapeRotZ, 12, dt);

    // Guard Shield visibility
    rig.guardDome.visible = fighter.blocking || fighter.attackState === 'BLOCKSTUN';
    if (rig.guardDome.visible) {
      rig.guardDome.rotation.y += dt * 2.5;
    }

    // Eye glow & Aura light on Special / Super / Empowered
    const isSpecialOrSuper = fighter.currentMove === 'SPECIAL' || fighter.currentMove === 'SUPER';
    const eyeHex = isSpecialOrSuper
      ? 0x38bdf8
      : fighter.damageMultiplier > 1
      ? 0xfbbf24
      : 0xffffff;
    (rig.leftEye.material as THREE.MeshBasicMaterial).color.setHex(eyeHex);
    (rig.rightEye.material as THREE.MeshBasicMaterial).color.setHex(eyeHex);
    rig.auraLight.intensity = isSpecialOrSuper ? 6.5 : fighter.damageMultiplier > 1 ? 2.5 : 0;

    // Articulated Limb Kinematics by Combat State
    const isMoving = Math.abs(fighter.velocity.x) > 0.25;
    const walkCycle = Math.sin(frameNumber * 0.32);
    const breathCycle = Math.sin(frameNumber * 0.12) * 0.04;

    rig.slashArc.visible = false;

    const isAttacking =
      fighter.attackState === 'STARTUP' ||
      fighter.attackState === 'ACTIVE' ||
      fighter.attackState === 'RECOVERY';

    if (isAttacking) {
      const isActive = fighter.attackState === 'ACTIVE';
      if (fighter.currentMove === 'LIGHT') {
        // Fast jab extension
        rig.rightArmPivot.rotation.z = isActive ? 1.45 : 0.65;
        rig.leftArmPivot.rotation.z = -0.35;
        rig.torsoGroup.rotation.y = isActive ? -0.35 : -0.1;
        rig.slashArc.visible = isActive;
      } else if (fighter.currentMove === 'HEAVY') {
        // High roundhouse kick + dramatic torso lean
        rig.rightLegPivot.rotation.z = isActive ? 1.55 : 0.75;
        rig.leftLegPivot.rotation.z = -0.2;
        rig.torsoGroup.rotation.z = isActive ? -0.28 : -0.1;
        rig.rightArmPivot.rotation.z = 0.85;
        rig.slashArc.visible = isActive;
      } else {
        // Special / Super Dual-Palm Energy Thrust
        rig.rightArmPivot.rotation.z = 1.38;
        rig.leftArmPivot.rotation.z = 1.28;
        rig.torsoGroup.rotation.z = 0.14;
        rig.slashArc.visible = isActive;
      }
    } else if (fighter.attackState === 'HITSTUN') {
      rig.torsoGroup.rotation.z = -0.32;
      rig.rightArmPivot.rotation.z = -0.5;
      rig.leftArmPivot.rotation.z = -0.4;
    } else if (fighter.attackState === 'KNOCKDOWN' || fighter.health <= 0) {
      rig.torsoGroup.rotation.z = -1.35;
      rig.torsoGroup.position.y = 0.45;
    } else {
      // Idle / Walk / Jump neutral articulation
      rig.torsoGroup.position.y = 1.15 + breathCycle;
      rig.torsoGroup.rotation.z = isMoving ? 0.08 : 0;
      rig.torsoGroup.rotation.y = 0;

      if (isMoving && fighter.grounded) {
        rig.leftLegPivot.rotation.z = walkCycle * 0.65;
        rig.rightLegPivot.rotation.z = -walkCycle * 0.65;
        rig.leftArmPivot.rotation.z = -walkCycle * 0.45;
        rig.rightArmPivot.rotation.z = walkCycle * 0.45;
      } else if (!fighter.grounded) {
        rig.leftLegPivot.rotation.z = 0.45;
        rig.rightLegPivot.rotation.z = -0.35;
        rig.rightArmPivot.rotation.z = 0.55;
      } else {
        rig.leftLegPivot.rotation.z = 0.12;
        rig.rightLegPivot.rotation.z = -0.12;
        rig.leftArmPivot.rotation.z = 0.25 + breathCycle;
        rig.rightArmPivot.rotation.z = 0.45 - breathCycle;
      }
    }
  }

  public syncAndRender(matchState: GameMatchState, stageOwnerKey: string): void {
    const dt = Math.min(0.05, this.clock.getDelta() || 1 / 60);
    const f1 = matchState.fighter1;
    const f2 = matchState.fighter2;

    // 1. Rebuild 3D Stage if opponent/stage owner changed
    this.rebuildStage(stageOwnerKey);

    // 2. Ensure P1 and P2 3D Rigs match selected philosophers
    if (!this.p1Rig || this.p1Rig.philosopherKey !== f1.philosopherKey) {
      if (this.p1Rig) this.scene.remove(this.p1Rig.root);
      this.p1Rig = this.buildFighterRig(f1.philosopherKey);
      this.scene.add(this.p1Rig.root);
    }
    if (!this.p2Rig || this.p2Rig.philosopherKey !== f2.philosopherKey) {
      if (this.p2Rig) this.scene.remove(this.p2Rig.root);
      this.p2Rig = this.buildFighterRig(f2.philosopherKey);
      this.scene.add(this.p2Rig.root);
    }

    // 3. Detect HP loss to spawn 3D Hit Sparks & Shockwave Rings
    if (f1.health < this.prevP1Health) {
      const dmg = this.prevP1Health - f1.health;
      const wx = (f1.position.x - 600) / 55;
      const wy = Math.max(0.8, (GROUND_Y - f1.position.y) / 55 + 1.3);
      this.spawn3DImpactBurst(wx, wy, dmg >= 14 ? '#38bdf8' : '#f59e0b', dmg >= 18);
    }
    if (f2.health < this.prevP2Health) {
      const dmg = this.prevP2Health - f2.health;
      const wx = (f2.position.x - 600) / 55;
      const wy = Math.max(0.8, (GROUND_Y - f2.position.y) / 55 + 1.3);
      this.spawn3DImpactBurst(wx, wy, dmg >= 14 ? '#38bdf8' : '#f59e0b', dmg >= 18);
    }
    this.prevP1Health = f1.health;
    this.prevP2Health = f2.health;

    // 4. Update P1 & P2 3D Articulated Kinematics
    this.updateFighterRig(this.p1Rig, f1, matchState.frameNumber, dt);
    this.updateFighterRig(this.p2Rig, f2, matchState.frameNumber, dt);

    // 5. Sync 3D Active Philosophical Zones (Platonic Forms, Locke Territory, Wittgenstein Silence, Marx Hazard)
    while (this.projectileGroup.children.length > 0) {
      this.projectileGroup.remove(this.projectileGroup.children[0]);
    }
    for (const zone of matchState.activeZones) {
      const px = (zone.x + zone.width * 0.5 - 600) / 55;
      const py = Math.max(0.5, (GROUND_Y - (zone.y + zone.height * 0.5)) / 55);
      _tempColor.set(
        zone.type === 'MARX_HAZARD'
          ? '#ef4444'
          : zone.type === 'LOCKE_TERRITORY'
          ? '#f59e0b'
          : '#38bdf8'
      );
      const orbGeo = new THREE.OctahedronGeometry(0.55, 1);
      const orbMat = new THREE.MeshBasicMaterial({
        color: _tempColor,
        wireframe: true,
      });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      orbMesh.position.set(px, py, 0.2);
      orbMesh.rotation.y = matchState.frameNumber * 0.08;
      orbMesh.rotation.x = matchState.frameNumber * 0.05;
      this.projectileGroup.add(orbMesh);
    }

    // 6. Animate Floating Sky Monuments & Fire Braziers
    const t = matchState.frameNumber * 0.02;
    this.floatingMonuments.forEach((m, idx) => {
      m.rotation.y = t + idx * 1.1;
      m.rotation.x = t * 0.6;
      m.position.y = (idx === 0 ? 6.2 : 5.6) + Math.sin(t * 2 + idx) * 0.25;
    });

    this.brazierFlames.forEach((flame, idx) => {
      const flicker = 0.9 + Math.sin(matchState.frameNumber * 0.35 + idx * 2) * 0.18;
      flame.scale.set(1, flicker, 1);
    });
    this.leftBrazierLight.intensity = 4.2 + Math.sin(matchState.frameNumber * 0.4) * 0.9;
    this.rightBrazierLight.intensity = 4.2 + Math.cos(matchState.frameNumber * 0.38) * 0.9;

    // 7. Update 3D Burst Particles & Expanding Shockwave Rings
    for (let i = this.particles3D.length - 1; i >= 0; i--) {
      const p = this.particles3D[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt;
      p.mesh.rotation.x += 6 * dt;
      p.mesh.rotation.y += 6 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles3D.splice(i, 1);
      } else {
        p.mesh.scale.setScalar(Math.max(0.01, p.life / p.maxLife));
      }
    }

    for (let i = this.shockwaves3D.length - 1; i >= 0; i--) {
      const sw = this.shockwaves3D[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        this.shockwaves3D.splice(i, 1);
      } else {
        const progress = 1 - sw.life / sw.maxLife;
        const s = 1 + progress * sw.targetScale;
        sw.mesh.scale.set(s, s, 1);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
      }
    }

    // 8. Dynamic Fighting Camera Tracking + Cinematic Super Zoom
    const p1X = this.p1Rig.root.position.x;
    const p2X = this.p2Rig.root.position.x;
    const midX = (p1X + p2X) * 0.5;
    const separation = Math.abs(p1X - p2X);

    const isSuperActive =
      ((f1.attackState === 'STARTUP' || f1.attackState === 'ACTIVE') &&
        f1.currentMove === 'SUPER') ||
      ((f2.attackState === 'STARTUP' || f2.attackState === 'ACTIVE') &&
        f2.currentMove === 'SUPER');

    const targetZ = isSuperActive
      ? 9.6
      : THREE.MathUtils.clamp(11.2 + separation * 0.36, 11.4, 15.6);
    const targetY = isSuperActive ? 2.45 : 3.05;

    _camTargetPos.set(midX * 0.65, targetY, targetZ);
    this.camera.position.lerp(_camTargetPos, 0.14);

    _camLookAt.set(midX * 0.78, 1.75, 0);
    this.currentLookAt.lerp(_camLookAt, 0.18);
    this.camera.lookAt(this.currentLookAt);

    // Boost bloom during Super attacks
    this.bloomPass.strength = isSuperActive ? 0.72 : 0.42;

    // 9. Render via Post-Processing Bloom Composer
    this.composer.render();
  }

  public dispose(): void {
    this.renderer.dispose();
    this.toonGradientMap.dispose();
  }
}
