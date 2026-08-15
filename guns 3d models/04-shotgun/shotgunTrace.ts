export type ShotgunLandmark = {
  id: string;
  x: number;
  y: number;
  note: string;
};

export const shotgunReferenceTrace = {
  source: 'guns 3d models/04-shotgun/reference-source.png',
  imageSize: { width: 1672, height: 941 },
  foregroundBounds: { x: 29, y: 317, width: 1506, height: 245 },
  normalizedForegroundBounds: { x: 0.017, y: 0.337, width: 0.899, height: 0.260 },
  worldBounds: { minX: -2.18, maxX: 2.18, minY: -0.72, maxY: 0.74 },
  landmarks: [
    { id: 'stock-butt', x: -2.12, y: -0.03, note: 'rubber buttpad and lower sling loop' },
    { id: 'stock-cheek', x: -1.22, y: 0.43, note: 'raised cheek and stock shoulder' },
    { id: 'receiver-front', x: -0.38, y: 0.45, note: 'rounded receiver to barrel transition' },
    { id: 'ejection-port', x: -0.22, y: 0.34, note: 'recessed side loading/ejection port' },
    { id: 'trigger-guard', x: -0.48, y: -0.30, note: 'open guard and curved trigger' },
    { id: 'pump-rear', x: 0.50, y: 0.20, note: 'rear edge of ribbed wood pump' },
    { id: 'pump-front', x: 1.22, y: 0.20, note: 'front edge of ribbed wood pump' },
    { id: 'front-band', x: 1.58, y: 0.25, note: 'dual-tube support band' },
    { id: 'front-sight', x: 1.90, y: 0.60, note: 'small raised sight post' },
    { id: 'muzzle-cap', x: 2.10, y: 0.13, note: 'stepped knurled muzzle and bore' },
  ] as ShotgunLandmark[],
  macroRegions: [
    { id: 'stockAssembly', x: [-2.18, -0.62, -0.72, 0.60] as [number, number, number, number] },
    { id: 'receiverActionAssembly', x: [-0.82, -0.62, 0.42, 0.62] as [number, number, number, number] },
    { id: 'triggerAssembly', x: [-0.70, -0.48, -0.18, -0.05] as [number, number, number, number] },
    { id: 'upperBarrelAssembly', x: [-0.40, 0.24, 2.00, 0.56] as [number, number, number, number] },
    { id: 'lowerMagazineTubeAssembly', x: [0.00, -0.02, 2.00, 0.24] as [number, number, number, number] },
    { id: 'pumpForeEndAssembly', x: [0.34, 0.02, 1.34, 0.42] as [number, number, number, number] },
    { id: 'frontBandAssembly', x: [1.46, 0.06, 1.70, 0.55] as [number, number, number, number] },
    { id: 'muzzleAssembly', x: [1.86, 0.00, 2.18, 0.68] as [number, number, number, number] },
  ],
};

export const shotgunProjectionCalibration = {
  mode: 'orthographic-front-projection',
  sourceAspect: 1672 / 941,
  framing: { center: [0.0, 0.0], halfHeight: 0.94, halfWidth: (1672 / 941) * 0.94 },
  note: 'Initial broadside calibration from the admitted source; adjust only after overlay review against the rendered silhouette.',
};
