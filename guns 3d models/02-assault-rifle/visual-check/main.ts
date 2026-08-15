import * as THREE from 'three';
import {
  create02AssaultRifleModel,
  createAssaultRifleLookDevLights,
  makeAssaultRifleBackground,
} from '../create02AssaultRifleModel';

const params = new URLSearchParams(window.location.search);
const view = params.get('view') ?? (params.has('projection') ? 'front' : 'three-quarter');
const projection = params.has('projection') || params.has('ortho') || view === 'front';
const staticFrame = params.has('static') || params.has('snapshot');
const neutral = params.has('neutral') || view === 'neutral';
const diagnostic = params.has('diagnostic');
const width = Math.max(640, window.innerWidth);
const height = Math.max(360, window.innerHeight);
const aspect = width / height;
const stage = document.querySelector<HTMLDivElement>('#stage');
const status = document.querySelector<HTMLDivElement>('#status');
const snapshot = document.querySelector<HTMLImageElement>('#snapshot');
if (!stage || !status || !snapshot) throw new Error('review harness DOM incomplete');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = diagnostic ? 1.52 : (neutral ? 1.52 : 1.42);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = diagnostic ? new THREE.Color(0xe9edf3) : (neutral ? new THREE.Color(0x101722) : makeAssaultRifleBackground());
const lights = createAssaultRifleLookDevLights();
const ambientLight = lights.children.find((child) => child instanceof THREE.AmbientLight) as THREE.AmbientLight | undefined;
if (ambientLight) ambientLight.intensity = diagnostic ? 0.72 : (neutral ? 0.58 : 0.46);
scene.add(lights);

const root = create02AssaultRifleModel({ shadows: true, noTextures: diagnostic || params.has('noTextures'), disableIdle: staticFrame });
root.position.set(-0.32, -0.02, 0);
scene.add(root);

const target = new THREE.Vector3(0.22, 0.12, 0);
const camera: THREE.Camera = projection
  ? new THREE.OrthographicCamera(-3.10 * aspect, 3.10 * aspect, 3.10, -3.10, 0.1, 50)
  : new THREE.PerspectiveCamera(34, aspect, 0.1, 50);
if (view === 'front' || view === 'reference' || view === 'neutral') {
  (camera as THREE.OrthographicCamera).position.set(target.x, target.y, 8.8);
} else if (view === 'top') {
  camera.position.set(0.6, 7.4, 3.0);
} else if (view === 'side') {
  camera.position.set(7.8, 0.32, 0.42);
} else if (view === 'muzzle') {
  camera.position.set(5.3, 0.65, 4.4);
} else {
  camera.position.set(4.7, 2.35, 5.8);
}
camera.lookAt(target);
if (camera instanceof THREE.PerspectiveCamera) camera.updateProjectionMatrix();

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 18),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.34 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.48;
floor.receiveShadow = true;
if (diagnostic) floor.visible = false;
scene.add(floor);

status.textContent = `${view} · ${diagnostic ? 'tier1-diagnostic' : (neutral ? 'neutral-light' : (projection ? 'reference-projection' : 'procedural-orbit'))} · ${root.userData.sculptRuntime?.meshes?.length ?? 0} meshes`;
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
