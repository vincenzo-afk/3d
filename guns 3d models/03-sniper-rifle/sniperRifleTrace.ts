export type SniperRifleLandmark = {
  id: string;
  pixel: [number, number];
  normalized: [number, number];
  role: string;
};

export const sniperRifleReferenceTrace = {
  source: '03-sniper-rifle/reference-source.png',
  imageSize: [2560, 1440] as [number, number],
  foregroundBounds: { x: 8, y: 329, width: 2546, height: 286 },
  worldBounds: { xMin: -3.90, xMax: 4.55, yMin: -0.82, yMax: 1.16, depth: 0.82 },
  referenceCamera: { fovDegrees: 22, distance: 8.6, yawDegrees: 0, pitchDegrees: 0, rollDegrees: 0 },
  landmarks: [
    { id: 'stock-butt', pixel: [26, 494], normalized: [0.010, 0.343], role: 'rear silhouette termination' },
    { id: 'stock-cutout', pixel: [294, 536], normalized: [0.115, 0.372], role: 'large skeleton stock negative space' },
    { id: 'grip-trigger', pixel: [586, 503], normalized: [0.229, 0.349], role: 'grip and trigger opening' },
    { id: 'scope-eyepiece', pixel: [581, 375], normalized: [0.227, 0.260], role: 'scope rear ring and eyepiece' },
    { id: 'scope-turret', pixel: [794, 364], normalized: [0.310, 0.253], role: 'elevation turret center' },
    { id: 'scope-objective', pixel: [1192, 364], normalized: [0.466, 0.253], role: 'objective bell' },
    { id: 'bolt-knob', pixel: [645, 478], normalized: [0.252, 0.332], role: 'manual bolt handle' },
    { id: 'receiver-front', pixel: [1454, 454], normalized: [0.568, 0.315], role: 'receiver-to-barrel transition' },
    { id: 'under-action', pixel: [1465, 513], normalized: [0.572, 0.356], role: 'bright under-action support' },
    { id: 'barrel-root', pixel: [1492, 443], normalized: [0.583, 0.307], role: 'barrel root' },
    { id: 'muzzle-collar', pixel: [2390, 443], normalized: [0.934, 0.307], role: 'stepped muzzle collar' },
    { id: 'muzzle-bore', pixel: [2538, 444], normalized: [0.991, 0.308], role: 'front bore termination' },
  ] as SniperRifleLandmark[],
  macroRegions: {
    stock: { x: 0.00, y: 0.22, width: 0.27, height: 0.39 },
    receiverAction: { x: 0.25, y: 0.28, width: 0.34, height: 0.25 },
    optic: { x: 0.22, y: 0.20, width: 0.30, height: 0.20 },
    magazineTrigger: { x: 0.29, y: 0.33, width: 0.16, height: 0.20 },
    underAction: { x: 0.44, y: 0.34, width: 0.23, height: 0.17 },
    barrel: { x: 0.56, y: 0.28, width: 0.34, height: 0.15 },
    muzzle: { x: 0.90, y: 0.27, width: 0.10, height: 0.15 },
  },
} as const;

export const sniperRifleProjectionCalibration = {
  objectCenter: [0.28, 0.13, 0] as [number, number, number],
  orthographicFrustum: 2.12,
  cameraDistance: 8.6,
  target: [0.28, 0.13, 0] as [number, number, number],
  notes: 'Broadside source is nearly orthographic in appearance; use orthographic evaluation first and perspective orbit second.',
};
