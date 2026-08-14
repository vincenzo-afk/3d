# 01 Melee Karambit

This folder contains a code-only procedural Three.js reconstruction of `guns image models/01-melee.png`, authored with the img2threejs workflow.

The model is built from traced polygonal profiles, custom variable-thickness blade geometry, real through-holes, a real finger-ring annulus, three independent ivory scale panels, physical panel seams, instanced-style brass fastener geometry, and a radial flower medallion. The ruby finish, roughness variation, and normal variation are generated in independent material channels at runtime; no external mesh, texture pack, or runtime network request is used.

The broadside reference does not reveal the true stock thickness, hidden backside construction, exact alloy composition, or unseen wear. Those regions are explicitly recorded as inferred in the model runtime provenance. A second-pass browser review was used to refine the blade grind, serrations, scales, hardware, ring proportion, ruby field, and look-dev response toward the img2threejs showcase builder’s quality bar.

## Files

| File | Purpose |
|---|---|
| `create01MeleeKarambitModel.ts` | Procedural `THREE.Group` factory, look-dev lights, background, and runtime contract |
| `object-sculpt-spec.json` | Evidence-linked reconstruction specification and quality targets |
| `reference-assessment.md` | Intake observations and identity-critical detail inventory |
| `refinement-diagnosis.md` | Direct reference-versus-render review and second-pass quality decisions |
