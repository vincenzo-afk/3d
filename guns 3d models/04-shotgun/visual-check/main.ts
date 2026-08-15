import * as THREE from 'three';
import {
  create04ShotgunModel,
  createShotgunLookDevLights,
  makeShotgunBackground,
} from '../create04ShotgunModel';

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
if (!stage || !status) throw new Error('Shotgun review harness DOM is incomplete');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = diagnostic ? 1.82 : neutral ? 2.16 : studio ? 2.05 : 1.72;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = diagnostic || studio ? new THREE.Color(0xe9edf3) : neutral ? new THREE.Color(0x34485d) : makeShotgunBackground();
const lights = createShotgunLookDevLights();
const ambient = lights.children.find((child) => child instanceof THREE.AmbientLight) as THREE.AmbientLight | undefined;
if (ambient) ambient.intensity = diagnostic ? 1.08 : neutral ? 1.22 : studio ? 1.08 : 0.56;
scene.add(lights);

const root = create04ShotgunModel({ shadows: true, noTextures: diagnostic, disableIdle: staticFrame });
if (neutral || diagnostic) {
  const neutralColors: Record<string, string> = {
    '593526': '#8b684f',
    '6a3e28': '#9b6f50',
    '1e2730': '#70859a',
    '172028': '#61768a',
    '18212a': '#5e7488',
    '7f8e99': '#c1cfda',
    '3a4853': '#8fa3b1',
    '080a0c': '#1d2731',
    '020304': '#0b1219',
    '9aa6ad': '#d5e0e5',
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const physical = material as THREE.MeshPhysicalMaterial;
      physical.map = null;
      const current = physical.color.getHexString();
      physical.color.set(neutralColors[current] ?? '#8293a3');
      physical.emissive.set('#0a1118');
      physical.emissiveIntensity = 0.10;
    }
  });
}
scene.add(root);

const target = new THREE.Vector3(0.0, 0.03, 0);
const camera: THREE.Camera = projection
  ? new THREE.OrthographicCamera(-2.70 * aspect, 2.70 * aspect, 2.70, -2.70, 0.1, 60)
  : new THREE.PerspectiveCamera(33, aspect, 0.1, 60);
if (['front', 'reference', 'neutral', 'studio'].includes(view)) {
  camera.position.set(target.x, target.y, 9.4);
} else if (view === 'top') {
  camera.position.set(0.55, 7.4, 3.0);
} else if (view === 'side') {
  camera.position.set(7.4, 0.30, 0.35);
} else {
  camera.position.set(4.2, 3.2, 6.3);
}
camera.lookAt(target);
scene.add(camera);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ color: 0x101820, opacity: neutral || studio ? 0.20 : 0.30 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.82;
floor.receiveShadow = true;
if (diagnostic) floor.visible = false;
scene.add(floor);

status.textContent = `${view} · ${diagnostic ? 'tier1-diagnostic' : neutral ? 'neutral-light' : studio ? 'source-studio' : projection ? 'reference-projection' : 'procedural-orbit'} · ${root.userData.sculptRuntime?.selectableParts?.length ?? 0} meshes · shotgun`;
if (diagnostic) status.style.display = 'none';

const renderFrame = (elapsed: number): void => {
  if (!staticFrame && typeof root.userData.tick === 'function') root.userData.tick(1 / 60, elapsed / 1000);
  renderer.render(scene, camera);
};
if (staticFrame) renderFrame(0);
else renderer.setAnimationLoop(renderFrame);
