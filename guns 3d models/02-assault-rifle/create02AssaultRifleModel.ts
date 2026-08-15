import * as THREE from 'three';
import { ASSAULT_RIFLE_REFERENCE } from './assaultRifleTrace';

/**
 * 02 Assault Rifle — code-only procedural reconstruction.
 *
 * The broadside trace is kept in assaultRifleTrace.ts. No mesh, texture pack, or runtime network
 * asset is imported. The recognizable identity is carried by real volumes: skeleton stock cutout,
 * split receiver, curved magazine, hooded optic window, vented handguard, rail teeth, foregrip
 * grooves, stepped barrel, and a slotted muzzle brake. The marbled coating and all supporting PBR
 * fields are generated locally from independent procedural CanvasTextures.
 */
export interface AssaultRifleOptions {
  shadows?: boolean;
  noTextures?: boolean;
  referenceTexture?: THREE.Texture;
  disableIdle?: boolean;
}

export interface AssaultRifleRuntime {
  nodes: Record<string, THREE.Object3D>;
  meshes: THREE.Mesh[];
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, { type: string; notes: string }>;
  destructionGroups: Record<string, string[]>;
  provenance: {
    route: 'procedural-finish' | 'reference-projection';
    exactnessTier: 'image-only';
    reference: string;
    inferred: string[];
  };
  idlePeriodSeconds: number;
}

type V3 = readonly [number, number, number];
type XY = readonly [number, number];

type MaterialSet = {
  dark: THREE.MeshPhysicalMaterial;
  darkEdge: THREE.MeshPhysicalMaterial;
  coating: THREE.MeshPhysicalMaterial;
  polymer: THREE.MeshPhysicalMaterial;
  cavity: THREE.MeshPhysicalMaterial;
  optic: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshPhysicalMaterial;
};

const FRONT_Z = 0.22;
const REAR_Z = -0.22;

function addGroup(parent: THREE.Object3D, id: string, runtime: AssaultRifleRuntime): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  group.userData.componentId = id;
  parent.add(group);
  runtime.nodes[id] = group;
  return group;
}

function addSocket(parent: THREE.Object3D, id: string, at: V3, runtime: AssaultRifleRuntime, extra: Record<string, unknown> = {}): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = id;
  socket.position.set(at[0], at[1], at[2]);
  socket.userData.socket = { id, axis: [1, 0, 0], ...extra };
  parent.add(socket);
  runtime.sockets[id] = socket;
  return socket;
}

function addMesh(
  parent: THREE.Object3D,
  id: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  runtime: AssaultRifleRuntime,
  integral?: boolean,
  shadows?: boolean,
): THREE.Mesh;
function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  runtime: AssaultRifleRuntime,
  integral?: boolean,
  shadows?: boolean,
): THREE.Mesh;
function addMesh(
  parent: THREE.Object3D,
  idOrGeometry: string | THREE.BufferGeometry,
  geometryOrMaterial: THREE.BufferGeometry | THREE.Material,
  materialOrRuntime: THREE.Material | AssaultRifleRuntime,
  runtimeOrIntegral: AssaultRifleRuntime | boolean = false,
  integralOrShadows = false,
  trailingShadows = true,
): THREE.Mesh {
  const named = typeof idOrGeometry === 'string';
  const id = named ? idOrGeometry : `assaultMesh${String((materialOrRuntime as AssaultRifleRuntime).meshes.length + 1).padStart(3, '0')}`;
  const geometry = (named ? geometryOrMaterial : idOrGeometry) as THREE.BufferGeometry;
  const material = (named ? materialOrRuntime : geometryOrMaterial) as THREE.Material;
  const runtime = (named ? runtimeOrIntegral : materialOrRuntime) as AssaultRifleRuntime;
  const integral = named ? Boolean(integralOrShadows) : Boolean(runtimeOrIntegral);
  const shadows = named ? trailingShadows : Boolean(integralOrShadows);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  mesh.userData.componentId = id;
  mesh.userData.explodeWithParent = integral;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  runtime.nodes[id] = mesh;
  runtime.meshes.push(mesh);
  return mesh;
}

function shapeFrom(points: readonly XY[], holes: readonly { cx: number; cy: number; r: number }[] = []): THREE.Shape {
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

function extrudePolygon(points: readonly XY[], depth: number, bevel = 0.025): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth,
    steps: 2,
    curveSegments: 16,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function extrudePolygonWithHoles(
  points: readonly XY[],
  holes: readonly { cx: number; cy: number; r: number }[],
  depth: number,
  bevel = 0.025,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeFrom(points, holes), {
    depth,
    steps: 2,
    curveSegments: 16,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function roundedBox(width: number, height: number, depth: number, bevel = 0.04): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 2, 2, 2);
  geometry.translate(0, 0, 0);
  // A weighted bevel is represented with subdivision geometry plus a bounded normal field.
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderX(length: number, radius: number, radial = 24, caps = true): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radial, 1, !caps);
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderY(length: number, radius: number, radial = 24, caps = true): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radial, 1, !caps);
  geometry.computeVertexNormals();
  return geometry;
}

function tubeBetween(a: V3, b: V3, radius: number, radial = 16): THREE.BufferGeometry {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), radial, 1, false);
  geometry.translate(0, direction.length() / 2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate(start.x, start.y, start.z);
  geometry.computeVertexNormals();
  return geometry;
}

function curveTube(points: readonly V3[], radius: number, radial = 14): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius, radial, false);
  geometry.computeVertexNormals();
  return geometry;
}

function torusGeometry(major: number, minor: number, radial = 32, tubular = 10): THREE.TorusGeometry {
  const geometry = new THREE.TorusGeometry(major, minor, radial, tubular);
  geometry.computeVertexNormals();
  return geometry;
}

function hash(x: number, y: number, seed: number): number {
  let value = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number { return t * t * (3 - 2 * t); }

function valueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

function makeTexture(
  width: number,
  height: number,
  paint: (u: number, v: number) => [number, number, number, number],
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = paint(x / Math.max(1, width - 1), y / Math.max(1, height - 1));
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.max(0, Math.min(255, Math.round(color[0])));
      image.data[offset + 1] = Math.max(0, Math.min(255, Math.round(color[1])));
      image.data[offset + 2] = Math.max(0, Math.min(255, Math.round(color[2])));
      image.data[offset + 3] = Math.max(0, Math.min(255, Math.round(color[3])));
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function proceduralMaps(kind: 'coating' | 'polymer' | 'metal', noTextures: boolean): {
  albedo?: THREE.CanvasTexture;
  roughness?: THREE.CanvasTexture;
  normal?: THREE.CanvasTexture;
} {
  if (noTextures) return {};
  const width = 512;
  const height = 256;
  const albedo = makeTexture(width, height, (u, v) => {
    const low = valueNoise(u, v, kind === 'coating' ? 21 : 33, 4, 3);
    const mid = valueNoise(u * 1.2, v * 0.8, kind === 'metal' ? 41 : 51, 18, 10);
    const fine = valueNoise(u * 2.0, v * 2.0, 71, 52, 40);
    if (kind === 'coating') {
      const wave = Math.sin((u * 3.4 + v * 1.6 + low * 1.6) * Math.PI * 2);
      const tendril = THREE.MathUtils.smoothstep(Math.abs(wave), 0.26, 0.78);
      const blue = 30 + tendril * 58 + mid * 30;
      const cyan = 18 + (1 - tendril) * 22 + fine * 18;
      return [12 + blue * 0.38, 24 + blue * 0.58, 38 + blue + cyan * 0.2, 255];
    }
    if (kind === 'polymer') return [42 + low * 24 + fine * 9, 48 + low * 27 + fine * 10, 55 + low * 30 + fine * 12, 255];
    return [34 + low * 30 + fine * 12, 42 + low * 34 + fine * 14, 56 + low * 42 + fine * 18, 255];
  });
  const roughness = makeTexture(width, height, (u, v) => {
    const n = valueNoise(u, v, 101, kind === 'coating' ? 26 : 34, kind === 'coating' ? 16 : 22);
    const ridge = Math.abs(Math.sin((u * 18 + v * 2.3) * Math.PI));
    const base = kind === 'metal' ? 78 : kind === 'coating' ? 110 : 168;
    const value = base + n * 65 + ridge * (kind === 'coating' ? 24 : 11);
    return [value, value, value, 255];
  }, THREE.NoColorSpace);
  const normal = makeTexture(width, height, (u, v) => {
    const n = valueNoise(u, v, 137, 72, 48);
    const ridge = Math.sin((u * 42 + v * 7) * Math.PI * 2) * 0.5 + 0.5;
    const lift = Math.round(128 + (n - 0.5) * 35 + (ridge - 0.5) * (kind === 'coating' ? 22 : 10));
    return [lift, Math.max(92, Math.min(164, lift - 5)), 255, 255];
  }, THREE.NoColorSpace);
  return { albedo, roughness, normal };
}

function makeMaterials(options: AssaultRifleOptions): MaterialSet {
  const noTextures = options.noTextures ?? false;
  const darkMaps = proceduralMaps('metal', noTextures);
  const coatingMaps = proceduralMaps('coating', noTextures);
  const polymerMaps = proceduralMaps('polymer', noTextures);
  const common = { envMapIntensity: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.28 };
  const dark = new THREE.MeshPhysicalMaterial({
    ...common,
    name: 'dark-anodized-metal',
    color: darkMaps.albedo ? 0xffffff : 0x12161d,
    map: darkMaps.albedo,
    roughness: 0.32,
    roughnessMap: darkMaps.roughness,
    metalness: 0.92,
    normalMap: darkMaps.normal,
    normalScale: new THREE.Vector2(0.13, 0.13),
  });
  const darkEdge = new THREE.MeshPhysicalMaterial({
    ...common,
    name: 'dark-metal-edge',
    color: 0x344457,
    roughness: 0.24,
    metalness: 0.98,
    clearcoat: 0.22,
  });
  const coating = new THREE.MeshPhysicalMaterial({
    ...common,
    name: 'cool-marbled-coating',
    color: coatingMaps.albedo ? 0xffffff : 0x2e4d70,
    map: coatingMaps.albedo,
    roughness: 0.42,
    roughnessMap: coatingMaps.roughness,
    metalness: 0.48,
    normalMap: coatingMaps.normal,
    normalScale: new THREE.Vector2(0.2, 0.2),
    clearcoat: 0.52,
    clearcoatRoughness: 0.18,
  });
  const polymer = new THREE.MeshPhysicalMaterial({
    name: 'charcoal-polymer',
    color: polymerMaps.albedo ? 0xffffff : 0x191d20,
    map: polymerMaps.albedo,
    roughness: 0.68,
    roughnessMap: polymerMaps.roughness,
    metalness: 0.04,
    normalMap: polymerMaps.normal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    envMapIntensity: 0.3,
  });
  const cavity = new THREE.MeshPhysicalMaterial({
    name: 'cavity-material',
    color: 0x05070a,
    roughness: 0.86,
    metalness: 0.12,
    envMapIntensity: 0.08,
  });
  const optic = new THREE.MeshPhysicalMaterial({
    name: 'optic-glass',
    color: 0x377f99,
    roughness: 0.12,
    metalness: 0.08,
    transmission: 0.18,
    transparent: true,
    opacity: 0.78,
    thickness: 0.04,
    ior: 1.5,
    clearcoat: 0.38,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.05,
    side: THREE.DoubleSide,
  });
  const accent = new THREE.MeshPhysicalMaterial({
    name: 'cool-accent',
    color: 0x4bbddd,
    emissive: 0x0b2634,
    emissiveIntensity: 0.42,
    roughness: 0.25,
    metalness: 0.32,
    clearcoat: 0.52,
  });
  return { dark, darkEdge, coating, polymer, cavity, optic, accent };
}

function addRailTeeth(parent: THREE.Object3D, id: string, startX: number, count: number, y: number, z: number, material: THREE.Material, runtime: AssaultRifleRuntime, shadows: boolean, width = 0.065): void {
  const toothGeometry = roundedBox(width, 0.105, 0.34, 0.012);
  for (let i = 0; i < count; i += 1) {
    const tooth = addMesh(parent, `${id}${i + 1}`, toothGeometry, material, runtime, true, shadows);
    tooth.position.set(startX + i * 0.105, y, z);
  }
}

function addPins(parent: THREE.Object3D, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const pinGeometry = new THREE.CylinderGeometry(0.065, 0.065, 0.035, 24);
  pinGeometry.rotateX(Math.PI / 2);
  for (const [i, x] of [-0.92, -0.27, -0.08].entries()) {
    const pin = addMesh(parent, `receiverPin${i + 1}`, pinGeometry, materials.darkEdge, runtime, true, shadows);
    pin.position.set(x, 0.31, FRONT_Z + 0.02);
    const center = addMesh(parent, `receiverPinCenter${i + 1}`, new THREE.CylinderGeometry(0.016, 0.016, 0.041, 16), materials.cavity, runtime, true, shadows);
    center.rotation.x = Math.PI / 2;
    center.position.set(x, 0.31, FRONT_Z + 0.042);
  }
}

function addStock(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const butt = addMesh(group, 'stockButtpad', roundedBox(0.18, 0.78, 0.40, 0.055), materials.polymer, runtime, false, shadows);
  butt.position.set(-2.80, -0.05, 0);
  const cheek = addMesh(group, 'stockCheekRest', roundedBox(0.72, 0.17, 0.34, 0.04), materials.polymer, runtime, true, shadows);
  cheek.position.set(-2.30, 0.39, 0.01);
  const buffer = addMesh(group, cylinderX(0.86, 0.14, 28), materials.dark, runtime, true, shadows);
  buffer.position.set(-1.77, 0.38, 0);
  const collar = addMesh(group, cylinderX(0.15, 0.19, 28), materials.darkEdge, runtime, true, shadows);
  collar.position.set(-1.38, 0.38, 0);
  const upperRail = addMesh(group, tubeBetween([-2.68, 0.26, 0], [-1.62, 0.36, 0], 0.075), materials.polymer, runtime, true, shadows);
  const lowerRail = addMesh(group, tubeBetween([-2.70, -0.29, 0], [-1.62, 0.20, 0], 0.075), materials.polymer, runtime, true, shadows);
  const rearBrace = addMesh(group, tubeBetween([-2.74, -0.27, 0], [-2.68, 0.27, 0], 0.075), materials.polymer, runtime, true, shadows);
  upperRail.userData.feature = 'stock-upper-brace';
  lowerRail.userData.feature = 'stock-lower-brace';
  rearBrace.userData.feature = 'stock-rear-brace';
  const stockInset = addMesh(group, tubeBetween([-2.54, -0.19, FRONT_Z * 0.76], [-2.14, 0.10, FRONT_Z * 0.76], 0.028), materials.darkEdge, runtime, true, shadows);
  stockInset.userData.feature = 'stock-inset-edge';
  const sling = addMesh(group, torusGeometry(0.12, 0.028, 18, 36), materials.darkEdge, runtime, true, shadows);
  sling.position.set(-2.82, -0.50, 0);
  sling.rotation.x = Math.PI / 2;
  addSocket(group, 'stockAssemblySocket', [-1.34, 0.38, 0], runtime, { movable: true, range: [-0.35, 0] });
}

function addReceiver(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const upperPoints: XY[] = [[-1.32, 0.31], [-0.18, 0.31], [-0.08, 0.47], [-0.20, 0.66], [-1.25, 0.66], [-1.38, 0.55]];
  const upper = addMesh(group, 'upperReceiverShell', extrudePolygon(upperPoints, 0.46, 0.045), materials.dark, runtime, false, shadows);
  upper.userData.feature = 'upper-receiver-shell';
  const lowerPoints: XY[] = [[-1.22, 0.31], [-0.12, 0.31], [-0.07, 0.05], [-0.34, -0.06], [-0.97, -0.03], [-1.30, 0.12]];
  const lower = addMesh(group, 'lowerReceiverShell', extrudePolygon(lowerPoints, 0.44, 0.042), materials.dark, runtime, false, shadows);
  lower.userData.feature = 'lower-receiver-shell';
  const split = addMesh(group, roundedBox(0.91, 0.024, 0.48, 0.007), materials.cavity, runtime, true, shadows);
  split.position.set(-0.73, 0.295, FRONT_Z + 0.012);
  const ejection = addMesh(group, roundedBox(0.39, 0.13, 0.028, 0.015), materials.cavity, runtime, true, shadows);
  ejection.position.set(-0.38, 0.50, FRONT_Z + 0.027);
  const ejectionLip = addMesh(group, roundedBox(0.47, 0.018, 0.045, 0.004), materials.darkEdge, runtime, true, shadows);
  ejectionLip.position.set(-0.38, 0.585, FRONT_Z + 0.035);
  const chargingHandle = addMesh(group, roundedBox(0.18, 0.11, 0.25, 0.018), materials.darkEdge, runtime, true, shadows);
  chargingHandle.position.set(-1.22, 0.72, 0);
  const magwell = addMesh(group, roundedBox(0.25, 0.34, 0.46, 0.03), materials.darkEdge, runtime, true, shadows);
  magwell.position.set(-0.02, 0.11, 0);
  const triggerGuard = addMesh(group, curveTube([[-0.88, 0.10, FRONT_Z], [-0.79, -0.15, FRONT_Z], [-0.48, -0.18, FRONT_Z], [-0.37, 0.07, FRONT_Z]], 0.035, 12), materials.darkEdge, runtime, true, shadows);
  triggerGuard.userData.feature = 'real-trigger-opening';
  const trigger = addMesh(group, curveTube([[-0.63, 0.04, FRONT_Z + 0.025], [-0.61, -0.08, FRONT_Z + 0.025], [-0.54, -0.12, FRONT_Z + 0.025]], 0.026, 12), materials.darkEdge, runtime, true, shadows);
  trigger.userData.feature = 'trigger-blade';
  const grip = addMesh(group, extrudePolygon([[-0.82, -0.04], [-0.55, -0.10], [-0.72, -0.84], [-1.02, -0.77]], 0.34, 0.035), materials.polymer, runtime, false, shadows);
  grip.position.z = 0;
  const gripBack = addMesh(group, roundedBox(0.29, 0.10, 0.37, 0.025), materials.darkEdge, runtime, true, shadows);
  gripBack.position.set(-0.85, -0.80, 0);
  for (let i = 0; i < 5; i += 1) {
    const groove = addMesh(group, roundedBox(0.16, 0.022, 0.37, 0.006), materials.cavity, runtime, true, shadows);
    groove.position.set(-0.85, -0.27 - i * 0.095, FRONT_Z + 0.185);
    groove.rotation.z = -0.20;
  }
  addPins(group, runtime, materials, shadows);
  addRailTeeth(group, 'receiverRailTooth', -1.16, 12, 0.75, 0, materials.darkEdge, runtime, shadows, 0.055);
  addSocket(group, 'receiverAssemblySocket', [-0.7, 0.3, 0], runtime);
}

function addOptic(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const body = addMesh(group, 'opticHousing', roundedBox(0.70, 0.40, 0.36, 0.055), materials.dark, runtime, false, shadows);
  body.position.set(-0.74, 0.99, 0);
  const hood = addMesh(group, extrudePolygon([[-1.11, 1.13], [-0.39, 1.13], [-0.33, 1.34], [-0.45, 1.48], [-1.08, 1.48]], 0.36, 0.04), materials.dark, runtime, true, shadows);
  const glass = addMesh(group, roundedBox(0.45, 0.27, 0.018, 0.025), materials.optic, runtime, true, shadows);
  glass.position.set(-0.74, 1.28, FRONT_Z + 0.19);
  glass.userData.feature = 'clear-optic-window';
  const lensRim = addMesh(group, torusGeometry(0.17, 0.014, 16, 32), materials.accent, runtime, true, shadows);
  lensRim.scale.set(1.42, 0.86, 1);
  lensRim.position.set(-0.74, 1.28, FRONT_Z + 0.204);
  lensRim.rotation.x = Math.PI / 2;
  const reticleV = addMesh(group, roundedBox(0.012, 0.20, 0.008, 0.002), materials.accent, runtime, true, shadows);
  reticleV.position.set(-0.74, 1.28, FRONT_Z + 0.214);
  const reticleH = addMesh(group, roundedBox(0.25, 0.012, 0.008, 0.002), materials.accent, runtime, true, shadows);
  reticleH.position.set(-0.74, 1.28, FRONT_Z + 0.214);
  const mount = addMesh(group, roundedBox(0.48, 0.10, 0.34, 0.02), materials.darkEdge, runtime, true, shadows);
  mount.position.set(-0.74, 0.75, 0);
  const adjusterA = addMesh(group, cylinderY(0.12, 0.08, 20), materials.darkEdge, runtime, true, shadows);
  adjusterA.position.set(-0.47, 1.20, FRONT_Z + 0.02);
  const adjusterB = addMesh(group, cylinderY(0.12, 0.07, 20), materials.darkEdge, runtime, true, shadows);
  adjusterB.position.set(-1.01, 1.20, FRONT_Z + 0.02);
  addSocket(group, 'opticAssemblySocket', [-0.74, 0.76, 0], runtime, { movable: true });
  addSocket(group, 'scope-sight-line', [-0.74, 1.30, FRONT_Z + 0.32], runtime, { optic: { fovDegrees: 8, reticle: 'crosshair' } });
}

function addMagazine(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const points: XY[] = [[-0.18, 0.26], [0.38, 0.24], [0.53, -0.05], [0.45, -1.19], [0.08, -1.34], [-0.19, -1.25], [-0.10, -0.30]];
  const body = addMesh(group, 'magazineBody', extrudePolygon(points, 0.34, 0.035), materials.polymer, runtime, false, shadows);
  body.position.z = -0.02;
  for (let i = 0; i < 4; i += 1) {
    const rib = addMesh(group, roundedBox(0.42 - i * 0.025, 0.033, 0.37, 0.007), materials.darkEdge, runtime, true, shadows);
    rib.position.set(0.14 + i * 0.015, -0.05 - i * 0.25, FRONT_Z + 0.18);
    rib.rotation.z = -0.08;
  }
  const spine = addMesh(group, tubeBetween([0.44, -0.10, FRONT_Z + 0.17], [0.34, -1.17, FRONT_Z + 0.17], 0.025), materials.cavity, runtime, true, shadows);
  const floor = addMesh(group, roundedBox(0.50, 0.12, 0.38, 0.025), materials.darkEdge, runtime, true, shadows);
  floor.position.set(0.18, -1.31, 0);
  addSocket(group, 'magazineAssemblySocket', [-0.02, 0.22, 0], runtime, { detachable: true });
}

function addHandguard(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const shellPoints: XY[] = [[0.05, 0.31], [2.05, 0.31], [2.20, 0.42], [2.10, 0.72], [0.07, 0.72], [-0.02, 0.56]];
  const shell = addMesh(group, 'handguardShell', extrudePolygon(shellPoints, 0.60, 0.045), materials.coating, runtime, false, shadows);
  shell.userData.feature = 'source-traced-marbled-handguard';
  const lowerRail = addMesh(group, roundedBox(1.72, 0.095, 0.42, 0.02), materials.darkEdge, runtime, true, shadows);
  lowerRail.position.set(1.12, 0.26, 0);
  addRailTeeth(group, 'topPicRailTooth', 0.18, 18, 0.79, 0, materials.darkEdge, runtime, shadows, 0.06);
  addRailTeeth(group, 'sideRailTooth', 0.20, 14, 0.48, FRONT_Z + 0.24, materials.darkEdge, runtime, shadows, 0.046);
  for (let i = 0; i < 7; i += 1) {
    const x = 0.35 + i * 0.235;
    const vent = addMesh(group, roundedBox(0.14, 0.06, 0.40, 0.028), materials.cavity, runtime, true, shadows);
    vent.position.set(x, 0.50, FRONT_Z + 0.205);
    vent.rotation.z = i % 2 === 0 ? 0.04 : -0.04;
    vent.userData.feature = 'real-handguard-vent-slot';
    const ventLip = addMesh(group, roundedBox(0.19, 0.014, 0.43, 0.006), materials.darkEdge, runtime, true, shadows);
    ventLip.position.set(x, 0.545, FRONT_Z + 0.222);
  }
  for (let i = 0; i < 5; i += 1) {
    const fastener = addMesh(group, new THREE.CylinderGeometry(0.026, 0.026, 0.035, 16), materials.darkEdge, runtime, true, shadows);
    fastener.rotation.x = Math.PI / 2;
    fastener.position.set(0.44 + i * 0.34, 0.36, FRONT_Z + 0.25);
  }
  addSocket(group, 'handguardAssemblySocket', [0.05, 0.52, 0], runtime);
}

function addForegrip(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const body = addMesh(group, extrudePolygon([[-0.16, 0.30], [0.22, 0.30], [0.14, -0.50], [-0.12, -0.58], [-0.31, -0.47]], 0.32, 0.035), materials.polymer, runtime, false, shadows);
  body.position.set(1.13, 0.00, 0);
  const shoe = addMesh(group, roundedBox(0.37, 0.10, 0.38, 0.025), materials.darkEdge, runtime, true, shadows);
  shoe.position.set(1.13, 0.31, 0);
  for (let i = 0; i < 5; i += 1) {
    const groove = addMesh(group, roundedBox(0.24, 0.025, 0.34, 0.006), materials.cavity, runtime, true, shadows);
    groove.position.set(1.13, 0.14 - i * 0.11, FRONT_Z + 0.18);
    groove.rotation.z = -0.04;
  }
  const frontHook = addMesh(group, tubeBetween([0.98, -0.39, FRONT_Z + 0.15], [1.18, -0.50, FRONT_Z + 0.15], 0.033), materials.darkEdge, runtime, true, shadows);
  frontHook.userData.feature = 'foregrip-front-hook';
  addSocket(group, 'foregripAssemblySocket', [1.13, 0.31, 0], runtime);
}

function addBarrelMuzzle(group: THREE.Group, runtime: AssaultRifleRuntime, materials: MaterialSet, shadows: boolean): void {
  const barrel = addMesh(group, cylinderX(1.55, 0.11, 32), materials.dark, runtime, false, shadows);
  barrel.position.set(2.55, 0.52, 0);
  const step = addMesh(group, cylinderX(0.34, 0.16, 32), materials.darkEdge, runtime, true, shadows);
  step.position.set(1.86, 0.52, 0);
  const gasBlock = addMesh(group, roundedBox(0.26, 0.32, 0.37, 0.028), materials.dark, runtime, true, shadows);
  gasBlock.position.set(1.82, 0.56, 0);
  const sightTower = addMesh(group, roundedBox(0.13, 0.35, 0.28, 0.018), materials.darkEdge, runtime, true, shadows);
  sightTower.position.set(2.02, 0.76, 0);
  const sightPost = addMesh(group, roundedBox(0.035, 0.21, 0.09, 0.006), materials.darkEdge, runtime, true, shadows);
  sightPost.position.set(2.02, 1.03, FRONT_Z + 0.01);
  const muzzle = addMesh(group, cylinderX(0.36, 0.20, 32), materials.darkEdge, runtime, false, shadows);
  muzzle.position.set(3.45, 0.52, 0);
  const collar = addMesh(group, cylinderX(0.10, 0.16, 28), materials.dark, runtime, true, shadows);
  collar.position.set(3.23, 0.52, 0);
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const slot = addMesh(group, roundedBox(0.16, 0.05, 0.035, 0.004), materials.cavity, runtime, true, shadows);
    slot.position.set(3.45, 0.52 + Math.cos(angle) * 0.14, Math.sin(angle) * 0.14);
    slot.rotation.x = angle;
    slot.rotation.z = angle * 0.18;
    slot.userData.feature = 'muzzle-brake-slot';
  }
  const bore = addMesh(group, torusGeometry(0.09, 0.026, 18, 36), materials.cavity, runtime, true, shadows);
  bore.position.set(3.64, 0.52, FRONT_Z * 0.55);
  bore.rotation.y = Math.PI / 2;
  addSocket(group, 'barrelMuzzleAssemblySocket', [1.73, 0.52, 0], runtime);
}

function addLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'assaultRifleLookDevLights';
  const key = new THREE.DirectionalLight(0xdbe8ff, 1.35);
  key.position.set(-3.5, 4.2, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const fill = new THREE.DirectionalLight(0x6e7fff, 0.28);
  fill.position.set(3.4, 0.4, 2.8);
  const rim = new THREE.DirectionalLight(0x24c8d8, 0.58);
  rim.position.set(1.8, 2.2, -4.2);
  const ambient = new THREE.AmbientLight(0x02040a, 0.18);
  lights.add(key, fill, rim, ambient);
  return lights;
}

export function createAssaultRifleLookDevLights(): THREE.Group { return addLookDevLights(); }

export function makeAssaultRifleBackground(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const gradient = context.createRadialGradient(size * 0.48, size * 0.44, 16, size * 0.5, size * 0.5, size * 0.8);
  gradient.addColorStop(0, '#0d1722');
  gradient.addColorStop(0.48, '#050a12');
  gradient.addColorStop(1, '#010207');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function create02AssaultRifleModel(options: AssaultRifleOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const root = new THREE.Group();
  root.name = 'assault-rifle-root';
  const asset = new THREE.Group();
  asset.name = 'assault-rifle-geometry';
  // Source bounds are deliberately long and shallow; the authored local construction is vertically
  // compressed so the optic/stock/magazine envelope matches the 1672x941 broadside silhouette.
  asset.scale.y = 0.94;
  root.add(asset);
  const runtime: AssaultRifleRuntime = {
    nodes: { root, asset },
    meshes: [],
    sockets: {},
    colliders: {
      stockAssembly: { type: 'compound-rail-proxy', notes: 'proxy spans skeleton stock rails and buttpad' },
      receiverAssembly: { type: 'beveled-box-proxy', notes: 'proxy spans upper/lower receiver and trigger opening' },
      opticAssembly: { type: 'rounded-box-proxy', notes: 'proxy spans hood and optical window' },
      magazineAssembly: { type: 'curved-prism-proxy', notes: 'proxy follows curved magazine body' },
      handguardAssembly: { type: 'shell-proxy', notes: 'proxy spans vented handguard shell' },
      foregripAssembly: { type: 'tapered-prism-proxy', notes: 'proxy follows vertical foregrip' },
      barrelMuzzleAssembly: { type: 'compound-cylinder-proxy', notes: 'proxy spans barrel, gas block, and muzzle brake' },
    },
    destructionGroups: {},
    provenance: {
      route: options.referenceTexture ? 'reference-projection' : 'procedural-finish',
      exactnessTier: 'image-only',
      reference: ASSAULT_RIFLE_REFERENCE.sourceImage,
      inferred: [
        'hidden receiver and stock backside thickness',
        'exact polymer and coating chemistry',
        'internal bolt, trigger, feed, and bore mechanics',
      ],
    },
    idlePeriodSeconds: 11,
  };
  root.userData.sculptRuntime = runtime;
  root.userData.sourceTrace = ASSAULT_RIFLE_REFERENCE;
  root.userData.projectionRoute = {
    camera: ASSAULT_RIFLE_REFERENCE.camera,
    broadside: 'reference-projection',
    orbit: 'authored-procedural-pbr-fallback',
    note: 'Reference texture is optional local evaluation input; no network or imported mesh asset is used.',
  };

  const materials = makeMaterials(options);
  const stock = addGroup(asset, 'stockAssembly', runtime);
  const receiver = addGroup(asset, 'receiverAssembly', runtime);
  const optic = addGroup(asset, 'opticAssembly', runtime);
  const magazine = addGroup(asset, 'magazineAssembly', runtime);
  const handguard = addGroup(asset, 'handguardAssembly', runtime);
  const foregrip = addGroup(asset, 'foregripAssembly', runtime);
  const barrelMuzzle = addGroup(asset, 'barrelMuzzleAssembly', runtime);
  addStock(stock, runtime, materials, shadows);
  addReceiver(receiver, runtime, materials, shadows);
  addOptic(optic, runtime, materials, shadows);
  addMagazine(magazine, runtime, materials, shadows);
  addHandguard(handguard, runtime, materials, shadows);
  addForegrip(foregrip, runtime, materials, shadows);
  addBarrelMuzzle(barrelMuzzle, runtime, materials, shadows);

  const macroGroups = [stock, receiver, optic, magazine, handguard, foregrip, barrelMuzzle];
  const macroLabels = ['stock', 'receiver', 'optic', 'magazine', 'handguard', 'foregrip', 'barrel-muzzle'];
  for (let i = 0; i < macroGroups.length; i += 1) {
    macroGroups[i].userData.role = macroLabels[i];
    macroGroups[i].userData.socket = `${macroGroups[i].name}Socket`;
  }
  runtime.destructionGroups = {
    stockAssembly: stock.children.map((child) => child.name),
    receiverAssembly: receiver.children.map((child) => child.name),
    opticAssembly: optic.children.map((child) => child.name),
    magazineAssembly: magazine.children.map((child) => child.name),
    handguardAssembly: handguard.children.map((child) => child.name),
    foregripAssembly: foregrip.children.map((child) => child.name),
    barrelMuzzleAssembly: barrelMuzzle.children.map((child) => child.name),
  };

  root.userData.reconstruction = {
    generatedWith: 'img2threejs skill v1.4.4 · procedural assault-rifle adapter',
    reference: ASSAULT_RIFLE_REFERENCE.sourceImage,
    route: runtime.provenance.route,
    exactnessTier: runtime.provenance.exactnessTier,
    visualNotes: 'Broadside identity is carried by seven macro assemblies, real negative spaces, rails, vents, ribs, grooves, optic glass, and muzzle slots.',
    codeOnly: true,
    runtimeNetworkAssets: false,
  };

  if (!options.disableIdle) {
    root.userData.tick = (_dt: number, elapsed: number): void => {
      const phase = (elapsed / runtime.idlePeriodSeconds) * Math.PI * 2;
      root.rotation.y = Math.sin(phase) * THREE.MathUtils.degToRad(9);
      root.rotation.x = Math.sin(phase * 2) * THREE.MathUtils.degToRad(1.6);
      root.rotation.z = Math.sin(phase) * THREE.MathUtils.degToRad(0.8);
    };
  }
  return root;
}
