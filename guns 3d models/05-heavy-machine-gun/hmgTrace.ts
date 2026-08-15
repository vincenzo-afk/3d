export type HmgLandmark = {
  id: string;
  x: number;
  y: number;
  note: string;
};

export const hmgReferenceTrace = {
  source: 'guns 3d models/05-heavy-machine-gun/reference-source.png',
  imageSize: { width: 1672, height: 941 },
  foregroundBounds: { x: 18, y: 244, width: 1534, height: 466 },
  normalizedForegroundBounds: { x: 0.011, y: 0.259, width: 0.918, height: 0.495 },
  worldBounds: { minX: -2.86, maxX: 2.86, minY: -1.02, maxY: 1.12 },
  landmarks: [
    { id: 'stock-buttpad', x: -2.78, y: 0.02, note: 'rear buttpad and lower stock support' },
    { id: 'stock-cheek', x: -2.20, y: 0.44, note: 'stock cheek plane and decorative coating' },
    { id: 'receiver-rear', x: -1.12, y: 0.38, note: 'rear receiver collar and top rail start' },
    { id: 'carry-handle', x: -0.62, y: 0.98, note: 'overhead carry handle grip' },
    { id: 'receiver-center', x: -0.28, y: 0.18, note: 'deep receiver side plate and action cavity' },
    { id: 'feed-belt', x: 0.48, y: -0.10, note: 'exposed brass cartridge run and dark belt links' },
    { id: 'ammo-box', x: 0.56, y: -0.72, note: 'hanging framed ammunition box' },
    { id: 'pistol-grip', x: -0.68, y: -0.58, note: 'angled grip and open trigger guard' },
    { id: 'handguard-rear', x: 0.75, y: 0.36, note: 'rear ventilated handguard and lower lug' },
    { id: 'handguard-front', x: 1.65, y: 0.36, note: 'front handguard collar and sight block' },
    { id: 'front-sight', x: 1.76, y: 0.82, note: 'front sight tower' },
    { id: 'bipod-hinge', x: 1.62, y: -0.15, note: 'central bipod hinge below handguard' },
    { id: 'muzzle-brake', x: 2.68, y: 0.23, note: 'slotted muzzle brake and bore crown' },
  ] as HmgLandmark[],
  macroRegions: [
    { id: 'stockGripAssembly', x: [-2.86, -0.62, -0.88, 0.60] as [number, number, number, number] },
    { id: 'receiverAssembly', x: [-1.28, -0.34, 0.60, 0.66] as [number, number, number, number] },
    { id: 'feedSystem', x: [0.22, -0.28, 0.78, 0.54] as [number, number, number, number] },
    { id: 'ammunitionBoxAssembly', x: [0.20, -1.00, 0.98, -0.22] as [number, number, number, number] },
    { id: 'controlAssembly', x: [-1.00, -0.78, -0.42, -0.18] as [number, number, number, number] },
    { id: 'handguardAssembly', x: [0.44, -0.30, 1.92, 0.56] as [number, number, number, number] },
    { id: 'barrelAssembly', x: [1.38, 0.04, 2.44, 0.44] as [number, number, number, number] },
    { id: 'muzzleAssembly', x: [2.35, 0.00, 2.86, 0.52] as [number, number, number, number] },
    { id: 'bipodAssembly', x: [1.28, -1.02, 2.08, -0.06] as [number, number, number, number] },
  ],
};

export const hmgProjectionCalibration = {
  mode: 'orthographic-front-projection',
  sourceAspect: 1672 / 941,
  framing: { center: [0.0, 0.04], halfHeight: 1.34, halfWidth: (1672 / 941) * 1.34 },
  note: 'Initial broadside calibration from the admitted source; adjust only after overlay review against the rendered silhouette.',
};
