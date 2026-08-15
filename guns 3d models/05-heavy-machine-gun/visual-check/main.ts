import * as THREE from 'three';
import {
  create05HeavyMachineGunModel,
  createHeavyMachineGunLookDevLights,
  makeHeavyMachineGunBackground,
} from '../create05HeavyMachineGunModel';

const params = new URLSearchParams(window.location.search);
const view = params.get('view') ?? (params.has('projection') ? 'front' : 'three-quarter');
const studio = params.has('studio') || view === 'studio';
const neutral = params.has('neutral') || view === 'neutral';
const diagnostic = params.has('diagnostic');
const projection = params.has('projection') || params.has('ortho') || ['front', 'reference', 'neutral', 'studio'].includes(view);
const staticFrame = params.has('static') || params.has('snapshot');
const width = Math.max(720, window.innerWidth);
const height = Math.max(405, window.innerHeight);
const aspect = width / height;
const stage = document.querySelector<HTMLDivElement>('#stage');
const status = document.querySelector<HTMLDivElement>('#status');
if (!stage || !status) throw new Error('Heavy machine gun review harness DOM is incomplete');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = diagnostic ? 1.86 : neutral ? 2.16 : studio ? 2.28 : 1.78;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = diagnostic || studio ? new THREE.Color(0xeee9e2) : neutral ? new THREE.Color(0x304658) : makeHeavyMachineGunBackground();
const lights = createHeavyMachineGunLookDevLights();
scene.add(lights);

const root = create05HeavyMachineGunModel({ shadows: true, noTextures: diagnostic, disableIdle: staticFrame });
if (neutral || diagnostic) {
  const neutralColors: Record<string, string> = {
    '182635': '#65798b',
    '0b1827': '#526778',
    '121d25': '#4c5b66',
    'b17b36': '#b8a27d',
    '40505b': '#7b8992',
    '2b3a45': '#71818b',
    '4a5e6b': '#95a6b0',
    '020406': '#111820',
    '0b2030': '#637986',
    '1d5fa6': '#7d9eb8',
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materialList) {
      const physical = material as THREE.MeshPhysicalMaterial;
      physical.map = null;
      physical.color.set(neutralColors[physical.color.getHexString()] ?? '#8293a3');
      physical.emissive.set('#0a1118');
      physical.emissiveIntensity = 0.08;
    }
  });
} else if (studio) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materialList) {
      const physical = material as THREE.MeshPhysicalMaterial;
      physical.color.multiplyScalar(1.18);
      physical.emissiveIntensity = Math.max(physical.emissiveIntensity, 0.12);
      physical.roughness = Math.max(0.16, physical.roughness - 0.035);
    }
  });
}
scene.add(root);

const target = new THREE.Vector3(0.0, 0.06, 0);
const camera: THREE.Camera = projection
  ? new THREE.OrthographicCamera(-3.18 * aspect, 3.18 * aspect, 3.18, -3.18, 0.1, 80)
  : new THREE.PerspectiveCamera(34, aspect, 0.1, 80);
if (['front', 'reference', 'neutral', 'studio'].includes(view)) {
  camera.position.set(target.x, target.y, 10.6);
} else if (view === 'top') {
  camera.position.set(0.40, 8.4, 2.5);
} else if (view === 'side') {
  camera.position.set(8.4, 0.28, 0.40);
} else if (view === 'rear') {
  camera.position.set(-7.3, 2.1, -5.7);
} else {
  camera.position.set(4.8, 3.35, 7.0);
}
camera.lookAt(target);
scene.add(camera);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.ShadowMaterial({ color: 0x0b1520, opacity: neutral || studio ? 0.20 : 0.30 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.10;
floor.receiveShadow = true;
if (diagnostic) floor.visible = false;
scene.add(floor);

status.textContent = `${view} · ${diagnostic ? 'tier1-diagnostic' : neutral ? 'neutral-light' : studio ? 'source-studio' : projection ? 'reference-projection' : 'procedural-orbit'} · ${root.userData.sculptRuntime?.selectableParts?.length ?? 0} named parts · heavy machine gun`;
if (diagnostic) status.style.display = 'none';

const renderFrame = (elapsed: number): void => {
  if (!staticFrame && typeof root.userData.tick === 'function') root.userData.tick(1 / 60, elapsed / 1000);
  renderer.render(scene, camera);
};
if (staticFrame) renderFrame(0);
else renderer.setAnimationLoop(renderFrame);
