import * as THREE from 'three';

/**
 * 01-melee karambit reconstruction.
 *
 * This is deliberately code-only. The reference image is used as authoring evidence, but the
 * runtime model does not load the reference or any external mesh/texture pack. Ruby marbling,
 * roughness variation, and normal variation are generated into independent CanvasTextures.
 * Hidden thickness and back-side construction are inferred from the broadside source.
 */

export interface MeleeKarambitOptions {
  shadows?: boolean;
  /** Skip generated surface textures for geometry-only checks. */
  noTextures?: boolean;
}

export interface MeleeKarambitRuntime {
  nodes: Record<string, THREE.Object3D>;
  meshes: THREE.Mesh[];
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, { type: string; notes: string }>;
  destructionGroups: Record<string, string[]>;
  provenance: {
    route: 'procedural-finish';
    exactnessTier: 'image-only';
    reference: string;
    inferred: string[];
  };
  idlePeriodSeconds: number;
}

type XY = [number, number];
type Hole = { cx: number; cy: number; r: number };

const RING_CENTER: XY = [2.42, -0.10];
const FRONT_Z = 1;
const BACK_Z = -1;

function addPart(
  parent: THREE.Object3D,
  id: string,
  mesh: THREE.Mesh,
  runtime: MeleeKarambitRuntime,
  integral = false,
): THREE.Mesh {
  mesh.name = id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (integral) mesh.userData.explodeWithParent = true;
  parent.add(mesh);
  runtime.nodes[id] = mesh;
  runtime.meshes.push(mesh);
  return mesh;
}

function addGroup(parent: THREE.Object3D, id: string, runtime: MeleeKarambitRuntime): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  parent.add(group);
  runtime.nodes[id] = group;
  return group;
}

function addSocket(parent: THREE.Object3D, id: string, at: XY, runtime: MeleeKarambitRuntime): void {
  const socket = new THREE.Object3D();
  socket.name = id;
  socket.position.set(at[0], at[1], 0);
  socket.userData.socket = { id, axis: [0, 0, 1] };
  parent.add(socket);
  runtime.sockets[id] = socket;
}

function shapeFrom(points: XY[], holes: Hole[] = []): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  for (const hole of holes) {
    const path = new THREE.Path();
    path.absarc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  return shape;
}

function slab(
  points: XY[],
  depth: number,
  bevel: number,
  holes: Hole[] = [],
  bevelSegments = 3,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeFrom(points, holes), {
    depth,
    steps: 2,
    bevelEnabled: bevel > 0,
    bevelSegments,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function annulus(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  depth: number,
  bevel: number,
): THREE.ExtrudeGeometry {
  const points: XY[] = [];
  const segments = 96;
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(t) * outer, cy + Math.sin(t) * outer]);
  }
  return slab(points, depth, bevel, [{ cx, cy, r: inner }], 4);
}

function createGroundBlade(points: XY[], holes: Hole[], depth = 0.16): THREE.BufferGeometry {
  const source = slab(points, depth, 0.004, holes, 2).toNonIndexed();
  const position = source.getAttribute('position');
  const output: number[] = [];
  const halfHeight = (Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]))) || 1;
  const minY = Math.min(...points.map((p) => p[1]));

  // A curved grind: the spine keeps full stock, while the cutting edge approaches a thin apex.
  const halfThickness = (x: number, y: number): number => {
    const normalized = THREE.MathUtils.clamp((y - minY) / halfHeight, 0, 1);
    const distal = THREE.MathUtils.clamp((x + 2.58) / 2.85, 0, 1);
    const grind = THREE.MathUtils.smoothstep(normalized, 0.02, 0.60);
    const taper = THREE.MathUtils.lerp(0.012, 1, distal);
    return depth * 0.5 * THREE.MathUtils.lerp(0.04, 1.0, grind) * taper;
  };

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const sign = Math.sign(position.getZ(i)) || 1;
    const z = sign * halfThickness(x, y);
    output.push(x, y, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(output, 3));
  const minX = Math.min(...points.map((p) => p[0]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const minY2 = Math.min(...points.map((p) => p[1]));
  const maxY2 = Math.max(...points.map((p) => p[1]));
  const uv: number[] = [];
  for (let i = 0; i < output.length; i += 9) {
    for (let k = 0; k < 3; k += 1) {
      const x = output[i + k * 3];
      const y = output[i + k * 3 + 1];
      uv.push(
        ((x - minX) / Math.max(1e-5, maxX - minX)) * 1.8,
        1 - ((y - minY2) / Math.max(1e-5, maxY2 - minY2)),
      );
    }
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  source.dispose();
  return geometry;
}

function pinHead(radius: number, dome: number, height: number): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    profile.push(new THREE.Vector2(
      Math.max(0.0001, radius * Math.sin((t * Math.PI) / 2)),
      dome * Math.cos((t * Math.PI) / 2),
    ));
  }
  profile.push(new THREE.Vector2(radius, -height));
  const geometry = new THREE.LatheGeometry(profile, 24);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createNoiseTexture(
  width: number,
  height: number,
  sampler: (x: number, y: number) => [number, number, number, number],
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = sampler(x / Math.max(1, width - 1), y / Math.max(1, height - 1));
      const index = (y * width + x) * 4;
      image.data[index] = rgba[0];
      image.data[index + 1] = rgba[1];
      image.data[index + 2] = rgba[2];
      image.data[index + 3] = rgba[3];
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function rubySurfaceMaps(): {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const noise = (x: number, y: number): number => {
    const a = Math.sin((x * 17.0 + y * 8.3) * Math.PI * 2.0);
    const b = Math.sin((x * 43.0 - y * 22.0 + 0.4) * Math.PI * 2.0);
    const c = Math.sin((x * 93.0 + y * 61.0 + 0.7) * Math.PI * 2.0);
    return (a * 0.50 + b * 0.30 + c * 0.20) * 0.5 + 0.5;
  };
  const vein = (x: number, y: number): number => {
    const warped = y + 0.09 * Math.sin(x * 17.0) + 0.04 * Math.sin(x * 51.0 + y * 7.0);
    const bands = Math.abs(Math.sin((x * 3.2 + warped * 8.0) * Math.PI));
    return THREE.MathUtils.smoothstep(bands, 0.65, 0.98);
  };
  const albedo = createNoiseTexture(512, 256, (x, y) => {
    const n = noise(x, y);
    const v = vein(x, y);
    const red = Math.round(95 + n * 110 + v * 28);
    const green = Math.round(4 + n * 20 + v * 6);
    const blue = Math.round(8 + n * 22 + v * 8);
    return [red, green, blue, 255];
  });
  const roughness = createNoiseTexture(512, 256, (x, y) => {
    const n = noise(x, y);
    const v = vein(x, y);
    const r = Math.round(120 + n * 70 - v * 36);
    return [r, r, r, 255];
  });
  const normal = createNoiseTexture(512, 256, (x, y) => {
    const n = noise(x, y);
    const v = vein(x, y);
    const lift = Math.round(128 + (n - 0.5) * 22 + v * 18);
    return [lift, Math.max(90, lift - 12), 255, 255];
  });
  roughness.colorSpace = THREE.NoColorSpace;
  normal.colorSpace = THREE.NoColorSpace;
  return { albedo, roughness, normal };
}

function ivorySurfaceMaps(): {
  roughness: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const roughness = createNoiseTexture(256, 128, (x, y) => {
    const grain = Math.sin((x * 33 + y * 4) * Math.PI * 2) * 0.5 + 0.5;
    const r = Math.round(130 + grain * 60);
    return [r, r, r, 255];
  });
  const normal = createNoiseTexture(256, 128, (x, y) => {
    const grain = Math.sin((x * 33 + y * 4) * Math.PI * 2) * 0.5 + 0.5;
    const v = Math.round(126 + grain * 9);
    return [v, v, 255, 255];
  });
  roughness.colorSpace = THREE.NoColorSpace;
  normal.colorSpace = THREE.NoColorSpace;
  return { roughness, normal };
}

function makeMaterials(options: MeleeKarambitOptions): {
  ruby: THREE.MeshPhysicalMaterial;
  rubyEdge: THREE.MeshPhysicalMaterial;
  ivory: THREE.MeshPhysicalMaterial;
  ivoryEdge: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  seam: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
  glow: THREE.MeshBasicMaterial;
} {
  const maps = options.noTextures ? null : rubySurfaceMaps();
  const ivoryMaps = options.noTextures ? null : ivorySurfaceMaps();
  const ruby = new THREE.MeshPhysicalMaterial({
    color: maps ? 0xffffff : 0x9f0814,
    map: maps?.albedo,
    roughness: maps ? 0.48 : 0.42,
    roughnessMap: maps?.roughness,
    metalness: 0.22,
    normalMap: maps?.normal,
    normalScale: new THREE.Vector2(0.18, 0.18),
    clearcoat: 0.38,
    clearcoatRoughness: 0.20,
    envMapIntensity: 0.85,
    name: 'ruby-marbled-anodized-coat',
  });
  const rubyEdge = new THREE.MeshPhysicalMaterial({
    color: 0x6e0611,
    roughness: 0.30,
    metalness: 0.72,
    clearcoat: 0.26,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
    name: 'ruby-edge-and-inferred-walls',
  });
  const ivory = new THREE.MeshPhysicalMaterial({
    color: 0xd8d5c8,
    roughness: ivoryMaps ? 0.56 : 0.52,
    roughnessMap: ivoryMaps?.roughness,
    metalness: 0.12,
    normalMap: ivoryMaps?.normal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    clearcoat: 0.08,
    envMapIntensity: 0.74,
    name: 'aged-ivory-scale',
  });
  const ivoryEdge = new THREE.MeshPhysicalMaterial({
    color: 0x9e9a8c,
    roughness: 0.40,
    metalness: 0.20,
    envMapIntensity: 0.75,
    name: 'ivory-scale-edge',
  });
  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xb08a35,
    roughness: 0.30,
    metalness: 0.82,
    clearcoat: 0.18,
    clearcoatRoughness: 0.20,
    envMapIntensity: 1.15,
    name: 'brass-fasteners-and-medallion',
  });
  const seam = new THREE.MeshPhysicalMaterial({
    color: 0x6c5725,
    roughness: 0.42,
    metalness: 0.65,
    envMapIntensity: 0.8,
    name: 'panel-seams',
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x1a1011,
    roughness: 0.62,
    metalness: 0.25,
    envMapIntensity: 0.45,
    name: 'recess-and-cavity',
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0xff3850,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    name: 'ruby-edge-glow',
  });
  return { ruby, rubyEdge, ivory, ivoryEdge, brass, seam, dark, glow };
}

function addPin(
  parent: THREE.Object3D,
  id: string,
  x: number,
  y: number,
  material: THREE.Material,
  runtime: MeleeKarambitRuntime,
): THREE.Mesh {
  const mesh = new THREE.Mesh(pinHead(0.075, 0.024, 0.010), material);
  mesh.position.set(x, y, FRONT_Z * 0.145);
  mesh.rotation.x = Math.PI / 2;
  return addPart(parent, id, mesh, runtime, true);
}

function createMedallion(
  parent: THREE.Object3D,
  x: number,
  y: number,
  brass: THREE.Material,
  dark: THREE.Material,
  runtime: MeleeKarambitRuntime,
): THREE.Group {
  const group = addGroup(parent, 'centralFlowerMedallion', runtime);
  const rim = new THREE.Mesh(annulus(x, y, 0.19, 0.145, 0.025, 0.008), brass);
  addPart(group, 'medallionRim', rim, runtime, true);
  const inlay = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.018, 40), dark);
  inlay.rotation.x = Math.PI / 2;
  inlay.position.set(x, y, 0.155);
  addPart(group, 'medallionInlay', inlay, runtime, true);
  const spokeGeometry = new THREE.BoxGeometry(0.20, 0.035, 0.018);
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(spokeGeometry, brass);
    spoke.name = `medallionSpoke${i + 1}`;
    spoke.position.set(x, y, 0.172);
    spoke.rotation.z = (i * Math.PI) / 5;
    spoke.castShadow = true;
    spoke.receiveShadow = true;
    spoke.userData.explodeWithParent = true;
    group.add(spoke);
    runtime.nodes[spoke.name] = spoke;
    runtime.meshes.push(spoke);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8), brass);
  hub.position.set(x, y, 0.188);
  addPart(group, 'medallionHub', hub, runtime, true);
  return group;
}

function addLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'meleeKarambitLookDevLights';
  const key = new THREE.DirectionalLight(0xffefe0, 1.55);
  key.position.set(-2.8, 4.0, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const fill = new THREE.DirectionalLight(0x9bbdff, 0.34);
  fill.position.set(3.8, -0.8, 2.4);
  const rim = new THREE.DirectionalLight(0xff4458, 0.72);
  rim.position.set(1.5, 1.6, -4.0);
  lights.add(key, fill, rim, new THREE.AmbientLight(0x301016, 0.22));
  return lights;
}

export function createMeleeKarambitLookDevLights(): THREE.Group {
  return addLookDevLights();
}

export function makeMeleeKarambitBackground(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const gradient = context.createRadialGradient(size * 0.45, size * 0.44, 12, size * 0.5, size * 0.5, size * 0.72);
  gradient.addColorStop(0, '#261018');
  gradient.addColorStop(1, '#030204');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMeleeKarambitModel(options: MeleeKarambitOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const root = new THREE.Group();
  root.name = 'meleeKarambitRoot';
  const asset = new THREE.Group();
  asset.name = 'meleeKarambitGeometry';
  // Put the ring axis at the root origin. This makes the idle turn physically meaningful.
  asset.position.set(-RING_CENTER[0], -RING_CENTER[1], 0);
  root.add(asset);

  const runtime: MeleeKarambitRuntime = {
    nodes: { root, asset },
    meshes: [],
    sockets: {},
    colliders: {
      bladeBody: { type: 'polygon-prism', notes: 'proxy over the curved red blade and serration spine' },
      ivoryHandle: { type: 'rounded-box', notes: 'proxy over the three scale panels' },
      fingerRing: { type: 'annulus', notes: 'proxy centered on the real ring opening' },
    },
    destructionGroups: {},
    provenance: {
      route: 'procedural-finish',
      exactnessTier: 'image-only',
      reference: 'guns image models/01-melee.png',
      inferred: [
        'all thickness values and hidden back-side structure',
        'exact alloy composition and surface microstructure',
        'rear-side scale panel construction and tang geometry',
      ],
    },
    idlePeriodSeconds: 9,
  };
  root.userData.sculptRuntime = runtime;

  const materials = makeMaterials(options);
  const ruby = materials.ruby;
  const rubyEdge = materials.rubyEdge;
  const ivory = materials.ivory;
  const ivoryEdge = materials.ivoryEdge;
  const brass = materials.brass;
  const seam = materials.seam;
  const dark = materials.dark;

  const bladeGroup = addGroup(asset, 'bladeAssembly', runtime);
  const bladePoints: XY[] = [
    [-2.62, -0.83], [-2.36, -0.51], [-2.04, -0.28], [-1.66, -0.02], [-1.22, 0.19],
    [-0.72, 0.31], [-0.25, 0.36], [0.15, 0.40], [0.27, 0.62],
    [0.12, 0.82], [-0.02, 0.70], [-0.15, 0.90], [-0.34, 0.72], [-0.48, 0.93],
    [-0.66, 0.75], [-0.82, 0.97], [-1.00, 0.78], [-1.16, 0.91], [-1.34, 0.68],
    [-1.55, 0.64], [-1.82, 0.51], [-2.05, 0.34], [-2.28, 0.12], [-2.48, -0.24],
  ];
  const bladeHoles: Hole[] = [
    { cx: -1.17, cy: 0.42, r: 0.105 },
    { cx: -0.82, cy: 0.51, r: 0.145 },
    { cx: -0.43, cy: 0.56, r: 0.185 },
  ];
  const bladeGeometry = createGroundBlade(bladePoints, bladeHoles, 0.17);
  const bladeMesh = new THREE.Mesh(bladeGeometry, ruby);
  addPart(bladeGroup, 'bladeBody', bladeMesh, runtime);
  // Dark inner walls make the three openings read as holes even in a close orbit.
  const holeWalls = addGroup(bladeGroup, 'bladeHoleWalls', runtime);
  for (const [i, hole] of bladeHoles.entries()) {
    const wall = new THREE.Mesh(annulus(hole.cx, hole.cy, hole.r + 0.018, hole.r, 0.19, 0.004), rubyEdge);
    addPart(holeWalls, `bladeHoleWall${i + 1}`, wall, runtime, true);
  }
  const bladeEdge = new THREE.Mesh(slab(bladePoints, 0.018, 0.002), rubyEdge);
  bladeEdge.position.z = -0.095;
  addPart(bladeGroup, 'bladeLowerEdgeAccent', bladeEdge, runtime, true);

  const tangGroup = addGroup(asset, 'redTangAssembly', runtime);
  const tangPoints: XY[] = [
    [-0.02, 0.56], [0.33, 0.48], [0.58, 0.45], [0.84, 0.39], [1.20, 0.34], [1.66, 0.32],
    [2.06, 0.25], [2.44, 0.22], [2.68, 0.00], [2.55, -0.26], [2.24, -0.30], [1.86, -0.18],
    [1.44, -0.13], [1.02, -0.18], [0.64, -0.25], [0.28, -0.19], [0.10, 0.08],
  ];
  addPart(tangGroup, 'redTang', new THREE.Mesh(slab(tangPoints, 0.19, 0.012), ruby), runtime);

  const panelGroup = addGroup(asset, 'ivoryScaleAssembly', runtime);
  const panelA: XY[] = [[0.18, 0.60], [0.82, 0.52], [0.84, 0.24], [0.72, -0.07], [0.56, -0.23], [0.38, -0.19], [0.25, -0.08], [0.08, 0.15]];
  const panelB: XY[] = [[0.84, 0.52], [1.58, 0.48], [1.63, -0.10], [1.48, -0.22], [1.26, -0.26], [1.03, -0.16], [0.84, 0.24]];
  const panelC: XY[] = [[1.60, 0.48], [2.16, 0.41], [2.31, 0.27], [2.29, 0.06], [2.18, -0.17], [2.05, -0.29], [1.84, -0.20], [1.63, -0.10]];
  const panels = [panelA, panelB, panelC];
  for (const [i, points] of panels.entries()) {
    const panel = new THREE.Mesh(slab(points, 0.23, 0.020), ivory);
    addPart(panelGroup, `ivoryScalePanel${String.fromCharCode(65 + i)}`, panel, runtime);
  }

  const seamA = new THREE.Mesh(slab([[0.80, 0.54], [0.86, 0.53], [0.87, -0.13], [0.81, -0.15]], 0.245, 0.006), seam);
  const seamB = new THREE.Mesh(slab([[1.56, 0.50], [1.62, 0.49], [1.65, -0.13], [1.59, -0.14]], 0.245, 0.006), seam);
  addPart(panelGroup, 'panelSeamA', seamA, runtime, true);
  addPart(panelGroup, 'panelSeamB', seamB, runtime, true);

  const fastenerPositions: XY[] = [
    [0.36, 0.39], [0.66, 0.07], [1.02, 0.31], [1.48, 0.24], [1.86, 0.30], [2.16, 0.18],
  ];
  for (const [i, p] of fastenerPositions.entries()) addPin(panelGroup, `brassFastener${i + 1}`, p[0], p[1], brass, runtime);
  createMedallion(panelGroup, 1.29, 0.27, brass, dark, runtime);

  const ringGroup = addGroup(asset, 'fingerRingAssembly', runtime);
  const ring = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], 0.56, 0.34, 0.22, 0.018), ruby);
  addPart(ringGroup, 'fingerRing', ring, runtime);
  const ringInner = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], 0.345, 0.326, 0.26, 0.004), rubyEdge);
  addPart(ringGroup, 'fingerRingInnerWall', ringInner, runtime, true);
  const ringHighlight = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], 0.585, 0.558, 0.025, 0.006), materials.glow);
  addPart(ringGroup, 'fingerRingRubyHighlight', ringHighlight, runtime, true);

  // A small real lower finger groove gives the handle its characteristic downward hook.
  const groove = new THREE.Mesh(slab([[1.86, -0.16], [2.02, -0.22], [2.04, -0.37], [1.96, -0.47], [1.84, -0.31], [1.80, -0.21]], 0.255, 0.015), ivory);
  addPart(panelGroup, 'lowerFingerGroove', groove, runtime);

  addSocket(asset, 'bladeBaseSocket', [0.24, 0.42], runtime);
  addSocket(asset, 'ringAxisSocket', RING_CENTER, runtime);
  addSocket(asset, 'scalePanelSocket', [1.23, 0.20], runtime);

  runtime.destructionGroups = {
    bladeAssembly: ['bladeBody', 'bladeLowerEdgeAccent', 'bladeHoleWalls'],
    redTangAssembly: ['redTang'],
    ivoryScaleAssembly: [
      'ivoryScalePanelA', 'ivoryScalePanelB', 'ivoryScalePanelC', 'panelSeamA', 'panelSeamB',
      'lowerFingerGroove', 'centralFlowerMedallion',
    ],
    fingerRingAssembly: ['fingerRing', 'fingerRingInnerWall', 'fingerRingRubyHighlight'],
  };

  root.userData.reconstruction = {
    generatedWith: 'img2threejs skill · procedural karambit adapter',
    reference: 'guns image models/01-melee.png',
    route: 'procedural-finish',
    exactnessTier: 'image-only',
    visualNotes: 'Broadside reference; silhouette, serrations, holes, panel seams, ring and medallion are explicit geometry.',
  };

  // The red finish is environment-sensitive. Rotate around the actual finger-ring axis so the
  // idle reveals thickness and specular response without inventing a mechanism.
  root.userData.tick = (_dt: number, elapsed: number): void => {
    const t = (elapsed % runtime.idlePeriodSeconds) / runtime.idlePeriodSeconds;
    const phase = t * Math.PI * 2;
    root.rotation.y = Math.sin(phase) * THREE.MathUtils.degToRad(18);
    root.rotation.x = Math.sin(phase * 2) * THREE.MathUtils.degToRad(3.8);
    root.rotation.z = Math.sin(phase) * THREE.MathUtils.degToRad(1.8);
  };

  // Honour the caller's shadow choice without changing the geometry contract.
  if (!shadows) {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
  }

  return root;
}
