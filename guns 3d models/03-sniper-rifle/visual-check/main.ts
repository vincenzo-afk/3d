import * as THREE from 'three';
import {
  create03SniperRifleModel,
  createSniperRifleLookDevLights,
  makeSniperRifleBackground,
} from '../create03SniperRifleModel';

const params = new URLSearchParams(window.location.search);
const view = params.get('view') ?? (params.has('projection') ? 'front' : 'three-quarter');
const studio = params.has('studio') || view === 'studio';
const projection = params.has('projection') || params.has('ortho') || view === 'front' || view === 'neutral' || view === 'studio';
const staticFrame = params.has('static') || params.has('snapshot');
const neutral = params.has('neutral') || view === 'neutral';
const diagnostic = params.has('diagnostic');
const width = Math.max(720, window.innerWidth);
const height = Math.max(405, window.innerHeight);
const aspect = width / height;
const stage = document.querySelector<HTMLDivElement>('#stage');
const status = document.querySelector<HTMLDivElement>('#status');
const snapshot = document.querySelector<HTMLImageElement>('#snapshot');
if (!stage || !status || !snapshot) throw new Error('sniper harness DOM incomplete');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = diagnostic ? 1.82 : (neutral ? 2.28 : (studio ? 2.02 : 1.70));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = diagnostic ? new THREE.Color(0xe9edf3) : (neutral ? new THREE.Color(0x3a4b61) : (studio ? new THREE.Color(0xe9edf3) : makeSniperRifleBackground()));
const lights = createSniperRifleLookDevLights();
const ambient = lights.children.find((child) => child instanceof THREE.AmbientLight) as THREE.AmbientLight | undefined;
if (ambient) ambient.intensity = diagnostic ? 1.00 : (neutral ? 1.18 : (studio ? 1.02 : 0.54));
scene.add(lights);

const root = create03SniperRifleModel({ shadows: true, noTextures: diagnostic || params.has('noTextures'), disableIdle: staticFrame });
if (neutral || diagnostic) {
  const neutralColors: Record<string, string> = {
    '33455d': '#6d8198',
    '2854a7': '#4b7fdb',
    '384656': '#657384',
    '425d78': '#6d8198',
    '356bc7': '#4b7fdb',
    '46586b': '#657384',
    '02050b': '#1b2a3b',
    '2f82aa': '#4ca6cc',
    'b7c9dd': '#d5e0eb',
    '7892b0': '#a7bed4',
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : (mesh.material ? [mesh.material] : []);
    for (const candidate of materials) {
      const material = candidate as THREE.MeshStandardMaterial;
      if (!material.color) continue;
      const source = material.color.getHexString();
      material.map = null;
      material.color.set(neutralColors[source] ?? '#8192a6');
      material.needsUpdate = true;
    }
  });
}
root.position.set(0, 0, 0);
scene.add(root);

const target = new THREE.Vector3(0.28, 0.30, 0);
const camera: THREE.Camera = projection
  ? new THREE.OrthographicCamera(-3.72 * aspect, 3.72 * aspect, 3.72, -3.72, 0.1, 60)
  : new THREE.PerspectiveCamera(34, aspect, 0.1, 60);
if (view === 'front' || view === 'reference' || view === 'neutral' || view === 'studio') {
  camera.position.set(target.x, target.y, 9.4);
} else if (view === 'top') {
  camera.position.set(0.65, 7.8, 3.3);
} else if (view === 'side') {
  camera.position.set(8.4, 0.42, 0.65);
} else if (view === 'muzzle') {
  camera.position.set(5.0, 0.82, 4.8);
} else {
  camera.position.set(4.7, 2.4, 6.2);
}
camera.lookAt(target);
if (camera instanceof THREE.PerspectiveCamera) camera.updateProjectionMatrix();

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: neutral ? 0.27 : 0.36 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.28;
floor.receiveShadow = true;
if (diagnostic) floor.visible = false;
scene.add(floor);

  status.textContent = `${view} · ${diagnostic ? 'tier1-diagnostic' : (neutral ? 'neutral-light' : (studio ? 'source-studio' : (projection ? 'reference-projection' : 'procedural-orbit')))} · ${root.userData.sculptRuntime?.selectableParts?.length ?? 0} meshes · sniper-rifle`;
if (diagnostic) status.style.display = 'none';

const renderFrame = (elapsed: number): void => {
  if (!staticFrame && typeof root.userData.tick === 'function') root.userData.tick(1 / 60, elapsed / 1000);
  renderer.render(scene, camera);
};

renderFrame(0);
if (params.has('snapshot')) {
  requestAnimationFrame(() => {
    renderFrame(16);
    snapshot.src = renderer.domElement.toDataURL('image/png');
    snapshot.style.display = 'block';
    renderer.domElement.style.display = 'none';
    status.textContent += ' · snapshot-ready';
  });
} else {
  let last = performance.now();
  const loop = (now: number): void => {
    const dt = now - last;
    last = now;
    if (dt > 0) renderFrame(now);
    if (!staticFrame) requestAnimationFrame(loop);
  };
  if (!staticFrame) requestAnimationFrame(loop);
}
