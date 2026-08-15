import * as THREE from 'three';
import { sniperRifleReferenceTrace, sniperRifleProjectionCalibration } from './sniperRifleTrace';

export type SniperRifleModelOptions = {
  shadows?: boolean;
  noTextures?: boolean;
  disableIdle?: boolean;
  wireframe?: boolean;
  textureSize?: number;
};

type SniperRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, { type: string; object: THREE.Object3D }>;
  destructionGroups: Record<string, THREE.Object3D[]>;
  selectableParts: string[];
  scopeSightLine: { start: [number, number, number]; end: [number, number, number] };
};

type V3 = [number, number, number];

type MaterialSet = {
  dark: THREE.MeshPhysicalMaterial;
  coating: THREE.MeshPhysicalMaterial;
  polymer: THREE.MeshPhysicalMaterial;
  cavity: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  silver: THREE.MeshPhysicalMaterial;
  edge: THREE.MeshPhysicalMaterial;
  ornament: THREE.MeshPhysicalMaterial;
};
type BaseMaterialKind = Exclude<keyof MaterialSet, 'ornament'>;

const FRONT_Z = 0.40;
const trace = sniperRifleReferenceTrace;

function roundedBox(width: number, height: number, depth: number, radius = 0.025): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const r = Math.min(radius, width * 0.48, height * 0.48);
  shape.moveTo(-width / 2 + r, -height / 2);
  shape.lineTo(width / 2 - r, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
  shape.lineTo(width / 2, height / 2 - r);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
  shape.lineTo(-width / 2 + r, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r);
  shape.lineTo(-width / 2, -height / 2 + r);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: Math.min(r * 0.5, 0.018), bevelThickness: Math.min(r * 0.5, 0.018), curveSegments: 3 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function extrude(points: Array<[number, number]>, depth: number, bevel = 0.012, holes: Array<Array<[number, number]>> = []): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  for (const holePoints of holes) {
    const hole = new THREE.Path();
    hole.moveTo(holePoints[0][0], holePoints[0][1]);
    for (let i = 1; i < holePoints.length; i += 1) hole.lineTo(holePoints[i][0], holePoints[i][1]);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel, curveSegments: 4 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function ellipseLoop(cx: number, cy: number, rx: number, ry: number, segments = 36): Array<[number, number]> {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

function cylinderX(radius: number, length: number, segments = 32): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function taperedCylinderX(rearRadius: number, frontRadius: number, length: number, segments = 32): THREE.CylinderGeometry {
  // CylinderGeometry's top cap becomes the -X/rear end after the quarter-turn.
  const geometry = new THREE.CylinderGeometry(rearRadius, frontRadius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderY(radius: number, length: number, segments = 32): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.computeVertexNormals();
  return geometry;
}

function tubeBetween(a: V3, b: V3, radius: number, segments = 16): THREE.CylinderGeometry {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(end, start);
  const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), segments, 1, false);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  geometry.applyQuaternion(quaternion);
  geometry.translate((start.x + end.x) * 0.5, (start.y + end.y) * 0.5, (start.z + end.z) * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function tubePath(points: V3[], radius: number, tubularSegments = 32): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0.3);
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  geometry.computeVertexNormals();
  return geometry;
}

function hash(x: number, y: number, seed: number): number {
  let n = Math.imul(x + seed * 19, 374761393) ^ Math.imul(y + seed * 31, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function createTexture(kind: 'dark' | 'coating' | 'polymer' | 'roughness' | 'silver', size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  if (kind === 'roughness') {
    ctx.fillStyle = '#a8aeb7';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 160; i += 1) {
      const x = (hash(i, 11, 9) * size) | 0;
      const y = (hash(i, 13, 7) * size) | 0;
      const w = 2 + (hash(i, 19, 3) * size * 0.04);
      ctx.fillStyle = `rgba(${90 + ((hash(i, 23, 4) * 80) | 0)},${90 + ((hash(i, 29, 5) * 80) | 0)},${90 + ((hash(i, 31, 6) * 80) | 0)},0.18)`;
      ctx.fillRect(x, y, w, 1 + w * 0.25);
    }
  } else if (kind === 'coating') {
    ctx.fillStyle = '#13294c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 28; i += 1) {
      const y = size * (0.04 + (i / 28) * 0.92);
      const amp = size * (0.008 + hash(i, 7, 12) * 0.028);
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, y);
      for (let step = 0; step <= 32; step += 1) {
        const x = (step / 32) * size * 1.2 - size * 0.1;
        const yy = y + Math.sin(step * 0.58 + i * 0.77) * amp + Math.sin(step * 0.21 + i) * amp * 0.55;
        if (step === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      const hue = i % 3 === 0 ? '#19b8ce' : (i % 3 === 1 ? '#3d67e8' : '#6b35c8');
      ctx.strokeStyle = hue;
      ctx.globalAlpha = 0.24 + hash(i, 43, 4) * 0.48;
      ctx.lineWidth = size * (0.006 + hash(i, 47, 5) * 0.012);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(46,194,226,0.32)' : 'rgba(127,83,255,0.22)';
      ctx.fillRect(hash(i, 51, 8) * size, hash(i, 53, 10) * size, 1 + hash(i, 59, 11) * 5, 1 + hash(i, 61, 13) * 3);
    }
  } else {
    const base = kind === 'dark' ? '#4d6478' : (kind === 'polymer' ? '#53667a' : '#a8bdd3');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const lineColor = kind === 'silver' ? 'rgba(228,238,250,0.22)' : 'rgba(130,160,205,0.13)';
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = lineColor;
      const x = hash(i, 71, kind === 'dark' ? 2 : 5) * size;
      const y = hash(i, 73, kind === 'polymer' ? 3 : 6) * size;
      const w = 2 + hash(i, 79, 9) * size * 0.05;
      ctx.fillRect(x, y, w, 1 + hash(i, 83, 9) * 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = kind === 'roughness' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'coating' ? 1.1 : 1.8, kind === 'coating' ? 1.6 : 1.8);
  texture.anisotropy = 8;
  return texture;
}

function makeMaterial(kind: BaseMaterialKind, options: SniperRifleModelOptions): THREE.MeshPhysicalMaterial {
  const size = Math.max(64, Math.min(options.textureSize ?? 256, 512));
  const colors: Record<BaseMaterialKind, string> = {
    dark: '#425d78',
    coating: '#356bc7',
    polymer: '#46586b',
    cavity: '#02050b',
    glass: '#2f82aa',
    silver: '#b7c9dd',
    edge: '#7892b0',
  };
  const roughnessByKind: Record<BaseMaterialKind, number> = { dark: 0.42, coating: 0.30, polymer: 0.68, cavity: 0.92, glass: 0.12, silver: 0.22, edge: 0.28 };
  const metalnessByKind: Record<BaseMaterialKind, number> = { dark: 0.64, coating: 0.72, polymer: 0.04, cavity: 0.05, glass: 0.08, silver: 0.92, edge: 0.78 };
  const textureKind = kind === 'coating' ? 'coating' : (kind === 'polymer' ? 'polymer' : (kind === 'silver' ? 'silver' : 'dark'));
  const material = new THREE.MeshPhysicalMaterial({
    color: colors[kind],
    map: options.noTextures ? undefined : createTexture(textureKind, size),
    roughness: roughnessByKind[kind],
    roughnessMap: options.noTextures ? undefined : createTexture('roughness', size),
    metalness: metalnessByKind[kind],
    clearcoat: kind === 'coating' ? 0.72 : (kind === 'glass' ? 0.24 : 0.10),
    clearcoatRoughness: kind === 'coating' ? 0.13 : 0.2,
    transmission: kind === 'glass' ? 0.12 : 0,
    transparent: kind === 'glass',
    opacity: kind === 'glass' ? 0.76 : 1,
    envMapIntensity: kind === 'glass' ? 1.6 : 1.15,
    side: THREE.DoubleSide,
    emissive: kind === 'coating' ? new THREE.Color('#071d62') : (kind === 'dark' ? new THREE.Color('#0a1422') : new THREE.Color('#000000')),
    emissiveIntensity: kind === 'coating' ? 0.52 : (kind === 'dark' ? 0.20 : 0),
  });
  if (options.wireframe) material.wireframe = true;
  return material;
}

function addNode(parent: THREE.Object3D, id: string, runtime: SniperRuntime): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  group.userData.runtimeId = id;
  parent.add(group);
  runtime.nodes[id] = group;
  runtime.destructionGroups[id] = [group];
  return group;
}

function addMesh(parent: THREE.Object3D, id: string, geometry: THREE.BufferGeometry, material: THREE.Material, runtime: SniperRuntime, shadows: boolean): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  mesh.userData.runtimeId = id;
  mesh.userData.selectable = true;
  parent.add(mesh);
  runtime.meshes[id] = mesh;
  runtime.selectableParts.push(id);
  const group = runtime.destructionGroups[parent.name];
  if (group && !group.includes(mesh)) group.push(mesh);
  return mesh;
}

function addSocket(parent: THREE.Object3D, id: string, position: V3, runtime: SniperRuntime, axis: V3 = [1, 0, 0]): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = id;
  socket.position.set(...position);
  socket.userData.socket = true;
  socket.userData.axis = axis;
  parent.add(socket);
  runtime.sockets[id] = socket;
  return socket;
}

function addCollider(id: string, object: THREE.Object3D, runtime: SniperRuntime): void {
  runtime.colliders[id] = { type: 'convex-hull-proxy', object };
  object.userData.colliderId = id;
}

function addFastener(parent: THREE.Object3D, id: string, position: V3, material: THREE.Material, runtime: SniperRuntime, shadows: boolean, radius = 0.045): THREE.Mesh {
  const mesh = addMesh(parent, id, cylinderX(radius, 0.045, 18), material, runtime, shadows);
  mesh.position.set(...position);
  return mesh;
}

function addStock(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const butt = addMesh(group, 'stockButtPlate', roundedBox(0.25, 0.86, 0.72, 0.055), materials.polymer, runtime, shadows);
  butt.position.set(-3.66, -0.03, 0);
  const sidePlate = addMesh(group, 'stockSkeletonSidePlate', extrude([
    [-3.56, 0.34], [-3.30, 0.47], [-2.42, 0.46], [-2.08, 0.20], [-2.16, -0.43], [-2.54, -0.56], [-3.34, -0.43], [-3.58, -0.29],
  ], 0.48, 0.035, [ellipseLoop(-2.82, -0.04, 0.33, 0.22)]), materials.coating, runtime, shadows);
  sidePlate.position.z = 0.04;
  const cheek = addMesh(group, 'stockCheekRest', roundedBox(0.92, 0.18, 0.52, 0.035), materials.polymer, runtime, shadows);
  cheek.position.set(-2.58, 0.48, 0.02);
  cheek.rotation.z = -0.03;
  const upperBrace = addMesh(group, 'stockUpperBrace', tubeBetween([-3.40, 0.29, 0], [-2.08, 0.24, 0], 0.10), materials.polymer, runtime, shadows);
  const lowerBrace = addMesh(group, 'stockLowerBrace', tubeBetween([-3.34, -0.34, 0], [-2.14, -0.45, 0], 0.105), materials.polymer, runtime, shadows);
  const rearBrace = addMesh(group, 'stockRearBrace', tubeBetween([-3.42, 0.28, 0], [-3.42, -0.32, 0], 0.072), materials.polymer, runtime, shadows);
  upperBrace.userData.feature = 'stock-upper-attachment';
  lowerBrace.userData.feature = 'stock-lower-attachment';
  rearBrace.userData.feature = 'stock-rear-attachment';
  for (let i = 0; i < 4; i += 1) {
    const ridge = addMesh(group, `stockButtRidge${i + 1}`, roundedBox(0.13, 0.035, 0.50, 0.008), materials.edge, runtime, shadows);
    ridge.position.set(-3.77, -0.28 + i * 0.18, FRONT_Z * 0.74);
  }
  for (let i = 0; i < 5; i += 1) {
    const fleck = addMesh(group, `stockCoatingFleck${i + 1}`, roundedBox(0.12 + i * 0.018, 0.025, 0.035, 0.004), materials.edge, runtime, shadows);
    fleck.position.set(-3.12 + i * 0.18, 0.18 + Math.sin(i) * 0.08, FRONT_Z * 0.76);
    fleck.rotation.z = (i % 2 ? -1 : 1) * 0.22;
  }
  const stockTendrils: V3[][] = [
    [[-3.42, 0.26, 0.30], [-3.18, 0.10, 0.30], [-2.98, 0.24, 0.30], [-2.76, 0.08, 0.30], [-2.50, 0.19, 0.30], [-2.18, 0.07, 0.30]],
    [[-3.35, 0.06, 0.31], [-3.07, -0.09, 0.31], [-2.83, 0.04, 0.31], [-2.58, -0.14, 0.31], [-2.32, -0.02, 0.31]],
    [[-3.12, 0.34, 0.32], [-2.88, 0.28, 0.32], [-2.64, 0.37, 0.32], [-2.38, 0.26, 0.32], [-2.16, 0.30, 0.32]],
    [[-3.30, -0.22, 0.30], [-3.00, -0.28, 0.30], [-2.72, -0.20, 0.30], [-2.48, -0.33, 0.30]],
  ];
  for (const [i, points] of stockTendrils.entries()) {
    const tendril = addMesh(group, `stockOrnamentalTendril${i + 1}`, tubePath(points, 0.026, 28), materials.ornament, runtime, shadows);
    tendril.userData.feature = 'blue-teal-serpentine-ornament';
  }
  const sling = addMesh(group, 'stockSlingLoop', new THREE.TorusGeometry(0.12, 0.025, 16, 30), materials.edge, runtime, shadows);
  sling.position.set(-3.52, -0.48, 0);
  sling.rotation.x = Math.PI / 2;
  addFastener(group, 'stockRearFastener', [-3.46, 0.30, FRONT_Z * 0.78], materials.edge, runtime, shadows, 0.035);
  addFastener(group, 'stockForwardFastener', [-2.34, 0.18, FRONT_Z * 0.78], materials.edge, runtime, shadows, 0.035);
  addSocket(group, 'stockAssemblySocket', [-2.02, 0.20, 0], runtime, [1, 0, 0]);
  addCollider('stock-collider', sidePlate, runtime);
}

function addReceiverAction(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const receiver = addMesh(group, 'receiverShell', extrude([
    [-2.08, 0.05], [0.75, 0.05], [0.86, 0.19], [0.75, 0.47], [-1.95, 0.49], [-2.12, 0.33],
  ], 0.66, 0.03), materials.dark, runtime, shadows);
  receiver.userData.feature = 'precision-receiver-shell';
  const sidePanel = addMesh(group, 'receiverOrnamentalPanel', extrude([
    [-2.02, 0.10], [-0.96, 0.10], [-0.72, 0.23], [-0.98, 0.40], [-1.92, 0.40],
  ], 0.038, 0.008), materials.coating, runtime, shadows);
  sidePanel.position.z = 0.36;
  const receiverTendrils: V3[][] = [
    [[-1.98, 0.30, 0.39], [-1.70, 0.20, 0.39], [-1.40, 0.31, 0.39], [-1.10, 0.18, 0.39], [-0.82, 0.27, 0.39]],
    [[-1.84, 0.14, 0.40], [-1.56, 0.08, 0.40], [-1.28, 0.17, 0.40], [-0.98, 0.10, 0.40]],
    [[-1.78, 0.38, 0.41], [-1.50, 0.33, 0.41], [-1.22, 0.39, 0.41], [-0.94, 0.32, 0.41]],
  ];
  for (const [i, points] of receiverTendrils.entries()) {
    const tendril = addMesh(group, `receiverOrnamentalTendril${i + 1}`, tubePath(points, 0.024, 24), materials.ornament, runtime, shadows);
    tendril.userData.feature = 'blue-teal-serpentine-ornament';
  }
  const topRail = addMesh(group, 'receiverTopRail', roundedBox(1.56, 0.07, 0.42, 0.012), materials.edge, runtime, shadows);
  topRail.position.set(-0.90, 0.53, 0);
  for (let i = 0; i < 8; i += 1) {
    const tooth = addMesh(group, `receiverRailTooth${i + 1}`, roundedBox(0.09, 0.085, 0.36, 0.007), materials.edge, runtime, shadows);
    tooth.position.set(-1.46 + i * 0.15, 0.595, 0);
  }
  const boltBody = addMesh(group, 'boltActionBody', cylinderX(0.15, 0.92, 28), materials.silver, runtime, shadows);
  boltBody.position.set(-0.92, 0.36, 0);
  const boltRearCollar = addMesh(group, 'boltRearCollar', cylinderX(0.19, 0.12, 28), materials.edge, runtime, shadows);
  boltRearCollar.position.set(-1.35, 0.36, 0);
  const handle = addMesh(group, 'boltHandleStem', tubeBetween([-1.05, 0.32, FRONT_Z * 0.80], [-1.18, -0.02, FRONT_Z * 0.80], 0.055), materials.silver, runtime, shadows);
  handle.userData.feature = 'manual-bolt-handle';
  const knob = addMesh(group, 'boltKnob', new THREE.SphereGeometry(0.105, 24, 16), materials.silver, runtime, shadows);
  knob.position.set(-1.19, -0.08, FRONT_Z * 0.80);
  const ejection = addMesh(group, 'ejectionPortCavity', roundedBox(0.46, 0.15, 0.035, 0.012), materials.cavity, runtime, shadows);
  ejection.position.set(-0.34, 0.40, 0.36);
  const ejectionLip = addMesh(group, 'ejectionPortLip', roundedBox(0.52, 0.025, 0.05, 0.006), materials.edge, runtime, shadows);
  ejectionLip.position.set(-0.34, 0.49, 0.38);
  for (let i = 0; i < 4; i += 1) {
    addFastener(group, `receiverFastener${i + 1}`, [-1.75 + i * 0.40, 0.21, 0.37], materials.edge, runtime, shadows, 0.038);
  }
  for (let i = 0; i < 5; i += 1) {
    const ridge = addMesh(group, `receiverSideRidge${i + 1}`, roundedBox(0.18, 0.018, 0.025, 0.003), materials.edge, runtime, shadows);
    ridge.position.set(-1.86 + i * 0.19, 0.13, 0.375);
    ridge.rotation.z = i % 2 === 0 ? 0.10 : -0.10;
  }
  const grip = addMesh(group, 'curvedPistolGrip', extrude([
    [-1.78, 0.06], [-1.30, 0.02], [-1.45, -0.62], [-1.68, -0.68], [-1.90, -0.24],
  ], 0.50, 0.032), materials.coating, runtime, shadows);
  grip.position.z = -0.01;
  const triggerGuardA = addMesh(group, 'triggerGuardFront', tubeBetween([-1.18, -0.12, FRONT_Z * 0.76], [-1.15, -0.50, FRONT_Z * 0.76], 0.042), materials.edge, runtime, shadows);
  const triggerGuardB = addMesh(group, 'triggerGuardRear', tubeBetween([-1.15, -0.50, FRONT_Z * 0.76], [-1.62, -0.50, FRONT_Z * 0.76], 0.042), materials.edge, runtime, shadows);
  const triggerGuardC = addMesh(group, 'triggerGuardTop', tubeBetween([-1.62, -0.50, FRONT_Z * 0.76], [-1.72, -0.22, FRONT_Z * 0.76], 0.042), materials.edge, runtime, shadows);
  triggerGuardA.userData.feature = 'trigger-guard-opening';
  triggerGuardB.userData.feature = 'trigger-guard-opening';
  triggerGuardC.userData.feature = 'trigger-guard-opening';
  const trigger = addMesh(group, 'triggerBlade', tubePath([[-1.45, -0.22, FRONT_Z * 0.78], [-1.43, -0.39, FRONT_Z * 0.78], [-1.52, -0.46, FRONT_Z * 0.78]], 0.035, 14), materials.silver, runtime, shadows);
  addSocket(group, 'receiverActionAssemblySocket', [-2.10, 0.28, 0], runtime, [1, 0, 0]);
  addSocket(group, 'boltHandleSystemSocket', [-1.16, 0.25, FRONT_Z * 0.80], runtime, [0, -1, 0]);
  addCollider('receiver-collider', receiver, runtime);
  addCollider('grip-collider', grip, runtime);
}

function addOptic(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const mainTube = addMesh(group, 'scopeMainTube', cylinderX(0.135, 1.45, 36), materials.dark, runtime, shadows);
  mainTube.position.set(-0.98, 0.94, 0);
  const eyepiece = addMesh(group, 'scopeEyepiece', cylinderX(0.16, 0.34, 32), materials.dark, runtime, shadows);
  eyepiece.position.set(-1.90, 0.94, 0);
  const eyeRing = addMesh(group, 'scopeEyepieceRing', cylinderX(0.19, 0.09, 32), materials.edge, runtime, shadows);
  eyeRing.position.set(-2.08, 0.94, 0);
  const bell = addMesh(group, 'scopeObjectiveBell', taperedCylinderX(0.14, 0.28, 0.46, 36), materials.silver, runtime, shadows);
  bell.position.set(-0.08, 0.94, 0);
  const bellRim = addMesh(group, 'scopeObjectiveBellRim', cylinderX(0.285, 0.075, 36), materials.edge, runtime, shadows);
  bellRim.position.set(0.18, 0.94, 0);
  const frontGlass = addMesh(group, 'scopeObjectiveGlass', cylinderX(0.245, 0.018, 32), materials.glass, runtime, shadows);
  frontGlass.position.set(0.225, 0.94, 0);
  const rearGlass = addMesh(group, 'scopeEyepieceGlass', cylinderX(0.12, 0.018, 32), materials.glass, runtime, shadows);
  rearGlass.position.set(-2.13, 0.94, 0);
  for (const [i, x] of [-1.62, -0.66].entries()) {
    const ring = addMesh(group, `scopeRing${i + 1}`, new THREE.TorusGeometry(0.18, 0.028, 16, 36), materials.edge, runtime, shadows);
    ring.position.set(x, 0.94, 0);
    ring.rotation.y = Math.PI / 2;
    const foot = addMesh(group, `scopeRingFoot${i + 1}`, roundedBox(0.24, 0.21, 0.38, 0.018), materials.edge, runtime, shadows);
    foot.position.set(x, 0.72, 0);
    const clamp = addMesh(group, `scopeRingClamp${i + 1}`, roundedBox(0.34, 0.045, 0.43, 0.008), materials.edge, runtime, shadows);
    clamp.position.set(x, 0.79, 0);
  }
  const turret = addMesh(group, 'scopeElevationTurret', cylinderY(0.17, 0.22, 28), materials.dark, runtime, shadows);
  turret.position.set(-1.00, 1.10, 0);
  const turretCap = addMesh(group, 'scopeElevationCap', cylinderY(0.12, 0.07, 24), materials.edge, runtime, shadows);
  turretCap.position.set(-1.00, 1.22, 0);
  const sideCap = addMesh(group, 'scopeWindageCap', cylinderX(0.12, 0.08, 24), materials.edge, runtime, shadows);
  sideCap.position.set(-1.00, 1.00, 0.20);
  const reticle = addMesh(group, 'scopeGlassHighlight', roundedBox(0.016, 0.22, 0.012, 0.002), materials.glass, runtime, shadows);
  reticle.position.set(-2.14, 0.94, 0.16);
  const reticleCross = addMesh(group, 'scopeReticleCrossbar', roundedBox(0.04, 0.012, 0.014, 0.002), materials.glass, runtime, shadows);
  reticleCross.position.set(-2.14, 0.94, 0.17);
  addSocket(group, 'opticAssemblySocket', [-1.1, 0.78, 0], runtime, [0, 1, 0]);
  addCollider('optic-collider', mainTube, runtime);
}

function addMagazineTrigger(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const magazine = addMesh(group, 'magazineBody', extrude([
    [-0.88, -0.10], [-0.54, -0.10], [-0.51, -0.46], [-0.78, -0.52], [-0.94, -0.34],
  ], 0.40, 0.024), materials.polymer, runtime, shadows);
  magazine.position.z = -0.01;
  const baseplate = addMesh(group, 'magazineFloorplate', roundedBox(0.40, 0.07, 0.38, 0.014), materials.edge, runtime, shadows);
  baseplate.position.set(-0.72, -0.50, 0);
  const magazineCatch = addMesh(group, 'magazineCatchNotch', roundedBox(0.15, 0.07, 0.03, 0.006), materials.cavity, runtime, shadows);
  magazineCatch.position.set(-0.50, -0.34, 0.25);
  for (let i = 0; i < 3; i += 1) {
    const rib = addMesh(group, `magazineRib${i + 1}`, roundedBox(0.25, 0.028, 0.025, 0.005), materials.edge, runtime, shadows);
    rib.position.set(-0.72, -0.20 - i * 0.10, 0.26);
    rib.rotation.z = -0.16;
  }
  addFastener(group, 'triggerPivot', [-1.47, -0.18, 0.29], materials.silver, runtime, shadows, 0.033);
  addSocket(group, 'magazineTriggerAssemblySocket', [-1.02, -0.10, 0], runtime, [0, 1, 0]);
  addCollider('magazine-collider', magazine, runtime);
}

function addUnderAction(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const rail = addMesh(group, 'underActionRail', roundedBox(0.96, 0.065, 0.30, 0.014), materials.silver, runtime, shadows);
  rail.position.set(1.46, -0.03, 0);
  const bridge = addMesh(group, 'underActionMountBridge', roundedBox(0.24, 0.16, 0.38, 0.018), materials.silver, runtime, shadows);
  bridge.position.set(0.98, 0.02, 0);
  const springRod = addMesh(group, 'underActionSpringRod', tubeBetween([1.00, -0.10, 0.18], [2.02, -0.10, 0.18], 0.025, 16), materials.silver, runtime, shadows);
  springRod.userData.feature = 'spring-loaded-under-action-support';
  for (let i = 0; i < 8; i += 1) {
    const coil = addMesh(group, `underActionSpringCoil${i + 1}`, new THREE.TorusGeometry(0.060, 0.012, 8, 16), materials.edge, runtime, shadows);
    coil.position.set(1.12 + i * 0.09, -0.10, 0.18);
  }
  for (let i = 0; i < 10; i += 1) {
    const tooth = addMesh(group, `underActionTooth${i + 1}`, roundedBox(i < 6 ? 0.055 : 0.042, i < 6 ? 0.07 : 0.045, i < 6 ? 0.26 : 0.20, 0.005), materials.edge, runtime, shadows);
    tooth.position.set(1.06 + i * 0.09, i < 6 ? -0.095 : -0.065, 0);
  }
  const innerRail = addMesh(group, 'underActionInnerRail', roundedBox(0.90, 0.035, 0.18, 0.006), materials.dark, runtime, shadows);
  innerRail.position.set(1.50, 0.04, 0.08);
  const supportLink = addMesh(group, 'underActionSupportLink', tubeBetween([0.92, -0.02, 0.12], [1.08, -0.08, 0.18], 0.035, 12), materials.silver, runtime, shadows);
  supportLink.userData.feature = 'under-action-grounded-link';
  addSocket(group, 'underActionAssemblySocket', [0.92, -0.02, 0], runtime, [1, 0, 0]);
  addCollider('under-action-collider', rail, runtime);
}

function addBarrel(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const barrel = addMesh(group, 'barrelTube', cylinderX(0.105, 3.28, 36), materials.dark, runtime, shadows);
  barrel.position.set(2.55, 0.34, 0);
  const root = addMesh(group, 'barrelRootShoulder', cylinderX(0.17, 0.26, 32), materials.edge, runtime, shadows);
  root.position.set(0.84, 0.34, 0);
  const highlight = addMesh(group, 'barrelTopHighlight', roundedBox(1.85, 0.018, 0.018, 0.003), materials.edge, runtime, shadows);
  highlight.position.set(2.25, 0.44, 0.13);
  const ringA = addMesh(group, 'barrelCollarA', cylinderX(0.13, 0.08, 28), materials.edge, runtime, shadows);
  ringA.position.set(1.08, 0.34, 0);
  const ringB = addMesh(group, 'barrelCollarB', cylinderX(0.12, 0.06, 28), materials.edge, runtime, shadows);
  ringB.position.set(3.72, 0.34, 0);
  addSocket(group, 'barrelAssemblySocket', [0.82, 0.34, 0], runtime, [1, 0, 0]);
  addCollider('barrel-collider', barrel, runtime);
}

function addMuzzle(group: THREE.Group, runtime: SniperRuntime, materials: MaterialSet, shadows: boolean): void {
  const collar = addMesh(group, 'muzzleCollar', cylinderX(0.145, 0.30, 32), materials.edge, runtime, shadows);
  collar.position.set(4.12, 0.42, 0);
  const brake = addMesh(group, 'muzzleBrakeHousing', roundedBox(0.28, 0.29, 0.33, 0.03), materials.dark, runtime, shadows);
  brake.position.set(4.34, 0.42, 0);
  const bore = addMesh(group, 'muzzleBoreWall', cylinderX(0.085, 0.035, 28), materials.cavity, runtime, shadows);
  bore.position.set(4.50, 0.42, 0);
  const crown = addMesh(group, 'muzzleCrown', new THREE.TorusGeometry(0.095, 0.018, 16, 32), materials.edge, runtime, shadows);
  crown.position.set(4.52, 0.42, 0);
  crown.rotation.y = Math.PI / 2;
  for (let i = 0; i < 4; i += 1) {
    const slot = addMesh(group, `muzzleSlot${i + 1}`, roundedBox(0.07, 0.06, 0.20, 0.008), materials.cavity, runtime, shadows);
    slot.position.set(4.32 + (i % 2) * 0.09, 0.55 - Math.floor(i / 2) * 0.24, 0.18);
    slot.rotation.z = i % 2 ? -0.12 : 0.12;
  }
  const frontSight = addMesh(group, 'frontMuzzleSightBlock', roundedBox(0.12, 0.18, 0.20, 0.015), materials.edge, runtime, shadows);
  frontSight.position.set(3.92, 0.62, 0);
  addSocket(group, 'muzzleAssemblySocket', [4.08, 0.42, 0], runtime, [1, 0, 0]);
  addCollider('muzzle-collider', brake, runtime);
}

function createRuntime(): SniperRuntime {
  return { nodes: {}, meshes: {}, sockets: {}, colliders: {}, destructionGroups: {}, selectableParts: [], scopeSightLine: { start: [0, 0, 0], end: [0, 0, 0] } };
}

export function create03SniperRifleModel(options: SniperRifleModelOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const runtime = createRuntime();
  const coatingMaterial = makeMaterial('coating', options);
  const ornamentMaterial = coatingMaterial.clone();
  ornamentMaterial.name = 'ornament-accent';
  ornamentMaterial.map = null;
  ornamentMaterial.color.set('#19b8ce');
  ornamentMaterial.emissive.set('#06394b');
  ornamentMaterial.emissiveIntensity = 0.92;
  ornamentMaterial.roughness = 0.24;
  const materials: MaterialSet = {
    dark: makeMaterial('dark', options),
    coating: coatingMaterial,
    polymer: makeMaterial('polymer', options),
    cavity: makeMaterial('cavity', { ...options, noTextures: true }),
    glass: makeMaterial('glass', options),
    silver: makeMaterial('silver', options),
    edge: makeMaterial('edge', options),
    ornament: ornamentMaterial,
  };
  const root = new THREE.Group();
  root.name = 'sniper-rifle-root';
  root.userData.runtimeId = 'sniper-rifle-root';
  root.userData.sculptRuntime = runtime;
  root.userData.sourceTrace = trace;
  root.userData.projectionCalibration = sniperRifleProjectionCalibration;
  root.userData.codeOnly = true;
  root.userData.namedMacroGroups = ['stockAssembly', 'receiverActionAssembly', 'opticAssembly', 'magazineTriggerAssembly', 'underActionAssembly', 'barrelAssembly', 'muzzleAssembly'];
  runtime.nodes.root = root;
  runtime.destructionGroups.root = [root];

  const stock = addNode(root, 'stockAssembly', runtime);
  const receiver = addNode(root, 'receiverActionAssembly', runtime);
  const optic = addNode(root, 'opticAssembly', runtime);
  const magazine = addNode(root, 'magazineTriggerAssembly', runtime);
  const underAction = addNode(root, 'underActionAssembly', runtime);
  const barrel = addNode(root, 'barrelAssembly', runtime);
  const muzzle = addNode(root, 'muzzleAssembly', runtime);

  addStock(stock, runtime, materials, shadows);
  addReceiverAction(receiver, runtime, materials, shadows);
  addOptic(optic, runtime, materials, shadows);
  addMagazineTrigger(magazine, runtime, materials, shadows);
  addUnderAction(underAction, runtime, materials, shadows);
  addBarrel(barrel, runtime, materials, shadows);
  addMuzzle(muzzle, runtime, materials, shadows);

  runtime.scopeSightLine = { start: [-1.88, 1.02, 0], end: [4.42, 0.42, 0] };
  const sightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...runtime.scopeSightLine.start), new THREE.Vector3(...runtime.scopeSightLine.end)]),
    new THREE.LineBasicMaterial({ color: 0x2fd8e6, transparent: true, opacity: 0.13 }),
  );
  sightLine.name = 'scope-sight-line';
  sightLine.userData.scopeSightLine = true;
  root.add(sightLine);
  runtime.sockets['scope-sight-line'] = sightLine;

  const idleObjects = [
    runtime.meshes.scopeGlassHighlight,
    runtime.meshes.scopeObjectiveGlass,
    runtime.meshes.scopeEyepieceGlass,
  ].filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
  root.userData.tick = (dt: number, elapsed: number): void => {
    if (options.disableIdle) return;
    const pulse = 0.72 + Math.sin(elapsed * 1.4) * 0.10;
    for (const mesh of idleObjects) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.emissive = new THREE.Color(0x0a6078);
      material.emissiveIntensity = pulse;
    }
    sightLine.visible = Math.sin(elapsed * 0.7) > -0.92;
    void dt;
  };
  root.userData.inspect = {
    source: trace.source,
    referenceBounds: trace.foregroundBounds,
    routes: { broadside: '?projection=1&ortho=1&view=front', studio: '?view=studio&projection=1&ortho=1&studio=1', orbit: '?view=three-quarter', neutral: '?view=neutral&projection=1&ortho=1&neutral=1' },
    runtimeMeshCount: Object.keys(runtime.meshes).length,
  };
  return root;
}

export function createSniperRifleLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'sniper-rifle-lookdev-lights';
  const key = new THREE.DirectionalLight(0xdbe8ff, 1.46);
  key.position.set(-3.8, 4.6, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const fill = new THREE.DirectionalLight(0x7184ff, 0.38);
  fill.position.set(3.4, 0.7, 3.2);
  const rim = new THREE.DirectionalLight(0x20c8d8, 0.66);
  rim.position.set(2.2, 2.5, -4.6);
  const hemisphere = new THREE.HemisphereLight(0x9dbdff, 0x0a1018, 0.46);
  hemisphere.position.set(0, 4.5, 0);
  const ambient = new THREE.AmbientLight(0x050a16, 0.24);
  lights.add(key, fill, rim, hemisphere, ambient);
  return lights;
}

export function makeSniperRifleBackground(): THREE.Color {
  return new THREE.Color(0x010207);
}
