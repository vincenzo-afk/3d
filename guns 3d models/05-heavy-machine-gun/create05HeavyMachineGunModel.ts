import * as THREE from 'three';
import { hmgProjectionCalibration, hmgReferenceTrace } from './hmgTrace';

export type HeavyMachineGunModelOptions = {
  shadows?: boolean;
  noTextures?: boolean;
  textureSize?: number;
  wireframe?: boolean;
  disableIdle?: boolean;
};

type V3 = [number, number, number];
type MaterialKind = 'dark-blued-metal' | 'painted-composite' | 'polymer-grip' | 'feed-belt-brass' | 'belt-link-metal' | 'bipod-metal' | 'muzzle-metal' | 'cavity' | 'glass-optic' | 'painted-accent';
type MaterialSet = Record<MaterialKind | 'hidden', THREE.MeshPhysicalMaterial>;

type HeavyMachineGunRuntime = {
  macros: Record<string, THREE.Group>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Array<{ id: string; object: THREE.Object3D }>;
  destructionGroups: Record<string, string[]>;
  selectableParts: string[];
  interaction: {
    feedCover: { closed: V3; open: V3 };
    chargingHandle: { start: V3; end: V3 };
    bipod: { folded: V3; deployed: V3 };
    ammunitionBox: { mounted: V3; service: V3 };
  };
};

const FRONT_Z = 0.44;
const trace = hmgReferenceTrace;

function hash(a: number, b = 0, c = 0): number {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function roundedBox(width: number, height: number, depth: number, _radius = 0.02): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.computeVertexNormals();
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

function cylinderY(radius: number, length: number, segments = 28): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.computeVertexNormals();
  return geometry;
}

function torusX(radius: number, tube: number, segments = 32): THREE.TorusGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, 10, segments);
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function tubePath(points: V3[], radius: number, tubularSegments = 24): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  geometry.computeVertexNormals();
  return geometry;
}

function addMesh(group: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, runtime: HeavyMachineGunRuntime, shadows: boolean): THREE.Mesh {
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

function addSocket(group: THREE.Group, name: string, position: V3, runtime: HeavyMachineGunRuntime, axis: V3 = [1, 0, 0]): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  socket.userData.socket = true;
  socket.userData.axis = axis;
  group.add(socket);
  runtime.sockets[name] = socket;
  return socket;
}

function addCollider(id: string, object: THREE.Object3D, runtime: HeavyMachineGunRuntime): void {
  runtime.colliders.push({ id, object });
}

function addFastener(group: THREE.Group, name: string, position: V3, material: THREE.Material, runtime: HeavyMachineGunRuntime, shadows: boolean, radius = 0.035): THREE.Mesh {
  const fastener = addMesh(group, name, new THREE.CylinderGeometry(radius, radius, 0.028, 20), material, runtime, shadows);
  fastener.rotation.x = Math.PI / 2;
  fastener.position.set(...position);
  return fastener;
}

function createTexture(kind: MaterialKind, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const painted = kind === 'painted-composite' || kind === 'painted-accent';
  const brass = kind === 'feed-belt-brass';
  const polymer = kind === 'polymer-grip';
  const base = painted ? '#0A1727' : brass ? '#A97735' : polymer ? '#111B22' : kind === 'cavity' ? '#020406' : '#1A2630';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  if (painted) {
    for (let i = 0; i < 34; i += 1) {
      const y = size * (0.04 + hash(i, 11) * 0.92);
      const x0 = size * hash(i, 13) - size * 0.25;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(45,113,236,0.72)' : i % 3 === 1 ? 'rgba(22,184,190,0.62)' : 'rgba(110,61,220,0.58)';
      ctx.lineWidth = 1 + hash(i, 17) * 4;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      for (let x = x0; x <= size * 1.25; x += size / 9) {
        ctx.lineTo(x, y + Math.sin((x / size) * Math.PI * 3.0 + i * 0.7) * size * (0.025 + hash(i, 19) * 0.05));
      }
      ctx.stroke();
      if (i % 4 === 0) {
        ctx.fillStyle = 'rgba(94,215,206,0.38)';
        ctx.beginPath();
        ctx.arc(hash(i, 23) * size, y, 2 + hash(i, 29) * 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 110; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(90,150,220,0.11)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(hash(i, 31) * size, hash(i, 37) * size, 1 + hash(i, 41) * 5, 1 + hash(i, 43) * 4);
    }
  } else if (brass) {
    for (let i = 0; i < 26; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(255,219,135,0.20)' : 'rgba(44,20,4,0.16)';
      ctx.fillRect(hash(i, 47) * size, 0, 2 + hash(i, 53) * 6, size);
    }
  } else {
    for (let i = 0; i < 160; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(156,190,215,0.08)' : 'rgba(0,0,0,0.15)';
      ctx.fillRect(hash(i, 59) * size, hash(i, 61) * size, 1 + hash(i, 67) * 5, 1 + hash(i, 71) * 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.08, 1.08);
  texture.anisotropy = 8;
  return texture;
}

function makeMaterial(kind: MaterialKind | 'hidden', options: HeavyMachineGunModelOptions): THREE.MeshPhysicalMaterial {
  const colors: Record<MaterialKind | 'hidden', string> = {
    'dark-blued-metal': '#182635',
    'painted-composite': '#0B1827',
    'polymer-grip': '#121D25',
    'feed-belt-brass': '#B17B36',
    'belt-link-metal': '#40505B',
    'bipod-metal': '#2B3A45',
    'muzzle-metal': '#4A5E6B',
    cavity: '#020406',
    'glass-optic': '#0B2030',
    'painted-accent': '#1D5FA6',
    hidden: '#000000',
  };
  const roughness: Record<MaterialKind | 'hidden', number> = {
    'dark-blued-metal': 0.36,
    'painted-composite': 0.44,
    'polymer-grip': 0.72,
    'feed-belt-brass': 0.26,
    'belt-link-metal': 0.42,
    'bipod-metal': 0.40,
    'muzzle-metal': 0.30,
    cavity: 0.94,
    'glass-optic': 0.18,
    'painted-accent': 0.24,
    hidden: 1.0,
  };
  const metalness: Record<MaterialKind | 'hidden', number> = {
    'dark-blued-metal': 0.93,
    'painted-composite': 0.24,
    'polymer-grip': 0.04,
    'feed-belt-brass': 0.96,
    'belt-link-metal': 0.90,
    'bipod-metal': 0.94,
    'muzzle-metal': 0.95,
    cavity: 0.02,
    'glass-optic': 0.12,
    'painted-accent': 0.18,
    hidden: 0.0,
  };
  const material = new THREE.MeshPhysicalMaterial({
    name: `hmg-${kind}`,
    color: colors[kind],
    map: options.noTextures || kind === 'hidden' ? undefined : createTexture(kind, Math.max(96, Math.min(options.textureSize ?? 256, 512))),
    roughness: roughness[kind],
    metalness: metalness[kind],
    clearcoat: kind === 'painted-accent' ? 0.72 : kind === 'painted-composite' ? 0.42 : kind === 'glass-optic' ? 0.32 : 0.10,
    clearcoatRoughness: kind === 'painted-accent' ? 0.12 : 0.20,
    envMapIntensity: kind === 'feed-belt-brass' || kind === 'glass-optic' ? 1.24 : 1.08,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(kind === 'painted-accent' ? '#06152C' : '#02060A'),
    emissiveIntensity: kind === 'painted-accent' ? 0.10 : 0.055,
    transmission: kind === 'glass-optic' ? 0.10 : 0.0,
    ior: kind === 'glass-optic' ? 1.45 : 1.5,
  });
  if (options.wireframe) material.wireframe = true;
  return material;
}

function addStock(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const shell = addMesh(group, 'stockShell', extrude([
    [-2.86, 0.10], [-2.76, 0.48], [-2.38, 0.54], [-1.98, 0.46], [-1.72, 0.30], [-1.42, 0.22], [-1.52, 0.02], [-1.84, -0.02], [-2.12, -0.32], [-2.56, -0.38], [-2.83, -0.28],
  ], 0.62), materials['painted-composite'], runtime, shadows);
  shell.userData.feature = 'painted-composite-skeletal-stock';
  const cheek = addMesh(group, 'stockCheekRest', extrude([[-2.62, 0.36], [-2.28, 0.50], [-1.94, 0.44], [-2.03, 0.26], [-2.45, 0.22]], 0.48), materials['painted-composite'], runtime, shadows);
  cheek.position.z = 0.02;
  const support = addMesh(group, 'stockSupport', extrude([[-2.40, -0.02], [-2.03, 0.05], [-1.80, -0.28], [-2.18, -0.40], [-2.52, -0.30]], 0.48), materials['bipod-metal'], runtime, shadows);
  support.position.z = -0.02;
  const buttpad = addMesh(group, 'stockButtpad', roundedBox(0.16, 0.76, 0.60, 0.03), materials['polymer-grip'], runtime, shadows);
  buttpad.position.set(-2.80, 0.02, 0);
  for (let i = 0; i < 6; i += 1) {
    const ridge = addMesh(group, `stockPadRib${i + 1}`, roundedBox(0.018, 0.12, 0.48, 0.004), materials['cavity'], runtime, shadows);
    ridge.position.set(-2.89, -0.30 + i * 0.12, FRONT_Z * 0.80);
    ridge.rotation.z = i % 2 ? -0.18 : 0.18;
  }
  for (let i = 0; i < 7; i += 1) {
    const mark = addMesh(group, `stockPaintMark${i + 1}`, new THREE.TorusGeometry(0.06 + hash(i, 5) * 0.04, 0.012, 8, 18), materials['painted-accent'], runtime, shadows);
    mark.position.set(-2.64 + (i % 3) * 0.22, 0.12 - Math.floor(i / 3) * 0.15, FRONT_Z * 0.91);
    mark.rotation.x = Math.PI / 2;
    mark.scale.set(1.7, 0.65, 1.0);
  }
  const collar = addMesh(group, 'stockReceiverCollar', cylinderX(0.24, 0.18, 32), materials['dark-blued-metal'], runtime, shadows);
  collar.position.set(-1.37, 0.14, 0);
  addSocket(group, 'stockGripAssemblySocket', [-1.38, 0.14, 0], runtime, [1, 0, 0]);
  addCollider('stock-collider', shell, runtime);
}

function addReceiver(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const shell = addMesh(group, 'receiverShell', extrude([
    [-1.34, -0.24], [-1.26, 0.32], [-1.10, 0.50], [-0.74, 0.56], [0.38, 0.48], [0.56, 0.28], [0.52, -0.22], [0.28, -0.34], [-0.88, -0.36],
  ], 0.78), materials['dark-blued-metal'], runtime, shadows);
  shell.userData.feature = 'deep-heavy-machine-gun-receiver';
  const sidePlate = addMesh(group, 'receiverSidePlate', extrude([
    [-1.14, -0.10], [-1.05, 0.34], [-0.78, 0.42], [0.28, 0.36], [0.40, 0.16], [0.34, -0.16], [-0.80, -0.24],
  ], 0.06), materials['painted-composite'], runtime, shadows);
  sidePlate.position.z = FRONT_Z * 0.98;
  const upperPlate = addMesh(group, 'receiverUpperPlate', roundedBox(1.42, 0.10, 0.82, 0.018), materials['dark-blued-metal'], runtime, shadows);
  upperPlate.position.set(-0.38, 0.54, 0);
  const cavity = addMesh(group, 'receiverActionCavity', extrude([
    [-0.72, 0.04], [-0.62, 0.24], [0.12, 0.24], [0.22, 0.10], [0.14, -0.04], [-0.58, -0.08],
  ], 0.08), materials['cavity'], runtime, shadows);
  cavity.position.set(0, 0, FRONT_Z * 1.03);
  cavity.userData.feature = 'recessed-action-cavity';
  const seam = addMesh(group, 'receiverSeam', roundedBox(1.02, 0.022, 0.035, 0.004), materials['cavity'], runtime, shadows);
  seam.position.set(-0.40, -0.13, FRONT_Z * 1.04);
  const rearSeam = addMesh(group, 'receiverRearSeam', roundedBox(0.035, 0.58, 0.04, 0.004), materials['cavity'], runtime, shadows);
  rearSeam.position.set(-1.03, 0.13, FRONT_Z * 1.04);
  for (let i = 0; i < 10; i += 1) {
    const pin = addFastener(group, `receiverFastener${i + 1}`, [-1.08 + (i % 5) * 0.27, 0.33 - Math.floor(i / 5) * 0.52, FRONT_Z * 1.06], materials['bipod-metal'], runtime, shadows, 0.032);
    pin.userData.feature = 'receiver-fastener';
  }
  for (let i = 0; i < 9; i += 1) {
    const curl = addMesh(group, `receiverPaintTendril${i + 1}`, tubePath([
      [-1.02 + i * 0.14, 0.23 + Math.sin(i) * 0.06, FRONT_Z * 1.07],
      [-0.92 + i * 0.14, 0.30 + Math.cos(i * 1.6) * 0.08, FRONT_Z * 1.07],
      [-0.78 + i * 0.14, 0.21 + Math.sin(i * 0.7) * 0.07, FRONT_Z * 1.07],
    ], 0.018 + hash(i, 81) * 0.012, 14), materials['painted-accent'], runtime, shadows);
    curl.userData.feature = 'blue-teal-violet-painted-tendril';
  }
  addSocket(group, 'receiverAssemblySocket', [-1.34, 0.10, 0], runtime, [1, 0, 0]);
  addCollider('receiver-collider', shell, runtime);
}

function addFeedSystem(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const cover = addMesh(group, 'feedCover', extrude([[-0.30, 0.38], [-0.16, 0.58], [0.48, 0.56], [0.62, 0.38], [0.46, 0.30], [-0.18, 0.32]], 0.72), materials['dark-blued-metal'], runtime, shadows);
  cover.userData.feature = 'hinged-feed-cover';
  const coverLip = addMesh(group, 'feedCoverLip', roundedBox(0.76, 0.026, 0.74, 0.004), materials['bipod-metal'], runtime, shadows);
  coverLip.position.set(0.12, 0.33, 0);
  const latch = addFastener(group, 'feedCoverLatch', [0.46, 0.41, FRONT_Z * 1.02], materials['bipod-metal'], runtime, shadows, 0.035);
  latch.userData.feature = 'feed-cover-latch';
  const tray = addMesh(group, 'feedTray', extrude([[-0.18, 0.06], [-0.04, 0.18], [0.64, 0.18], [0.72, 0.02], [0.60, -0.08], [0.00, -0.08]], 0.46), materials['cavity'], runtime, shadows);
  tray.position.z = FRONT_Z * 0.96;
  tray.userData.feature = 'feed-tray-cavity';
  const guide = addMesh(group, 'feedGuide', roundedBox(0.10, 0.42, 0.72, 0.012), materials['belt-link-metal'], runtime, shadows);
  guide.position.set(0.60, -0.02, 0.08);
  guide.rotation.z = 0.08;
  for (let i = 0; i < 8; i += 1) {
    const y = 0.08 - i * 0.135;
    const cartridge = addMesh(group, `cartridge${i + 1}`, cylinderX(0.052, 0.22, 18), materials['feed-belt-brass'], runtime, shadows);
    cartridge.position.set(0.56 + (i % 2) * 0.012, y, FRONT_Z * 1.08);
    cartridge.rotation.z = Math.PI / 2;
    const bullet = addMesh(group, `cartridgeTip${i + 1}`, new THREE.ConeGeometry(0.052, 0.13, 18), materials['feed-belt-brass'], runtime, shadows);
    bullet.rotation.z = Math.PI / 2;
    bullet.position.set(0.70 + (i % 2) * 0.012, y, FRONT_Z * 1.08);
    const rim = addMesh(group, `cartridgeRim${i + 1}`, torusX(0.054, 0.010, 16), materials['feed-belt-brass'], runtime, shadows);
    rim.position.set(0.47 + (i % 2) * 0.012, y, FRONT_Z * 1.09);
    const link = addMesh(group, `beltLink${i + 1}`, roundedBox(0.12, 0.042, 0.05, 0.006), materials['belt-link-metal'], runtime, shadows);
    link.position.set(0.44, y - 0.065, FRONT_Z * 1.07);
    link.rotation.z = i % 2 ? -0.18 : 0.18;
  }
  const hinge = addMesh(group, 'feedGuideHinge', cylinderY(0.055, 0.42, 18), materials['belt-link-metal'], runtime, shadows);
  hinge.position.set(0.76, -0.05, 0.08);
  addSocket(group, 'feedSystemSocket', [0.18, 0.30, 0], runtime, [0, 0, 1]);
  addCollider('feed-collider', cover, runtime);
}

function addAmmunitionBox(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const box = addMesh(group, 'ammoBoxShell', extrude([[-0.12, -0.26], [0.08, -0.98], [0.72, -0.98], [0.94, -0.78], [0.88, -0.22], [0.58, -0.12], [0.10, -0.14]], 0.62), materials['painted-composite'], runtime, shadows);
  box.userData.feature = 'detachable-painted-ammunition-box';
  const frame = addMesh(group, 'ammoBoxFrame', extrude([[-0.08, -0.20], [0.06, -0.94], [0.68, -0.94], [0.86, -0.76], [0.80, -0.22], [0.54, -0.15], [0.10, -0.16]], 0.08), materials['bipod-metal'], runtime, shadows);
  frame.position.z = FRONT_Z * 0.98;
  const lid = addMesh(group, 'ammoBoxLid', roundedBox(0.70, 0.08, 0.66, 0.012), materials['bipod-metal'], runtime, shadows);
  lid.position.set(0.45, -0.20, 0.02);
  lid.rotation.z = -0.10;
  for (let i = 0; i < 5; i += 1) {
    const mark = addMesh(group, `ammoBoxPaintTendril${i + 1}`, tubePath([
      [0.08 + i * 0.13, -0.38 - (i % 2) * 0.15, FRONT_Z * 1.07],
      [0.20 + i * 0.13, -0.48 + Math.sin(i) * 0.06, FRONT_Z * 1.07],
      [0.28 + i * 0.13, -0.66 - Math.cos(i) * 0.08, FRONT_Z * 1.07],
    ], 0.022, 12), materials['painted-accent'], runtime, shadows);
    mark.userData.feature = 'ammo-box-painted-tendril';
  }
  for (let i = 0; i < 4; i += 1) {
    addFastener(group, `ammoBoxCornerFastener${i + 1}`, [0.02 + (i % 2) * 0.82, -0.30 - Math.floor(i / 2) * 0.62, FRONT_Z * 1.08], materials['bipod-metal'], runtime, shadows, 0.026);
  }
  const hinge = addMesh(group, 'ammoBoxHinge', cylinderX(0.035, 0.56, 16), materials['bipod-metal'], runtime, shadows);
  hinge.position.set(0.42, -0.17, 0.02);
  addSocket(group, 'ammunitionBoxAssemblySocket', [0.38, -0.18, 0], runtime, [0, 1, 0]);
  addCollider('ammo-box-collider', box, runtime);
}

function addBarrel(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const root = addMesh(group, 'barrelRoot', cylinderX(0.20, 0.22, 32), materials['dark-blued-metal'], runtime, shadows);
  root.position.set(0.48, 0.22, 0);
  const barrel = addMesh(group, 'barrelTube', cylinderX(0.12, 2.05, 40), materials['dark-blued-metal'], runtime, shadows);
  barrel.position.set(1.45, 0.22, 0);
  const gas = addMesh(group, 'gasBlock', cylinderX(0.18, 0.20, 28), materials['dark-blued-metal'], runtime, shadows);
  gas.position.set(1.62, 0.22, 0);
  for (let i = 0; i < 4; i += 1) {
    const collar = addMesh(group, `barrelCollar${i + 1}`, torusX(0.13 + i * 0.004, 0.022, 24), materials['muzzle-metal'], runtime, shadows);
    collar.position.set(0.74 + i * 0.17, 0.22, 0);
  }
  const highlight = addMesh(group, 'barrelHighlightBand', roundedBox(1.42, 0.018, 0.018, 0.003), materials['muzzle-metal'], runtime, shadows);
  highlight.position.set(1.48, 0.34, FRONT_Z * 0.82);
  addSocket(group, 'barrelAssemblySocket', [0.48, 0.22, 0], runtime, [1, 0, 0]);
  addCollider('barrel-collider', barrel, runtime);
}

function addHandguard(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const shell = addMesh(group, 'handguardShell', extrude([
    [0.44, -0.18], [0.56, 0.45], [1.76, 0.47], [1.94, 0.32], [1.88, -0.25], [1.68, -0.34], [0.62, -0.30],
  ], 0.68), materials['painted-composite'], runtime, shadows);
  shell.userData.feature = 'ventilated-painted-handguard';
  for (let i = 0; i < 8; i += 1) {
    const vent = addMesh(group, `handguardVent${i + 1}`, extrude([[-0.10, -0.035], [0.04, -0.06], [0.18, 0.0], [0.04, 0.06], [-0.10, 0.035]], 0.04), materials['cavity'], runtime, shadows);
    vent.position.set(0.70 + i * 0.14, 0.12 + (i % 2) * 0.04, FRONT_Z * 1.03);
    vent.rotation.z = i % 2 ? 0.02 : -0.02;
  }
  for (let i = 0; i < 28; i += 1) {
    const tooth = addMesh(group, `forwardRailTooth${i + 1}`, roundedBox(0.028, 0.08, 0.70, 0.004), materials['dark-blued-metal'], runtime, shadows);
    tooth.position.set(0.56 + i * 0.050, 0.55, 0);
  }
  for (let i = 0; i < 8; i += 1) {
    const mark = addMesh(group, `handguardPaintTendril${i + 1}`, tubePath([
      [0.62 + i * 0.15, 0.30 + Math.sin(i * 0.8) * 0.08, FRONT_Z * 1.07],
      [0.74 + i * 0.15, 0.22 + Math.cos(i) * 0.08, FRONT_Z * 1.07],
      [0.86 + i * 0.15, 0.36 + Math.sin(i * 0.5) * 0.06, FRONT_Z * 1.07],
    ], 0.020, 12), materials['painted-accent'], runtime, shadows);
  }
  const lug = addMesh(group, 'handguardLug', torusX(0.12, 0.028, 24), materials['bipod-metal'], runtime, shadows);
  lug.position.set(1.52, -0.38, 0);
  addSocket(group, 'handguardAssemblySocket', [0.44, 0.12, 0], runtime, [1, 0, 0]);
  addCollider('handguard-collider', shell, runtime);
}

function addBipod(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const hinge = addMesh(group, 'bipodHinge', roundedBox(0.24, 0.24, 0.52, 0.028), materials['bipod-metal'], runtime, shadows);
  hinge.position.set(1.62, -0.48, 0);
  for (const [side, z] of [['left', -0.24], ['right', 0.24]] as Array<[string, number]>) {
    const leg = addMesh(group, `${side}BipodLeg`, extrude([[-0.08, 0.0], [0.08, 0.0], [0.14, -0.72], [0.02, -0.98], [-0.12, -0.92], [-0.16, -0.18]], 0.12), materials['bipod-metal'], runtime, shadows);
    leg.position.set(1.62, -0.57, z);
    leg.rotation.z = side === 'left' ? -0.07 : 0.07;
    for (let i = 0; i < 5; i += 1) {
      const slot = addMesh(group, `${side}BipodPerforation${i + 1}`, extrude([[-0.035, -0.03], [0.035, -0.03], [0.035, 0.03], [-0.035, 0.03]], 0.02), materials['cavity'], runtime, shadows);
      slot.position.set(1.62 + 0.004 * i, -0.72 - i * 0.12, z + (side === 'left' ? 0.07 : -0.07));
      slot.rotation.z = side === 'left' ? -0.07 : 0.07;
    }
    const pivot = addFastener(group, `${side}BipodPivotCap`, [1.62, -0.48, z], materials['muzzle-metal'], runtime, shadows, 0.055);
    pivot.rotation.y = Math.PI / 2;
  }
  const feet = addMesh(group, 'bipodFeet', roundedBox(0.20, 0.08, 0.72, 0.018), materials['bipod-metal'], runtime, shadows);
  feet.position.set(1.62, -1.06, 0);
  for (let i = 0; i < 4; i += 1) {
    const groove = addMesh(group, `bipodFootGroove${i + 1}`, roundedBox(0.018, 0.018, 0.10, 0.002), materials['cavity'], runtime, shadows);
    groove.position.set(1.52 + i * 0.07, -1.11, FRONT_Z * 0.58);
  }
  addSocket(group, 'bipodAssemblySocket', [1.62, -0.43, 0], runtime, [1, 0, 0]);
  addCollider('bipod-collider', hinge, runtime);
}

function addControl(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const grip = addMesh(group, 'pistolGripShell', extrude([[-0.92, -0.30], [-0.66, -0.34], [-0.54, -0.76], [-0.72, -0.86], [-0.98, -0.64]], 0.42), materials['polymer-grip'], runtime, shadows);
  grip.userData.feature = 'angled-textured-pistol-grip';
  for (let i = 0; i < 7; i += 1) {
    const relief = addMesh(group, `gripDiagonalRelief${i + 1}`, roundedBox(0.13, 0.018, 0.05, 0.004), materials['painted-accent'], runtime, shadows);
    relief.position.set(-0.87 + (i % 2) * 0.10, -0.44 - Math.floor(i / 2) * 0.10, FRONT_Z * 1.03);
    relief.rotation.z = -0.65;
  }
  for (let i = 0; i < 4; i += 1) {
    const mark = addMesh(group, `gripPaintTendril${i + 1}`, tubePath([
      [-0.92 + i * 0.10, -0.46 - i * 0.08, FRONT_Z * 1.06],
      [-0.82 + i * 0.10, -0.54 + Math.sin(i) * 0.04, FRONT_Z * 1.06],
      [-0.74 + i * 0.10, -0.65 - Math.cos(i) * 0.04, FRONT_Z * 1.06],
    ], 0.016, 10), materials['painted-accent'], runtime, shadows);
  }
  const guard = addMesh(group, 'triggerGuard', tubePath([[-1.02, -0.27, FRONT_Z], [-1.00, -0.50, FRONT_Z], [-0.68, -0.52, FRONT_Z], [-0.58, -0.30, FRONT_Z]], 0.038, 24), materials['bipod-metal'], runtime, shadows);
  guard.userData.feature = 'open-trigger-guard';
  const trigger = addMesh(group, 'triggerBlade', tubePath([[-0.82, -0.30, FRONT_Z * 1.03], [-0.84, -0.42, FRONT_Z * 1.03], [-0.76, -0.47, FRONT_Z * 1.03]], 0.030, 16), materials['bipod-metal'], runtime, shadows);
  trigger.userData.feature = 'curved-trigger-blade';
  addFastener(group, 'triggerPivotPin', [-0.88, -0.28, FRONT_Z * 1.04], materials['muzzle-metal'], runtime, shadows, 0.030);
  addSocket(group, 'controlAssemblySocket', [-0.94, -0.30, 0], runtime, [0, -1, 0]);
  addCollider('control-collider', grip, runtime);
}

function addMuzzle(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const collar = addMesh(group, 'muzzleCollar', cylinderX(0.20, 0.24, 32), materials['muzzle-metal'], runtime, shadows);
  collar.position.set(2.36, 0.22, 0);
  const body = addMesh(group, 'muzzleBrakeBody', cylinderX(0.16, 0.46, 36), materials['muzzle-metal'], runtime, shadows);
  body.position.set(2.62, 0.22, 0);
  for (let i = 0; i < 6; i += 1) {
    const port = addMesh(group, `muzzlePort${i + 1}`, roundedBox(0.12, 0.052, 0.11, 0.008), materials['cavity'], runtime, shadows);
    port.position.set(2.62 - 0.18 + (i % 3) * 0.16, 0.22 + (i < 3 ? 0.12 : -0.12), FRONT_Z * 0.88);
    port.rotation.z = i % 2 ? 0.04 : -0.04;
  }
  const bore = addMesh(group, 'muzzleBore', cylinderX(0.085, 0.05, 24), materials['cavity'], runtime, shadows);
  bore.position.set(2.88, 0.22, 0);
  const crown = addMesh(group, 'muzzleBoreCrown', torusX(0.105, 0.022, 24), materials['muzzle-metal'], runtime, shadows);
  crown.position.set(2.90, 0.22, 0);
  addSocket(group, 'muzzleAssemblySocket', [2.36, 0.22, 0], runtime, [1, 0, 0]);
  addCollider('muzzle-collider', body, runtime);
}

function addSighting(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const rail = addMesh(group, 'topRail', roundedBox(1.28, 0.08, 0.72, 0.010), materials['dark-blued-metal'], runtime, shadows);
  rail.position.set(-0.32, 0.64, 0);
  for (let i = 0; i < 22; i += 1) {
    const tooth = addMesh(group, `receiverRailTooth${i + 1}`, roundedBox(0.030, 0.075, 0.75, 0.004), materials['dark-blued-metal'], runtime, shadows);
    tooth.position.set(-0.90 + i * 0.055, 0.70, 0);
  }
  const tower = addMesh(group, 'frontSightTower', extrude([[-0.10, 0.0], [0.10, 0.0], [0.08, 0.36], [-0.08, 0.36]], 0.22), materials['dark-blued-metal'], runtime, shadows);
  tower.position.set(1.76, 0.43, 0);
  const post = addMesh(group, 'frontSightPost', roundedBox(0.045, 0.20, 0.12, 0.006), materials['bipod-metal'], runtime, shadows);
  post.position.set(1.76, 0.82, 0);
  const aperture = addMesh(group, 'frontSightAperture', roundedBox(0.035, 0.055, 0.12, 0.004), materials['cavity'], runtime, shadows);
  aperture.position.set(1.76, 0.86, FRONT_Z * 0.92);
  const inset = addMesh(group, 'sightInset', roundedBox(0.04, 0.13, 0.08, 0.006), materials['glass-optic'], runtime, shadows);
  inset.position.set(1.76, 0.78, FRONT_Z * 0.92);
  addSocket(group, 'sightingAssemblySocket', [-0.86, 0.64, 0], runtime, [1, 0, 0]);
}

function addCarryHandle(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const left = addMesh(group, 'carryHandleLeftUpright', tubePath([[-0.92, 0.66, -0.18], [-0.92, 0.94, -0.18], [-0.75, 1.04, -0.18]], 0.042, 18), materials['dark-blued-metal'], runtime, shadows);
  const right = addMesh(group, 'carryHandleRightUpright', tubePath([[-0.12, 0.66, -0.18], [-0.12, 0.94, -0.18], [0.02, 1.02, -0.18]], 0.042, 18), materials['dark-blued-metal'], runtime, shadows);
  left.userData.feature = 'carry-handle-upright';
  right.userData.feature = 'carry-handle-upright';
  const grip = addMesh(group, 'carryHandleGrip', tubePath([[-0.75, 1.04, -0.18], [-0.58, 1.10, -0.18], [-0.20, 1.08, -0.18], [0.02, 1.02, -0.18]], 0.085, 28), materials['polymer-grip'], runtime, shadows);
  grip.userData.feature = 'segmented-carry-handle-grip';
  for (let i = 0; i < 10; i += 1) {
    const rib = addMesh(group, `carryGripRib${i + 1}`, torusX(0.085, 0.012, 16), materials['painted-accent'], runtime, shadows);
    rib.position.set(-0.68 + i * 0.075, 1.07 + Math.sin(i * 0.5) * 0.018, -0.18);
    rib.rotation.y = Math.PI / 2;
  }
  addSocket(group, 'carryHandleAssemblySocket', [-0.52, 0.66, 0], runtime, [0, 1, 0]);
}

function addCharging(group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean): void {
  const slot = addMesh(group, 'chargingHandleGuideSlot', roundedBox(0.52, 0.055, 0.06, 0.006), materials['cavity'], runtime, shadows);
  slot.position.set(-0.35, 0.02, FRONT_Z * 1.05);
  const handle = addMesh(group, 'chargingHandleBody', extrude([[-0.06, -0.02], [0.16, -0.02], [0.20, 0.06], [0.12, 0.13], [-0.08, 0.10]], 0.10), materials['dark-blued-metal'], runtime, shadows);
  handle.position.set(-0.02, 0.02, FRONT_Z * 1.10);
  const grip = addMesh(group, 'chargeHandleGrip', roundedBox(0.16, 0.055, 0.12, 0.012), materials['polymer-grip'], runtime, shadows);
  grip.position.set(0.16, 0.06, FRONT_Z * 1.10);
  addSocket(group, 'chargingSystemSocket', [-0.22, 0.02, 0], runtime, [-1, 0, 0]);
}

export function create05HeavyMachineGunModel(options: HeavyMachineGunModelOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const runtime: HeavyMachineGunRuntime = {
    macros: {},
    meshes: {},
    sockets: {},
    colliders: [],
    destructionGroups: {},
    selectableParts: [],
    interaction: {
      feedCover: { closed: [0, 0, 0], open: [0, 0, 0.82] },
      chargingHandle: { start: [0, 0, 0], end: [-0.24, 0, 0] },
      bipod: { folded: [0, 0, 0], deployed: [0, 0, 0.55] },
      ammunitionBox: { mounted: [0, 0, 0], service: [0, -0.16, 0] },
    },
  };
  const materials: MaterialSet = {
    'dark-blued-metal': makeMaterial('dark-blued-metal', options),
    'painted-composite': makeMaterial('painted-composite', options),
    'polymer-grip': makeMaterial('polymer-grip', options),
    'feed-belt-brass': makeMaterial('feed-belt-brass', options),
    'belt-link-metal': makeMaterial('belt-link-metal', options),
    'bipod-metal': makeMaterial('bipod-metal', options),
    'muzzle-metal': makeMaterial('muzzle-metal', options),
    cavity: makeMaterial('cavity', options),
    'glass-optic': makeMaterial('glass-optic', options),
    'painted-accent': makeMaterial('painted-accent', options),
    hidden: makeMaterial('hidden', options),
  };
  const root = new THREE.Group();
  root.name = 'heavy-machine-gun-root';
  root.userData.runtimeId = 'heavy-machine-gun-root';
  root.userData.codeOnly = true;
  root.userData.noImportedAssets = true;
  root.userData.proceduralSource = 'create05HeavyMachineGunModel.ts';
  runtime.destructionGroups.root = [];
  root.userData.sculptRuntime = runtime;
  root.userData.sourceTrace = trace;
  root.userData.projectionCalibration = hmgProjectionCalibration;

  const assemblies: Array<[string, (group: THREE.Group, runtime: HeavyMachineGunRuntime, materials: MaterialSet, shadows: boolean) => void]> = [
    ['stockGripAssembly', addStock],
    ['receiverAssembly', addReceiver],
    ['feedSystem', addFeedSystem],
    ['ammunitionBoxAssembly', addAmmunitionBox],
    ['barrelAssembly', addBarrel],
    ['handguardAssembly', addHandguard],
    ['bipodAssembly', addBipod],
    ['controlAssembly', addControl],
    ['muzzleAssembly', addMuzzle],
    ['sightingAssembly', addSighting],
    ['carryHandleAssembly', addCarryHandle],
    ['chargingSystem', addCharging],
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

  addSocket(root, 'rootSocket', [0, 0, 0], runtime, [1, 0, 0]);
  const sightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.75, 0.72, 0), new THREE.Vector3(2.42, 0.42, 0)]),
    new THREE.LineBasicMaterial({ color: 0x79A9FF, transparent: true, opacity: 0.16 }),
  );
  sightLine.name = 'sight-line-guide';
  sightLine.userData.guide = true;
  root.add(sightLine);
  root.userData.runtimeSummary = {
    runtimeMeshCount: Object.keys(runtime.meshes).length,
    macroCount: Object.keys(runtime.macros).length,
    socketCount: Object.keys(runtime.sockets).length,
    colliderCount: runtime.colliders.length,
    selectablePartCount: runtime.selectableParts.length,
    codeOnly: true,
    noImportedAssets: true,
  };
  return root;
}

export function createHeavyMachineGunLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'heavy-machine-gun-lookdev-lights';
  const key = new THREE.DirectionalLight(0xB7D4FF, 1.52);
  key.position.set(-4.0, 4.8, 5.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const fill = new THREE.DirectionalLight(0x6C88A6, 0.46);
  fill.position.set(3.8, 0.6, 3.4);
  const rim = new THREE.DirectionalLight(0x6A77C5, 0.58);
  rim.position.set(2.8, 3.0, -4.6);
  const brass = new THREE.PointLight(0xE2A55A, 0.18, 6.0);
  brass.position.set(0.6, -0.15, 2.0);
  lights.add(key, fill, rim, brass);
  return lights;
}

export function makeHeavyMachineGunBackground(): THREE.Color {
  return new THREE.Color(0x010205);
}
