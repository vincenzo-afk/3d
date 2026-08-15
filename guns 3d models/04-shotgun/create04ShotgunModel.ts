import * as THREE from 'three';
import { shotgunProjectionCalibration, shotgunReferenceTrace } from './shotgunTrace';

export type ShotgunRifleModelOptions = {
  shadows?: boolean;
  noTextures?: boolean;
  textureSize?: number;
  wireframe?: boolean;
  disableIdle?: boolean;
};

type V3 = [number, number, number];
type MaterialKind = 'wood-stock' | 'wood-pump-fore-end' | 'blued-receiver-metal' | 'blued-barrel-metal' | 'magazine-tube-metal' | 'band-edge-metal' | 'muzzle-knurled-metal' | 'rubber-and-cavity' | 'cavity-material' | 'polished-action-metal';
type MaterialSet = Record<MaterialKind | 'hidden', THREE.MeshPhysicalMaterial>;

type ShotgunRuntime = {
  macros: Record<string, THREE.Group>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Array<{ id: string; object: THREE.Object3D }>;
  destructionGroups: Record<string, string[]>;
  selectableParts: string[];
  pumpSlide: { start: V3; end: V3 };
};

const FRONT_Z = 0.34;
const trace = shotgunReferenceTrace;

function hash(a: number, b = 0, c = 0): number {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function ellipseLoop(cx: number, cy: number, rx: number, ry: number, steps = 32): Array<[number, number]> {
  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

function createTexture(kind: MaterialKind, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const wood = kind === 'wood-stock' || kind === 'wood-pump-fore-end';
  const metal = kind.includes('metal') || kind.includes('barrel') || kind.includes('magazine');
  const base = wood ? (kind === 'wood-pump-fore-end' ? '#845638' : '#744832') : (metal ? '#30404B' : '#17212A');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  if (wood) {
    for (let i = 0; i < 34; i += 1) {
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(18,8,4,0.42)' : 'rgba(162,89,51,0.20)';
      ctx.lineWidth = 1 + hash(i, 3) * 2;
      ctx.beginPath();
      const y = size * (0.04 + hash(i, 5) * 0.92);
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += size / 8) {
        ctx.lineTo(x, y + Math.sin((x / size) * Math.PI * 2 + i) * size * (0.008 + hash(i, 7) * 0.022));
      }
      ctx.stroke();
    }
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = 'rgba(245,169,102,0.06)';
      ctx.fillRect(hash(i, 17) * size, hash(i, 19) * size, 2 + hash(i, 21) * 10, 1 + hash(i, 23) * 3);
    }
  } else if (kind === 'muzzle-knurled-metal' || kind === 'band-edge-metal' || kind === 'polished-action-metal') {
    for (let i = -size; i < size * 2; i += 10) {
      ctx.strokeStyle = 'rgba(220,235,244,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(145,180,205,0.08)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(hash(i, 31) * size, hash(i, 37) * size, 1 + hash(i, 41) * 5, 1 + hash(i, 43) * 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.1, 1.1);
  texture.anisotropy = 8;
  return texture;
}

function makeMaterial(kind: MaterialKind | 'hidden', options: ShotgunRifleModelOptions): THREE.MeshPhysicalMaterial {
  const colors: Record<MaterialKind | 'hidden', string> = {
    'wood-stock': '#744832',
    'wood-pump-fore-end': '#845638',
    'blued-receiver-metal': '#30404B',
    'blued-barrel-metal': '#2B3943',
    'magazine-tube-metal': '#2B3740',
    'band-edge-metal': '#9FAEB8',
    'muzzle-knurled-metal': '#607380',
    'rubber-and-cavity': '#171C20',
    'cavity-material': '#05080B',
    'polished-action-metal': '#BDCAD1',
    hidden: '#000000',
  };
  const roughness: Record<MaterialKind | 'hidden', number> = {
    'wood-stock': 0.52,
    'wood-pump-fore-end': 0.48,
    'blued-receiver-metal': 0.34,
    'blued-barrel-metal': 0.28,
    'magazine-tube-metal': 0.31,
    'band-edge-metal': 0.20,
    'muzzle-knurled-metal': 0.34,
    'rubber-and-cavity': 0.86,
    'cavity-material': 0.92,
    'polished-action-metal': 0.22,
    hidden: 1.0,
  };
  const metalness: Record<MaterialKind | 'hidden', number> = {
    'wood-stock': 0.0,
    'wood-pump-fore-end': 0.0,
    'blued-receiver-metal': 0.90,
    'blued-barrel-metal': 0.93,
    'magazine-tube-metal': 0.92,
    'band-edge-metal': 0.95,
    'muzzle-knurled-metal': 0.91,
    'rubber-and-cavity': 0.05,
    'cavity-material': 0.02,
    'polished-action-metal': 0.94,
    hidden: 0.0,
  };
  const material = new THREE.MeshPhysicalMaterial({
    name: `shotgun-${kind}`,
    color: colors[kind],
    map: options.noTextures || kind === 'hidden' ? undefined : createTexture(kind, Math.max(64, Math.min(options.textureSize ?? 256, 512))),
    roughness: roughness[kind],
    metalness: metalness[kind],
    clearcoat: kind === 'wood-stock' || kind === 'wood-pump-fore-end' ? 0.34 : kind === 'polished-action-metal' ? 0.22 : 0.08,
    clearcoatRoughness: 0.18,
    envMapIntensity: kind === 'wood-stock' || kind === 'wood-pump-fore-end' ? 0.82 : 1.12,
    side: THREE.DoubleSide,
    emissive: kind === 'wood-stock' || kind === 'wood-pump-fore-end' ? new THREE.Color('#160702') : new THREE.Color('#02060A'),
    emissiveIntensity: kind === 'wood-stock' || kind === 'wood-pump-fore-end' ? 0.08 : 0.08,
  });
  if (options.wireframe) material.wireframe = true;
  return material;
}

function roundedBox(width: number, height: number, depth: number, radius = 0.02): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(0, 0, 0);
  geometry.computeVertexNormals();
  void radius;
  return geometry;
}

function extrude(points: Array<[number, number]>, depth: number, holes: Array<Array<[number, number]>> = []): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  for (const holePoints of holes) {
    const hole = new THREE.Path();
    holePoints.forEach(([x, y], i) => i === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y));
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.018, bevelThickness: 0.018, curveSegments: 12 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderX(radius: number, length: number, segments = 32): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderY(radius: number, length: number, segments = 32): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.computeVertexNormals();
  return geometry;
}

function tubePath(points: V3[], radius: number, tubularSegments = 24): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  geometry.computeVertexNormals();
  return geometry;
}

function tubeBetween(start: V3, end: V3, radius: number, segments = 18): THREE.TubeGeometry {
  return tubePath([start, end], radius, 8 + segments);
}

function torusX(radius: number, tube: number): THREE.TorusGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, 12, 32);
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addMesh(group: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, runtime: ShotgunRuntime, shadows: boolean): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData.runtimeId = name;
  mesh.userData.selectable = true;
  mesh.userData.destructionGroup = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  group.add(mesh);
  runtime.meshes[name] = mesh;
  runtime.selectableParts.push(name);
  runtime.destructionGroups[name] = [name];
  return mesh;
}

function addSocket(group: THREE.Group, name: string, position: V3, runtime: ShotgunRuntime, axis: V3 = [1, 0, 0]): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  socket.userData.socket = true;
  socket.userData.axis = axis;
  group.add(socket);
  runtime.sockets[name] = socket;
  return socket;
}

function addCollider(id: string, object: THREE.Object3D, runtime: ShotgunRuntime): void {
  runtime.colliders.push({ id, object });
}

function addFastener(group: THREE.Group, name: string, position: V3, material: THREE.Material, runtime: ShotgunRuntime, shadows: boolean, radius = 0.035): THREE.Mesh {
  const fastener = addMesh(group, name, new THREE.CylinderGeometry(radius, radius, 0.025, 20), material, runtime, shadows);
  fastener.rotation.x = Math.PI / 2;
  fastener.position.set(...position);
  return fastener;
}

function addStock(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const shell = addMesh(group, 'stockWoodShell', extrude([
    [-2.18, 0.10], [-2.06, 0.34], [-1.66, 0.39], [-1.32, 0.34], [-1.00, 0.24], [-0.82, 0.12], [-0.96, 0.02], [-1.32, -0.02], [-1.62, -0.28], [-2.12, -0.25],
  ], 0.54), materials['wood-stock'], runtime, shadows);
  shell.userData.feature = 'organic-hardwood-stock-profile';
  const cheek = addMesh(group, 'stockCheekRest', extrude([[-1.64, 0.31], [-1.34, 0.39], [-1.05, 0.28], [-1.18, 0.18], [-1.55, 0.20]], 0.40), materials['wood-stock'], runtime, shadows);
  cheek.position.z = 0.01;
  const grip = addMesh(group, 'gripTransition', extrude([[-1.40, 0.10], [-1.06, 0.16], [-1.10, -0.10], [-1.24, -0.36], [-1.46, -0.29], [-1.56, -0.07]], 0.48), materials['wood-stock'], runtime, shadows);
  grip.position.z = 0.02;
  for (let i = 0; i < 7; i += 1) {
    const check = addMesh(group, `gripCheckering${i + 1}`, roundedBox(0.10, 0.018, 0.026, 0.004), materials['polished-action-metal'], runtime, shadows);
    check.position.set(-1.43 + (i % 4) * 0.09, -0.05 - Math.floor(i / 4) * 0.11, FRONT_Z * 0.82);
    check.rotation.z = i % 2 ? -0.62 : 0.62;
  }
  const buttpad = addMesh(group, 'buttpad', roundedBox(0.16, 0.84, 0.54, 0.03), materials['rubber-and-cavity'], runtime, shadows);
  buttpad.position.set(-2.13, -0.08, 0);
  for (let i = 0; i < 5; i += 1) {
    const ridge = addMesh(group, `buttpadTraction${i + 1}`, roundedBox(0.018, 0.11, 0.43, 0.006), materials['cavity-material'], runtime, shadows);
    ridge.position.set(-2.22, -0.37 + i * 0.15, FRONT_Z * 0.78);
    ridge.rotation.z = i % 2 ? -0.20 : 0.20;
  }
  const loop = addMesh(group, 'slingLoop', torusX(0.11, 0.025), materials['polished-action-metal'], runtime, shadows);
  loop.position.set(-1.98, -0.55, 0);
  addFastener(group, 'stockRearFastener', [-1.94, 0.32, FRONT_Z * 0.76], materials['polished-action-metal'], runtime, shadows, 0.03);
  addFastener(group, 'stockFrontFastener', [-0.98, 0.29, FRONT_Z * 0.76], materials['polished-action-metal'], runtime, shadows, 0.03);
  addSocket(group, 'stockAssemblySocket', [-0.75, 0.18, 0], runtime, [1, 0, 0]);
  addCollider('stock-collider', shell, runtime);
}

function addReceiver(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const shell = addMesh(group, 'receiverShell', extrude([
    [-0.82, 0.00], [-0.72, 0.28], [-0.52, 0.38], [0.18, 0.38], [0.32, 0.28], [0.32, -0.08], [0.15, -0.18], [-0.58, -0.18],
  ], 0.62), materials['blued-receiver-metal'], runtime, shadows);
  shell.userData.feature = 'rounded-pump-action-receiver';
  const topCrown = addMesh(group, 'receiverTopCrown', roundedBox(0.82, 0.08, 0.58, 0.012), materials['band-edge-metal'], runtime, shadows);
  topCrown.position.set(-0.16, 0.40, 0);
  const ejection = addMesh(group, 'ejectionPortCavity', roundedBox(0.38, 0.13, 0.05, 0.018), materials['cavity-material'], runtime, shadows);
  ejection.position.set(-0.18, 0.25, FRONT_Z * 0.96);
  const ejectionLip = addMesh(group, 'ejectionPortLip', roundedBox(0.42, 0.025, 0.06, 0.006), materials['polished-action-metal'], runtime, shadows);
  ejectionLip.position.set(-0.18, 0.33, FRONT_Z * 0.98);
  const actionBar = addMesh(group, 'actionSeam', roundedBox(0.76, 0.025, 0.025, 0.004), materials['polished-action-metal'], runtime, shadows);
  actionBar.position.set(-0.28, -0.08, FRONT_Z * 0.96);
  for (let i = 0; i < 4; i += 1) {
    addFastener(group, `receiverPin${i + 1}`, [-0.68 + i * 0.27, -0.17, FRONT_Z * 0.98], materials['polished-action-metal'], runtime, shadows, 0.026);
  }
  const loadingBar = addMesh(group, 'receiverFrontLoadingBar', roundedBox(0.30, 0.10, 0.08, 0.014), materials['blued-receiver-metal'], runtime, shadows);
  loadingBar.position.set(0.37, 0.08, FRONT_Z * 0.93);
  addSocket(group, 'receiverActionAssemblySocket', [-0.74, 0.18, 0], runtime, [1, 0, 0]);
  addCollider('receiver-collider', shell, runtime);
}

function addTrigger(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const guard = addMesh(group, 'triggerGuardSystem', tubePath([[-0.56, -0.16, FRONT_Z * 0.90], [-0.54, -0.38, FRONT_Z * 0.90], [-0.20, -0.39, FRONT_Z * 0.90], [-0.14, -0.16, FRONT_Z * 0.90]], 0.040, 22), materials['polished-action-metal'], runtime, shadows);
  guard.userData.feature = 'open-trigger-guard';
  const blade = addMesh(group, 'triggerBlade', tubePath([[-0.34, -0.18, FRONT_Z * 0.98], [-0.36, -0.30, FRONT_Z * 0.98], [-0.29, -0.35, FRONT_Z * 0.98]], 0.032, 16), materials['polished-action-metal'], runtime, shadows);
  blade.userData.feature = 'curved-trigger-blade';
  addFastener(group, 'triggerPivot', [-0.38, -0.16, FRONT_Z], materials['band-edge-metal'], runtime, shadows, 0.032);
  addSocket(group, 'triggerAssemblySocket', [-0.48, -0.18, 0], runtime, [0, -1, 0]);
  addCollider('trigger-collider', guard, runtime);
}

function addUpperBarrel(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const barrel = addMesh(group, 'upperBarrelTube', cylinderX(0.105, 2.42, 40), materials['blued-barrel-metal'], runtime, shadows);
  barrel.position.set(0.80, 0.40, 0);
  const shoulder = addMesh(group, 'upperBarrelRootShoulder', cylinderX(0.17, 0.22, 32), materials['blued-receiver-metal'], runtime, shadows);
  shoulder.position.set(-0.40, 0.40, 0);
  const highlight = addMesh(group, 'upperBarrelHighlight', roundedBox(1.55, 0.018, 0.014, 0.002), materials['band-edge-metal'], runtime, shadows);
  highlight.position.set(0.95, 0.47, FRONT_Z * 0.80);
  addSocket(group, 'upperBarrelAssemblySocket', [-0.42, 0.40, 0], runtime, [1, 0, 0]);
  addCollider('upper-barrel-collider', barrel, runtime);
}

function addMagazineTube(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const tube = addMesh(group, 'lowerMagazineTube', cylinderX(0.115, 2.52, 36), materials['magazine-tube-metal'], runtime, shadows);
  tube.position.set(0.86, 0.10, 0);
  const collar = addMesh(group, 'magazineTubeRearCollar', cylinderX(0.14, 0.10, 28), materials['band-edge-metal'], runtime, shadows);
  collar.position.set(-0.40, 0.10, 0);
  const cap = addMesh(group, 'magazineTubeCap', cylinderX(0.15, 0.14, 32), materials['muzzle-knurled-metal'], runtime, shadows);
  cap.position.set(2.13, 0.10, 0);
  addSocket(group, 'lowerMagazineTubeAssemblySocket', [-0.42, 0.10, 0], runtime, [1, 0, 0]);
  addCollider('magazine-tube-collider', tube, runtime);
}

function addPump(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const sleeve = addMesh(group, 'pumpWoodSleeve', extrude([
    [0.40, 0.00], [1.26, 0.00], [1.30, 0.12], [1.22, 0.29], [0.46, 0.29], [0.38, 0.17],
  ], 0.54), materials['wood-pump-fore-end'], runtime, shadows);
  sleeve.userData.feature = 'sliding-ribbed-hardwood-pump';
  for (let i = 0; i < 10; i += 1) {
    const rib = addMesh(group, `pumpRib${i + 1}`, roundedBox(0.036, 0.24, 0.05, 0.008), materials['wood-pump-fore-end'], runtime, shadows);
    rib.position.set(0.50 + i * 0.076, 0.15, FRONT_Z * 0.90);
  }
  for (const [i, x] of [0.46, 1.20].entries()) {
    const motif = addMesh(group, `pumpChevronCarving${i + 1}`, extrude([[x - 0.10, 0.10], [x, 0.28], [x + 0.10, 0.10], [x, 0.14]], 0.025), materials['rubber-and-cavity'], runtime, shadows);
    motif.position.z = FRONT_Z * 0.80;
  }
  const slideRod = addMesh(group, 'pumpSlideRod', cylinderX(0.026, 0.82, 20), materials['blued-barrel-metal'], runtime, shadows);
  slideRod.position.set(0.83, -0.03, 0);
  runtime.pumpSlide = { start: [0.38, 0.15, 0], end: [1.30, 0.15, 0] };
  addSocket(group, 'pumpForeEndAssemblySocket', [0.38, 0.15, 0], runtime, [1, 0, 0]);
  addCollider('pump-collider', sleeve, runtime);
}

function addFrontBand(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const upper = addMesh(group, 'frontBandUpperRing', torusX(0.13, 0.035), materials['band-edge-metal'], runtime, shadows);
  upper.position.set(1.57, 0.40, 0);
  const lower = addMesh(group, 'frontBandLowerRing', torusX(0.14, 0.035), materials['band-edge-metal'], runtime, shadows);
  lower.position.set(1.57, 0.10, 0);
  const bridge = addMesh(group, 'frontBandBridge', roundedBox(0.10, 0.34, 0.36, 0.015), materials['band-edge-metal'], runtime, shadows);
  bridge.position.set(1.57, 0.25, 0);
  addFastener(group, 'frontBandFastener', [1.57, 0.25, FRONT_Z * 0.78], materials['polished-action-metal'], runtime, shadows, 0.026);
  addSocket(group, 'frontBandAssemblySocket', [1.57, 0.25, 0], runtime, [1, 0, 0]);
  addCollider('front-band-collider', bridge, runtime);
}

function addMuzzle(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const collar = addMesh(group, 'muzzleCollar', cylinderX(0.18, 0.22, 32), materials['muzzle-knurled-metal'], runtime, shadows);
  collar.position.set(1.93, 0.40, 0);
  const cap = addMesh(group, 'muzzleKnurledCap', cylinderX(0.135, 0.23, 36), materials['muzzle-knurled-metal'], runtime, shadows);
  cap.position.set(2.10, 0.10, 0);
  for (let i = 0; i < 18; i += 1) {
    const ridge = addMesh(group, `muzzleKnurl${i + 1}`, roundedBox(0.018, 0.17, 0.035, 0.004), materials['band-edge-metal'], runtime, shadows);
    ridge.position.set(2.10, 0.10, FRONT_Z * 0.72);
    ridge.rotation.z = (i % 2 ? -1 : 1) * 0.42;
    ridge.rotation.y = (i / 18) * Math.PI * 2;
  }
  const bore = addMesh(group, 'muzzleBore', cylinderX(0.075, 0.035, 28), materials['cavity-material'], runtime, shadows);
  bore.position.set(2.22, 0.40, 0);
  const crown = addMesh(group, 'muzzleCrown', torusX(0.086, 0.016), materials['band-edge-metal'], runtime, shadows);
  crown.position.set(2.24, 0.40, 0);
  addSocket(group, 'muzzleAssemblySocket', [1.88, 0.25, 0], runtime, [1, 0, 0]);
  addCollider('muzzle-collider', collar, runtime);
}

function addSight(group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean): void {
  const base = addMesh(group, 'frontSightBase', roundedBox(0.18, 0.06, 0.20, 0.008), materials['band-edge-metal'], runtime, shadows);
  base.position.set(1.88, 0.54, 0);
  const post = addMesh(group, 'frontSightPost', roundedBox(0.05, 0.13, 0.10, 0.008), materials['polished-action-metal'], runtime, shadows);
  post.position.set(1.88, 0.63, 0);
  const notch = addMesh(group, 'frontSightNotch', roundedBox(0.024, 0.035, 0.12, 0.003), materials['cavity-material'], runtime, shadows);
  notch.position.set(1.88, 0.67, FRONT_Z * 0.78);
  addSocket(group, 'sightingAssemblySocket', [1.88, 0.54, 0], runtime, [0, 1, 0]);
}

export function create04ShotgunModel(options: ShotgunRifleModelOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const runtime: ShotgunRuntime = { macros: {}, meshes: {}, sockets: {}, colliders: [], destructionGroups: {}, selectableParts: [], pumpSlide: { start: [0, 0, 0], end: [0, 0, 0] } };
  const materials: MaterialSet = {
    'wood-stock': makeMaterial('wood-stock', options),
    'wood-pump-fore-end': makeMaterial('wood-pump-fore-end', options),
    'blued-receiver-metal': makeMaterial('blued-receiver-metal', options),
    'blued-barrel-metal': makeMaterial('blued-barrel-metal', options),
    'magazine-tube-metal': makeMaterial('magazine-tube-metal', options),
    'band-edge-metal': makeMaterial('band-edge-metal', options),
    'muzzle-knurled-metal': makeMaterial('muzzle-knurled-metal', options),
    'rubber-and-cavity': makeMaterial('rubber-and-cavity', options),
    'cavity-material': makeMaterial('cavity-material', { ...options, noTextures: true }),
    'polished-action-metal': makeMaterial('polished-action-metal', options),
    hidden: makeMaterial('hidden', { ...options, noTextures: true }),
  };
  const root = new THREE.Group();
  root.name = 'shotgun-root';
  root.userData.runtimeId = 'shotgun-root';
  root.userData.codeOnly = true;
  root.userData.noImportedAssets = true;
  runtime.destructionGroups.root = [];
  root.userData.sculptRuntime = runtime;
  root.userData.sourceTrace = trace;
  root.userData.projectionCalibration = shotgunProjectionCalibration;

  const assemblies: Array<[string, (group: THREE.Group, runtime: ShotgunRuntime, materials: MaterialSet, shadows: boolean) => void]> = [
    ['stockAssembly', addStock],
    ['receiverActionAssembly', addReceiver],
    ['triggerAssembly', addTrigger],
    ['upperBarrelAssembly', addUpperBarrel],
    ['lowerMagazineTubeAssembly', addMagazineTube],
    ['pumpForeEndAssembly', addPump],
    ['frontBandAssembly', addFrontBand],
    ['muzzleAssembly', addMuzzle],
    ['sightingAssembly', addSight],
  ];
  for (const [id, builder] of assemblies) {
    const group = new THREE.Group();
    group.name = id;
    group.userData.runtimeId = id;
    group.userData.selectable = true;
    runtime.macros[id] = group;
    runtime.selectableParts.push(id);
    runtime.destructionGroups[id] = [];
    root.add(group);
    builder(group, runtime, materials, shadows);
  }

  addSocket(root, 'pump-slide-line', [0.34, 0.18, 0], runtime, [1, 0, 0]);
  const sightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.88, 0.67, 0), new THREE.Vector3(2.24, 0.42, 0)]),
    new THREE.LineBasicMaterial({ color: 0xd4b18d, transparent: true, opacity: 0.16 }),
  );
  sightLine.name = 'pump-shotgun-sight-line';
  sightLine.userData.scopeSightLine = true;
  root.add(sightLine);
  runtime.sockets['pump-slide-line'] = sightLine;

  const idleObjects = [runtime.meshes.frontSightPost, runtime.meshes.muzzleCrown].filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
  root.userData.tick = (_dt: number, elapsed: number): void => {
    if (options.disableIdle) return;
    const pulse = 0.07 + Math.sin(elapsed * 1.2) * 0.025;
    for (const mesh of idleObjects) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = pulse;
    }
    sightLine.visible = Math.sin(elapsed * 0.65) > -0.92;
  };
  root.userData.inspect = {
    source: trace.source,
    referenceBounds: trace.foregroundBounds,
    routes: { broadside: '?projection=1&ortho=1&view=front', studio: '?view=studio&projection=1&ortho=1&studio=1', orbit: '?view=three-quarter', neutral: '?view=neutral&projection=1&ortho=1&neutral=1' },
    runtimeMeshCount: Object.keys(runtime.meshes).length,
    pumpSlide: runtime.pumpSlide,
  };
  return root;
}

export function createShotgunLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'shotgun-lookdev-lights';
  const key = new THREE.DirectionalLight(0xffe3cf, 1.48);
  key.position.set(-3.8, 4.6, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const fill = new THREE.DirectionalLight(0x8ba5c2, 0.46);
  fill.position.set(3.4, 0.8, 3.2);
  const rim = new THREE.DirectionalLight(0xb77c5d, 0.46);
  rim.position.set(2.2, 2.5, -4.6);
  const hemisphere = new THREE.HemisphereLight(0xbfd2eb, 0x0b0806, 0.44);
  hemisphere.position.set(0, 4.5, 0);
  const ambient = new THREE.AmbientLight(0x090a0c, 0.25);
  lights.add(key, fill, rim, hemisphere, ambient);
  return lights;
}

export function makeShotgunBackground(): THREE.Color {
  return new THREE.Color(0x010203);
}
