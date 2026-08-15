export const ASSAULT_RIFLE_REFERENCE = {
  sourceImage: 'guns image models/02-assault-rifle.png',
  sourceSize: { width: 1672, height: 941 },
  boundsPx: { left: 18, top: 257, right: 1545, bottom: 666 },
  worldBounds: { width: 6.15, height: 1.72, depth: 0.72 },
  foregroundCoverage: 0.2536,
  camera: { projection: 'orthographic-broadside-plus-perspective-orbits', fovDegrees: 24, distance: 7.2, yawDegrees: 0, pitchDegrees: 0, rollDegrees: 0 },
  landmarksPx: {
    stockButtplate: [20, 388],
    stockBraceCutout: [170, 510],
    receiverRearPin: [464, 405],
    opticWindow: [628, 315],
    magazineFloorplate: [735, 642],
    foregripBase: [1012, 580],
    frontSight: [1298, 371],
    muzzleCrown: [1544, 388],
  },
  macroRegions: {
    stock: { x: 18, y: 372, width: 405, height: 286 },
    receiver: { x: 412, y: 340, width: 360, height: 300 },
    optic: { x: 555, y: 255, width: 245, height: 128 },
    magazine: { x: 640, y: 450, width: 170, height: 218 },
    handguard: { x: 760, y: 344, width: 545, height: 230 },
    foregrip: { x: 960, y: 470, width: 135, height: 190 },
    barrelMuzzle: { x: 1250, y: 336, width: 305, height: 155 },
  },
  silhouetteNotes: [
    'long horizontal AR-pattern silhouette',
    'skeleton collapsible stock with triangular negative space',
    'separate upper/lower receiver and curved magazine',
    'hooded holographic optic above receiver',
    'vented free-float handguard with repeated rail teeth',
    'vertical ribbed foregrip',
    'stepped barrel and slotted muzzle brake',
  ],
} as const;

export type AssaultRifleMacroId = keyof typeof ASSAULT_RIFLE_REFERENCE.macroRegions;
