import * as THREE from 'three';

/**
 * melee-01: Combat Knife 3D Model
 * Highly detailed procedural Three.js melee weapon
 * Generated with Codebuff 🤖
 */

export interface Melee01Options {
  bladeColor?: THREE.ColorRepresentation;
  handleColor?: THREE.ColorRepresentation;
  guardColor?: THREE.ColorReference;
  serrationColor?: THREE.ColorRepresentation;
}

export function createMelee01Model(options: Melee01Options = {}): THREE.Group {
  const {
    bladeColor = 0x4a4a4a,
    handleColor = 0x1a1a1a,
    guardColor = 0x2d2d2d,
    serrationColor = 0x3d3d3d,
  } = options;

  const group = new THREE.Group();
  group.name = 'melee-01-combat-knife';

  // ==========================================
  // BLADE - Clip point tactical blade
  // ==========================================
  
  // Main blade profile using LatheGeometry for accurate cross-section
  const bladeShape = new THREE.Shape();
  
  // Clip point blade profile (viewed from side)
  bladeShape.moveTo(0, 0); // Start at guard
  bladeShape.lineTo(0.018, 0); // Slight taper from guard
  
  // Belly curve (cutting edge curves outward)
  bladeShape.quadraticCurveTo(0.025, 0.3, 0.028, 0.8);
  bladeShape.quadraticCurveTo(0.03, 1.2, 0.025, 1.6);
  
  // Clip point (concave grind near tip)
  bladeShape.quadraticCurveTo(0.02, 1.8, 0.012, 2.0);
  bladeShape.quadraticCurveTo(0.008, 2.1, 0.003, 2.15);
  
  // Spine (top edge - straight or slightly curved)
  bladeShape.lineTo(-0.003, 2.15);
  bladeShape.quadraticCurveTo(-0.005, 2.0, -0.008, 1.8);
  bladeShape.quadraticCurveTo(-0.012, 1.4, -0.015, 0.8);
  bladeShape.quadraticCurveTo(-0.018, 0.3, -0.018, 0);
  
  bladeShape.lineTo(0, 0);

  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 4,
  });

  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: bladeColor,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
  });

  const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
  blade.name = 'blade';
  blade.castShadow = true;
  blade.receiveShadow = true;
  blade.position.set(0, 0, -0.0225);
  blade.rotation.x = Math.PI / 2;
  group.add(blade);

  // ==========================================
  // SERRATIONS - On the spine near the handle
  // ==========================================
  const serrationsGroup = new THREE.Group();
  serrationsGroup.name = 'serrations';
  
  const serrationMaterial = new THREE.MeshStandardMaterial({
    color: serrationColor,
    metalness: 0.9,
    roughness: 0.2,
  });

  // Create individual serration teeth
  for (let i = 0; i < 8; i++) {
    const toothGeometry = new THREE.ConeGeometry(0.006, 0.015, 4);
    const tooth = new THREE.Mesh(toothGeometry, serrationMaterial);
    tooth.name = `serration-tooth-${i}`;
    tooth.position.set(
      0,
      0.15 + i * 0.06,
      0
    );
    tooth.rotation.z = Math.PI / 2;
    tooth.castShadow = true;
    serrationsGroup.add(tooth);
  }
  
  serrationsGroup.position.set(-0.015, 0, 0);
  group.add(serrationsGroup);

  // ==========================================
  // GUARD - Crossguard with finger groove
  // ==========================================
  const guardGroup = new THREE.Group();
  guardGroup.name = 'guard';

  // Main guard body
  const guardGeometry = new THREE.BoxGeometry(0.16, 0.025, 0.07);
  const guardMaterial = new THREE.MeshStandardMaterial({
    color: guardColor,
    metalness: 0.7,
    roughness: 0.35,
  });

  const guardBody = new THREE.Mesh(guardGeometry, guardMaterial);
  guardBody.name = 'guard-body';
  guardBody.castShadow = true;
  guardBody.receiveShadow = true;
  guardGroup.add(guardBody);

  // Guard quillons (curved ends)
  const quillonGeometry = new THREE.TorusGeometry(0.015, 0.005, 6, 8, Math.PI);
  const quillonMaterial = new THREE.MeshStandardMaterial({
    color: guardColor,
    metalness: 0.75,
    roughness: 0.3,
  });

  // Left quillon
  const leftQuillon = new THREE.Mesh(quillonGeometry, quillonMaterial);
  leftQuillon.name = 'quillon-left';
  leftQuillon.position.set(-0.08, 0, 0);
  leftQuillon.rotation.y = Math.PI / 2;
  leftQuillon.castShadow = true;
  guardGroup.add(leftQuillon);

  // Right quillon
  const rightQuillon = new THREE.Mesh(quillonGeometry, quillonMaterial);
  rightQuillon.name = 'quillon-right';
  rightQuillon.position.set(0.08, 0, 0);
  rightQuillon.rotation.y = -Math.PI / 2;
  rightQuillon.castShadow = true;
  guardGroup.add(rightQuillon);

  guardGroup.position.set(0, 0, 0);
  group.add(guardGroup);

  // ==========================================
  // HANDLE - Wrapped cord/leather grip
  // ==========================================
  const handleGroup = new THREE.Group();
  handleGroup.name = 'handle';

  // Core handle shape
  const handleShape = new THREE.Shape();
  handleShape.moveTo(0, 0);
  handleShape.lineTo(0.032, 0);
  handleShape.quadraticCurveTo(0.035, 0.1, 0.034, 0.2);
  handleShape.quadraticCurveTo(0.033, 0.3, 0.03, 0.35);
  handleShape.lineTo(-0.03, 0.35);
  handleShape.quadraticCurveTo(-0.033, 0.3, -0.034, 0.2);
  handleShape.quadraticCurveTo(-0.035, 0.1, -0.032, 0);
  handleShape.lineTo(0, 0);

  const handleGeometry = new THREE.ExtrudeGeometry(handleShape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 3,
  });

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: handleColor,
    metalness: 0.05,
    roughness: 0.85,
  });

  const handleCore = new THREE.Mesh(handleGeometry, handleMaterial);
  handleCore.name = 'handle-core';
  handleCore.castShadow = true;
  handleCore.receiveShadow = true;
  handleCore.position.set(0, 0, -0.2);
  handleCore.rotation.x = Math.PI / 2;
  handleGroup.add(handleCore);

  // Handle wrap pattern (cord wrapping)
  const wrapMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.0,
    roughness: 0.95,
  });

  // Create wrap rings with diamond pattern
  for (let i = 0; i < 12; i++) {
    const wrapGeometry = new THREE.TorusGeometry(0.033, 0.004, 4, 8);
    const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
    wrap.name = `wrap-ring-${i}`;
    wrap.position.set(0, 0, 0.02 + i * 0.03);
    wrap.rotation.x = Math.PI / 2;
    wrap.castShadow = true;
    handleGroup.add(wrap);
  }

  // Diamond wrap pattern
  for (let i = 0; i < 11; i++) {
    const diamondGeometry = new THREE.OctahedronGeometry(0.006, 0);
    const diamond = new THREE.Mesh(diamondGeometry, wrapMaterial);
    diamond.name = `wrap-diamond-${i}`;
    diamond.position.set(0.025, 0, 0.035 + i * 0.03);
    diamond.rotation.x = Math.PI / 2;
    diamond.castShadow = true;
    handleGroup.add(diamond);
  }

  handleGroup.position.set(0, 0, 0);
  group.add(handleGroup);

  // ==========================================
  // POMMEL - Hexagonal or round pommel
  // ==========================================
  const pommelGroup = new THREE.Group();
  pommelGroup.name = 'pommel';

  // Main pommel body
  const pommelGeometry = new THREE.CylinderGeometry(0.025, 0.028, 0.04, 6);
  const pommelMaterial = new THREE.MeshStandardMaterial({
    color: guardColor,
    metalness: 0.65,
    roughness: 0.4,
  });

  const pommelBody = new THREE.Mesh(pommelGeometry, pommelMaterial);
  pommelBody.name = 'pommel-body';
  pommelBody.castShadow = true;
  pommelBody.receiveShadow = true;
  pommelBody.rotation.x = Math.PI / 2;
  pommelGroup.add(pommelBody);

  // Pommel strike face
  const strikeGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.01, 6);
  const strikeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.3,
  });

  const strikeFace = new THREE.Mesh(strikeGeometry, strikeMaterial);
  strikeFace.name = 'pommel-strike-face';
  strikeFace.position.set(0, 0, 0.025);
  strikeFace.rotation.x = Math.PI / 2;
  strikeFace.castShadow = true;
  pommelGroup.add(strikeFace);

  // Lanyard hole
  const lanyardGeometry = new THREE.TorusGeometry(0.008, 0.002, 4, 8);
  const lanyardMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    metalness: 0.7,
    roughness: 0.4,
  });

  const lanyardHole = new THREE.Mesh(lanyardGeometry, lanyardMaterial);
  lanyardHole.name = 'lanyard-hole';
  lanyardHole.position.set(0, 0, 0.02);
  lanyardHole.rotation.y = Math.PI / 2;
  lanyardHole.castShadow = true;
  pommelGroup.add(lanyardHole);

  pommelGroup.position.set(0, 0, 0.42);
  group.add(pommelGroup);

  // ==========================================
  // FULLERS (Blood Grooves) - On blade
  // ==========================================
  const fullerMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    metalness: 0.9,
    roughness: 0.15,
  });

  // Left fuller
  const leftFullerGeometry = new THREE.BoxGeometry(0.003, 1.2, 0.008);
  const leftFuller = new THREE.Mesh(leftFullerGeometry, fullerMaterial);
  leftFuller.name = 'fuller-left';
  leftFuller.position.set(-0.008, 0.9, 0);
  leftFuller.castShadow = true;
  group.add(leftFuller);

  // Right fuller
  const rightFuller = new THREE.Mesh(leftFullerGeometry, fullerMaterial);
  rightFuller.name = 'fuller-right';
  rightFuller.position.set(0.008, 0.9, 0);
  rightFuller.castShadow = true;
  group.add(rightFuller);

  // ==========================================
  // RUNTIME DATA - Animation & Physics
  // ==========================================
  group.userData.sculptRuntime = {
    nodes: {
      blade: blade.id,
      guard: guardBody.id,
      handle: handleCore.id,
      pommel: pommelBody.id,
      serrations: serrationsGroup.id,
    },
    sockets: {
      bladeTip: {
        position: new THREE.Vector3(0, 0, -2.15),
        normal: new THREE.Vector3(0, 0, -1),
      },
      bladeBase: {
        position: new THREE.Vector3(0, 0, 0),
        normal: new THREE.Vector3(0, 0, 1),
      },
      handleGrip: {
        position: new THREE.Vector3(0, 0, 0.2),
        normal: new THREE.Vector3(0, 0, 1),
      },
      pommelEnd: {
        position: new THREE.Vector3(0, 0, 0.45),
        normal: new THREE.Vector3(0, 0, 1),
      },
      lanyard: {
        position: new THREE.Vector3(0, 0, 0.44),
        normal: new THREE.Vector3(0, 0, 1),
      },
    },
    colliders: [
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(0, 0, 2.15),
        radius: 0.02,
      },
      {
        type: 'box',
        center: new THREE.Vector3(0, 0, 0.2),
        size: new THREE.Vector3(0.07, 0.07, 0.4),
      },
    ],
    tick: (time: number) => {
      // Subtle idle sway
      blade.rotation.z = Math.sin(time * 1.5) * 0.015;
      blade.rotation.y = Math.cos(time * 2) * 0.01;
    },
    destruction: {
      groups: [
        {
          name: 'blade',
          meshes: [blade.id],
          breakForce: 50,
        },
        {
          name: 'handle',
          meshes: [handleCore.id],
          breakForce: 30,
        },
      ],
    },
  };

  return group;
}

// Export for module usage
export default createMelee01Model;
