import * as THREE from 'three';
import { MELEE_REFERENCE } from './meleeTrace';

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
  /** Optional local source image texture for the reference-projection evaluation route. */
  referenceTexture?: THREE.Texture;
}

export interface MeleeKarambitRuntime {
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

export type XY = readonly [number, number];
type Hole = { cx: number; cy: number; r: number };

const RING_CENTER: XY = [MELEE_REFERENCE.ring.cx, MELEE_REFERENCE.ring.cy];
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

function shapeFrom(points: readonly XY[], holes: Hole[] = []): THREE.Shape {
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
  points: readonly XY[],
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

function tracePolygon(top: readonly XY[], bottom: readonly XY[]): XY[] {
  return [...bottom, ...top.slice().reverse()] as XY[];
}

function imagePoint(px: number, py: number): XY {
  const b = MELEE_REFERENCE.boundsPx;
  return [
    (px - (b.left + b.right) / 2) / (b.right - b.left + 1) * MELEE_REFERENCE.worldBounds.width,
    ((b.top + b.bottom) / 2 - py) / (b.bottom - b.top + 1) * MELEE_REFERENCE.worldBounds.height,
  ];
}

function projectUV(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const uv = new Float32Array(position.count * 2);
  const b = MELEE_REFERENCE.boundsPx;
  const source = MELEE_REFERENCE.sourceSize;
  const pixelWidth = b.right - b.left + 1;
  const pixelHeight = b.bottom - b.top + 1;
  const centerX = (b.left + b.right) / 2;
  const centerY = (b.top + b.bottom) / 2;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const px = centerX + (x / MELEE_REFERENCE.worldBounds.width) * pixelWidth;
    const py = centerY - (y / MELEE_REFERENCE.worldBounds.height) * pixelHeight;
    uv[i * 2] = THREE.MathUtils.clamp(px / source.width, 0, 1);
    uv[i * 2 + 1] = THREE.MathUtils.clamp(1 - py / source.height, 0, 1);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function clipX(points: readonly XY[], boundary: number, keepGreater: boolean): XY[] {
  const output: XY[] = [];
  const inside = (p: XY): boolean => keepGreater ? p[0] >= boundary : p[0] <= boundary;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aInside = inside(a);
    const bInside = inside(b);
    if (aInside !== bInside) {
      const t = (boundary - a[0]) / (b[0] - a[0]);
      output.push([boundary, a[1] + (b[1] - a[1]) * t]);
    }
    if (bInside) output.push(b);
  }
  return output;
}

function clipBand(points: readonly XY[], minX: number, maxX: number): XY[] {
  return clipX(clipX(points, minX, true), maxX, false);
}

function traceY(points: readonly XY[], x: number): number {
  let best = points[0][1];
  let bestDistance = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a[0] && x <= b[0]) {
      const t = (x - a[0]) / Math.max(1e-5, b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
    const distance = Math.min(Math.abs(x - a[0]), Math.abs(x - b[0]));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = Math.abs(x - a[0]) < Math.abs(x - b[0]) ? a[1] : b[1];
    }
  }
  return best;
}

function createGroundBlade(points: XY[], holes: Hole[], depth = 0.16): THREE.BufferGeometry {
  const raw = slab(points, 1, 0, holes, 1).toNonIndexed();
  raw.translate(0, 0, -0.5);
  const position = raw.getAttribute('position');
  const heightField = (bins = 192) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const [x] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    const top = new Float32Array(bins).fill(-Infinity);
    const bottom = new Float32Array(bins).fill(Infinity);
    const bin = (x: number) => Math.min(bins - 1, Math.max(0, Math.floor(((x - x0) / (x1 - x0)) * bins)));
    for (const [x, y] of points) {
      const b = bin(x);
      top[b] = Math.max(top[b], y);
      bottom[b] = Math.min(bottom[b], y);
    }
    for (let i = 1; i < bins; i += 1) {
      if (top[i] === -Infinity) top[i] = top[i - 1];
      if (bottom[i] === Infinity) bottom[i] = bottom[i - 1];
    }
    for (let i = bins - 2; i >= 0; i -= 1) {
      if (top[i] === -Infinity) top[i] = top[i + 1];
      if (bottom[i] === Infinity) bottom[i] = bottom[i + 1];
    }
    const smooth = (array: Float32Array): Float32Array => {
      const out = new Float32Array(array.length);
      for (let i = 0; i < array.length; i += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -2; k <= 2; k += 1) {
          const j = Math.min(array.length - 1, Math.max(0, i + k));
          sum += array[j];
          count += 1;
        }
        out[i] = sum / count;
      }
      return out;
    };
    const topSmooth = smooth(top);
    const bottomSmooth = smooth(bottom);
    const sample = (array: Float32Array, x: number): number => {
      const t = THREE.MathUtils.clamp(((x - x0) / (x1 - x0)) * (bins - 1), 0, bins - 1.001);
      const i = Math.floor(t);
      const f = t - i;
      return array[i] * (1 - f) + array[i + 1] * f;
    };
    return { x0, x1, spineAt: (x: number) => sample(topSmooth, x), edgeAt: (x: number) => sample(bottomSmooth, x) };
  };
  const field = heightField();
  const halfThickness = (x: number, y: number): number => {
    const spine = field.spineAt(x);
    const edge = field.edgeAt(x);
    const h = Math.max(1e-5, spine - edge);
    const heightRatio = THREE.MathUtils.clamp((y - edge) / h, 0, 1);
    const grindFraction = 0.56;
    const apexFraction = 0.018;
    const grind = heightRatio >= grindFraction
      ? 1
      : apexFraction + (1 - apexFraction) * THREE.MathUtils.smoothstep(heightRatio / grindFraction, 0, 1);
    const tipProgress = THREE.MathUtils.clamp((x - field.x0) / (field.x1 - field.x0), 0, 1);
    const distal = 0.08 + 0.92 * THREE.MathUtils.smoothstep(tipProgress / 0.30, 0, 1);
    return (depth * 0.5) * grind * distal;
  };
  const capNormal = (x: number, y: number, side: number): THREE.Vector3 => {
    const eps = 0.006;
    const dx = (halfThickness(x + eps, y) - halfThickness(x - eps, y)) / (2 * eps);
    const dy = (halfThickness(x, y + eps) - halfThickness(x, y - eps)) / (2 * eps);
    return new THREE.Vector3(-side * dx, -side * dy, side).normalize();
  };
  const minX = Math.min(...points.map((p) => p[0]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  const maxY = Math.max(...points.map((p) => p[1]));
  const verts: number[] = [];
  const normals: number[] = [];
  const uv: number[] = [];
  const capGroup = raw.groups.find((g) => g.materialIndex === 0) ?? raw.groups[0];
  const capStart = capGroup?.start ?? 0;
  const capEnd = capStart + (capGroup?.count ?? 0);
  const at = (i: number): THREE.Vector3 => new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
  for (let i = 0; i < position.count; i += 3) {
    const isCap = i >= capStart && i < capEnd;
    const sourceTriangle = [at(i), at(i + 1), at(i + 2)];
    const triangles: THREE.Vector3[][] = isCap
      ? (() => {
          const [a, b, c] = sourceTriangle;
          const ab = a.clone().add(b).multiplyScalar(0.5);
          const bc = b.clone().add(c).multiplyScalar(0.5);
          const ca = c.clone().add(a).multiplyScalar(0.5);
          return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]];
        })()
      : [sourceTriangle];
    for (const tri of triangles) {
      const warped = tri.map((v) => {
        const side = Math.sign(v.z) || 1;
        return new THREE.Vector3(v.x, v.y, side * halfThickness(v.x, v.y));
      });
      const faceU = warped[1].clone().sub(warped[0]);
      const faceV = warped[2].clone().sub(warped[0]);
      const wallNormal = faceU.cross(faceV).normalize();
      for (const v of warped) {
        verts.push(v.x, v.y, v.z);
        const side = Math.sign(v.z) || 1;
        const n = isCap ? capNormal(v.x, v.y, side) : wallNormal;
        normals.push(n.x, n.y, n.z);
        uv.push(
          ((v.x - minX) / Math.max(1e-5, maxX - minX)) * 1.15,
          1 - ((v.y - minY) / Math.max(1e-5, maxY - minY)),
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  raw.dispose();
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
  const hash = (ix: number, iy: number): number => {
    const s = Math.sin(ix * 127.1 + iy * 311.7 + 19.19) * 43758.5453;
    return s - Math.floor(s);
  };
  const valueNoise = (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sx), THREE.MathUtils.lerp(c, d, sx), sy);
  };
  const field = (x: number, y: number): { n: number; vein: number; pore: number } => {
    const low = valueNoise(x * 3.8 + 1.7, y * 3.4 - 0.4);
    const mid = valueNoise(x * 10.5 - low * 1.8, y * 8.0 + low * 2.3);
    const fine = valueNoise(x * 33.0 + mid, y * 27.0 - low);
    const n = low * 0.55 + mid * 0.32 + fine * 0.13;
    const warped = valueNoise(x * 5.2 + low * 2.4, y * 4.2 - mid * 1.8);
    const veinWave = Math.sin((x * 2.4 + y * 1.6 + warped * 3.2) * Math.PI * 2.0) * 0.5 + 0.5;
    const vein = THREE.MathUtils.smoothstep(veinWave * 0.62 + mid * 0.38, 0.63, 0.86);
    const pore = THREE.MathUtils.smoothstep(fine, 0.72, 0.96);
    return { n, vein, pore };
  };
  const albedo = createNoiseTexture(1024, 512, (x, y) => {
    const { n, vein, pore } = field(x, y);
    const red = Math.round(118 + n * 90 - vein * 50 - pore * 16);
    const green = Math.round(6 + n * 15 - vein * 4);
    const blue = Math.round(12 + n * 23 - vein * 7);
    return [Math.max(18, red), Math.max(2, green), Math.max(4, blue), 255];
  });
  const roughness = createNoiseTexture(1024, 512, (x, y) => {
    const { n, vein, pore } = field(x, y);
    const r = Math.round(92 + n * 102 + vein * 68 + pore * 42);
    return [r, r, r, 255];
  });
  const normal = createNoiseTexture(1024, 512, (x, y) => {
    const { n, vein, pore } = field(x, y);
    const lift = Math.round(128 + (n - 0.5) * 18 + vein * 28 + pore * 12);
    return [lift, Math.max(92, lift - 9), 255, 255];
  });
  roughness.colorSpace = THREE.NoColorSpace;
  normal.colorSpace = THREE.NoColorSpace;
  return { albedo, roughness, normal };
}

function ivorySurfaceMaps(): {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const albedo = createNoiseTexture(512, 256, (x, y) => {
    const grain = Math.sin((x * 27 + y * 6) * Math.PI * 2) * 0.5 + 0.5;
    const stain = Math.sin((x * 5.2 - y * 3.4) * Math.PI * 2) * 0.5 + 0.5;
    const warm = 3 + stain * 7;
    return [Math.round(198 + grain * 24 + warm), Math.round(195 + grain * 22 + warm), Math.round(186 + grain * 20 + warm * 0.7), 255];
  });
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
  albedo.colorSpace = THREE.SRGBColorSpace;
  roughness.colorSpace = THREE.NoColorSpace;
  normal.colorSpace = THREE.NoColorSpace;
  return { albedo, roughness, normal };
}

function makeMaterials(options: MeleeKarambitOptions): {
  ruby: THREE.MeshPhysicalMaterial;
  rubyEdge: THREE.MeshPhysicalMaterial;
  ivory: THREE.MeshPhysicalMaterial;
  ivoryEdge: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  brassCrown: THREE.MeshPhysicalMaterial;
  seam: THREE.MeshPhysicalMaterial;
  edgeSteel: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
  medallionInlay: THREE.MeshPhysicalMaterial;
  glow: THREE.MeshBasicMaterial;
  referenceRuby: THREE.MeshPhysicalMaterial;
  referenceIvory: THREE.MeshPhysicalMaterial;
} {
  const maps = options.noTextures ? null : rubySurfaceMaps();
  const ivoryMaps = options.noTextures ? null : ivorySurfaceMaps();
  maps?.albedo.repeat.set(2.6, 1.8);
  maps?.roughness.repeat.set(2.6, 1.8);
  maps?.normal.repeat.set(2.6, 1.8);
  ivoryMaps?.albedo.repeat.set(2.2, 1.2);
  ivoryMaps?.roughness.repeat.set(3.0, 1.6);
  ivoryMaps?.normal.repeat.set(3.0, 1.6);
  const referenceRuby = new THREE.MeshPhysicalMaterial({
    map: options.referenceTexture,
    color: options.referenceTexture ? 0xffffff : 0x9f0814,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.18,
    clearcoatRoughness: 0.26,
    envMapIntensity: 0.34,
    name: 'ruby-reference-projection',
  });
  const referenceIvory = new THREE.MeshPhysicalMaterial({
    map: options.referenceTexture,
    color: options.referenceTexture ? 0xffffff : 0xd8d5c8,
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.08,
    envMapIntensity: 0.52,
    name: 'ivory-reference-projection',
  });
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
    color: ivoryMaps ? 0xffffff : 0xd8d5c8,
    map: ivoryMaps?.albedo,
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
    color: 0xe2a23a,
    emissive: 0x3b1600,
    emissiveIntensity: 0.12,
    roughness: 0.28,
    metalness: 0.50,
    clearcoat: 0.46,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.92,
    name: 'brass-fasteners-and-medallion',
  });
  const brassCrown = new THREE.MeshPhysicalMaterial({
    color: 0xffbd4a,
    emissive: 0x6b2400,
    emissiveIntensity: 0.28,
    roughness: 0.24,
    metalness: 0.36,
    clearcoat: 0.48,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.05,
    name: 'brass-dome-crowns',
  });
  const seam = new THREE.MeshPhysicalMaterial({
    color: 0x8b6b2c,
    roughness: 0.34,
    metalness: 0.82,
    clearcoat: 0.12,
    envMapIntensity: 1.0,
    name: 'panel-seams-and-spacers',
  });
  const edgeSteel = new THREE.MeshPhysicalMaterial({
    color: 0x8f8a83,
    roughness: 0.30,
    metalness: 0.84,
    clearcoat: 0.12,
    envMapIntensity: 1.1,
    name: 'ground-edge-steel',
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x1a1011,
    roughness: 0.62,
    metalness: 0.25,
    envMapIntensity: 0.45,
    name: 'recess-and-cavity',
  });
  const medallionInlay = new THREE.MeshPhysicalMaterial({
    color: 0x403526,
    roughness: 0.44,
    metalness: 0.34,
    clearcoat: 0.22,
    envMapIntensity: 0.62,
    name: 'medallion-warm-inlay',
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
  return { ruby, rubyEdge, ivory, ivoryEdge, brass, brassCrown, seam, edgeSteel, dark, medallionInlay, glow, referenceRuby, referenceIvory };
}

function addPin(
  parent: THREE.Object3D,
  id: string,
  x: number,
  y: number,
  material: THREE.Material,
  runtime: MeleeKarambitRuntime,
): THREE.Mesh {
  const mesh = new THREE.Mesh(pinHead(0.058, 0.030, 0.010), material);
  mesh.position.set(x, y, FRONT_Z * 0.145);
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
  const rim = new THREE.Mesh(annulus(x, y, 0.145, 0.112, 0.030, 0.006), brass);
  addPart(group, 'medallionRim', rim, runtime, true);
  const inlay = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.022, 40), dark);
  inlay.rotation.x = Math.PI / 2;
  inlay.position.set(x, y, 0.155);
  addPart(group, 'medallionInlay', inlay, runtime, true);
  const spokeGeometry = new THREE.BoxGeometry(0.158, 0.024, 0.020);
  for (let i = 0; i < 6; i += 1) {
    const spoke = new THREE.Mesh(spokeGeometry, brass);
    spoke.name = `medallionSpoke${i + 1}`;
    spoke.position.set(x, y, 0.172);
    spoke.rotation.z = (i * Math.PI) / 6;
    spoke.castShadow = true;
    spoke.receiveShadow = true;
    spoke.userData.explodeWithParent = true;
    group.add(spoke);
    runtime.nodes[spoke.name] = spoke;
    runtime.meshes.push(spoke);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 8), brass);
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
      route: options.referenceTexture ? 'reference-projection' : 'procedural-finish',
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
  const brassCrown = materials.brassCrown;
  const seam = materials.seam;
  const edgeSteel = materials.edgeSteel;
  const dark = materials.dark;
  const rubySurface = options.referenceTexture ? materials.referenceRuby : ruby;
  const ivorySurface = options.referenceTexture ? materials.referenceIvory : ivory;

  const bodyOutline = tracePolygon(MELEE_REFERENCE.outlineTop, MELEE_REFERENCE.outlineBottom);
  const bladeSplitX = imagePoint(706, 0)[0];
  const bladePoints = clipX(bodyOutline, bladeSplitX, false);
  const rearPoints = clipX(bodyOutline, bladeSplitX, true);
  const bladeHoles: Hole[] = MELEE_REFERENCE.holes.map((hole) => ({ cx: hole.cx, cy: hole.cy, r: hole.r }));
  const bladeGroup = addGroup(asset, 'bladeAssembly', runtime);
  const bladeGeometry = createGroundBlade(bladePoints, bladeHoles, 0.17);
  projectUV(bladeGeometry);
  const bladeMesh = new THREE.Mesh(bladeGeometry, rubySurface);
  addPart(bladeGroup, 'bladeBody', bladeMesh, runtime);
  const holeWalls = addGroup(bladeGroup, 'bladeHoleWalls', runtime);
  for (const [i, hole] of bladeHoles.entries()) {
    const wall = new THREE.Mesh(annulus(hole.cx, hole.cy, hole.r + 0.010, hole.r, 0.18, 0.003), rubyEdge);
    addPart(holeWalls, `bladeHoleWall${i + 1}`, wall, runtime, true);
  }
  if (options.referenceTexture) holeWalls.visible = false;
  const edgePoints = MELEE_REFERENCE.outlineBottom
    .filter(([x]) => x <= bladeSplitX)
    .filter((_, i) => i % 4 === 0 || i === MELEE_REFERENCE.outlineBottom.length - 1)
    .map(([x, y]) => new THREE.Vector3(x, y, 0.090));
  const cuttingEdgeCurve = new THREE.CatmullRomCurve3(edgePoints, false, 'centripetal', 0.25);
  const cuttingEdgeRail = new THREE.Mesh(new THREE.TubeGeometry(cuttingEdgeCurve, 96, 0.010, 8, false), edgeSteel);
  addPart(bladeGroup, 'cuttingEdgeRail', cuttingEdgeRail, runtime, true);
  if (options.referenceTexture) cuttingEdgeRail.visible = false;

  const tangGroup = addGroup(asset, 'redTangAssembly', runtime);
  const rearGeometry = slab(rearPoints, 0.18, 0.008, [MELEE_REFERENCE.ringBore], 4);
  projectUV(rearGeometry);
  addPart(tangGroup, 'redTang', new THREE.Mesh(rearGeometry, rubySurface), runtime);

  const panelGroup = addGroup(asset, 'ivoryScaleAssembly', runtime);
  const handleOutline = tracePolygon(MELEE_REFERENCE.handleTop, MELEE_REFERENCE.handleBottom);
  const seamX1 = imagePoint(915, 350)[0];
  const seamX2 = imagePoint(1218, 350)[0];
  const panelPolys = [
    clipBand(handleOutline, handleOutline.reduce((v, p) => Math.min(v, p[0]), Infinity), seamX1),
    clipBand(handleOutline, seamX1, seamX2),
    clipBand(handleOutline, seamX2, handleOutline.reduce((v, p) => Math.max(v, p[0]), -Infinity)),
  ];
  panelPolys.forEach((points, i) => {
    if (points.length < 3) return;
    const panelId = `ivoryScalePanel${String.fromCharCode(65 + i)}`;
    const edgeGeometry = slab(points, 0.255, 0.022, [], 5);
    projectUV(edgeGeometry);
    const edgeShell = addPart(panelGroup, `${panelId}Edge`, new THREE.Mesh(edgeGeometry, ivoryEdge), runtime, true);
    if (options.referenceTexture) edgeShell.visible = false;
    const faceGeometry = slab(points, 0.235, 0.012, [], 4);
    projectUV(faceGeometry);
    const face = addPart(panelGroup, panelId, new THREE.Mesh(faceGeometry, ivorySurface), runtime);
    face.position.z = 0.018;
  });

  const seamStrip = (x: number, id: string): void => {
    const top = traceY(MELEE_REFERENCE.handleTop, x) + 0.012;
    const bottom = traceY(MELEE_REFERENCE.handleBottom, x) - 0.012;
    const geometry = slab([[x - 0.014, top], [x + 0.014, top], [x + 0.014, bottom], [x - 0.014, bottom]], 0.248, 0.003);
    const seamMesh = addPart(panelGroup, id, new THREE.Mesh(geometry, seam), runtime, true);
    if (options.referenceTexture) seamMesh.visible = false;
  };
  seamStrip(seamX1, 'panelSeamA');
  seamStrip(seamX2, 'panelSeamB');

  const fastenerPixels: Array<[number, number]> = [
    [755, 279], [854, 333], [994, 344], [1180, 381], [1342, 395], [819, 414], [1293, 467],
  ];
  const fastenerPositions = fastenerPixels.map(([x, y]) => imagePoint(x, y));
  const fastenerBank = new THREE.InstancedMesh(pinHead(0.050, 0.025, 0.010), brass, fastenerPositions.length);
  fastenerBank.name = 'brassFastenerBank';
  fastenerBank.castShadow = true;
  fastenerBank.receiveShadow = true;
  fastenerBank.userData.explodeWithParent = true;
  const fastenerMatrix = new THREE.Matrix4();
  fastenerPositions.forEach(([x, y], i) => {
    fastenerMatrix.compose(new THREE.Vector3(x, y, FRONT_Z * 0.148), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    fastenerBank.setMatrixAt(i, fastenerMatrix);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 12), brassCrown);
    crown.name = `brassFastenerCrown${i + 1}`;
    crown.position.set(x, y, FRONT_Z * 0.176);
    crown.scale.z = 0.42;
    crown.castShadow = true;
    crown.receiveShadow = true;
    crown.userData.explodeWithParent = true;
    panelGroup.add(crown);
    runtime.nodes[crown.name] = crown;
    runtime.meshes.push(crown);
    if (options.referenceTexture) crown.visible = false;
  });
  fastenerBank.instanceMatrix.needsUpdate = true;
  if (options.referenceTexture) fastenerBank.visible = false;
  panelGroup.add(fastenerBank);
  runtime.nodes.fastenerBank = fastenerBank;
  runtime.meshes.push(fastenerBank);
  const medallionCenter = imagePoint(1091, 366);
  createMedallion(panelGroup, medallionCenter[0], medallionCenter[1], brass, materials.medallionInlay, runtime);
  if (options.referenceTexture && runtime.nodes.centralFlowerMedallion) runtime.nodes.centralFlowerMedallion.visible = false;

  const ringGroup = addGroup(asset, 'fingerRingAssembly', runtime);
  const ring = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], MELEE_REFERENCE.ring.r, MELEE_REFERENCE.ring.r - 0.034, 0.19, 0.010), ruby);
  addPart(ringGroup, 'fingerRing', ring, runtime, true);
  const ringInner = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], MELEE_REFERENCE.ringBore.r + 0.017, MELEE_REFERENCE.ringBore.r, 0.21, 0.003), rubyEdge);
  addPart(ringGroup, 'fingerRingInnerWall', ringInner, runtime, true);
  const ringHighlight = new THREE.Mesh(annulus(RING_CENTER[0], RING_CENTER[1], MELEE_REFERENCE.ring.r + 0.012, MELEE_REFERENCE.ring.r - 0.010, 0.022, 0.003), materials.glow);
  addPart(ringGroup, 'fingerRingRubyHighlight', ringHighlight, runtime, true);
  if (options.referenceTexture) {
    ring.visible = false;
    ringInner.visible = false;
    ringHighlight.visible = false;
  }

  // The source-derived handle contour already contains the true hooked lower groove. Keep a
  // named pivot marker for interaction without adding a detached tab that was absent in the photo.
  const grooveMarker = new THREE.Object3D();
  grooveMarker.name = 'lowerFingerGroove';
  grooveMarker.position.set(...imagePoint(1320, 520), 0);
  panelGroup.add(grooveMarker);
  runtime.nodes.lowerFingerGroove = grooveMarker;

  addSocket(asset, 'bladeBaseSocket', [0.24, 0.42], runtime);
  addSocket(asset, 'ringAxisSocket', RING_CENTER, runtime);
  addSocket(asset, 'scalePanelSocket', [1.23, 0.20], runtime);

  runtime.destructionGroups = {
    bladeAssembly: ['bladeBody', 'bladeBackPlate', 'cuttingEdgeRail', 'bladeHoleWalls'],
    redTangAssembly: ['redTang'],
    ivoryScaleAssembly: [
      'ivoryScalePanelA', 'ivoryScalePanelB', 'ivoryScalePanelC', 'panelSeamA', 'panelSeamB',
      'lowerFingerGroove', 'brassFastenerBank', 'centralFlowerMedallion',
    ],
    fingerRingAssembly: ['fingerRing', 'fingerRingInnerWall', 'fingerRingRubyHighlight'],
  };

  root.userData.reconstruction = {
    generatedWith: 'img2threejs skill · procedural karambit adapter',
    reference: 'guns image models/01-melee.png',
    route: options.referenceTexture ? 'reference-projection' : 'procedural-finish',
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
