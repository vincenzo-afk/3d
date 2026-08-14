# 01-melee Reference Assessment

## Input

Reference: `guns image models/01-melee.png`
Dimensions: 1684 × 934 PNG, approximately 720 KB.
Background: near-black/transparent-looking black field with a single broadside melee knife centered horizontally.

## Visual observations

The subject is a curved karambit-style melee knife presented broadside with the tip at the far left and the finger ring at the far right. The blade and ring use a saturated translucent-looking ruby-red finish with darker marbled veins, bright edge accents, and a darker inner red face. The upper blade spine has five prominent sawteeth/serrations that rise toward the upper-left-to-center transition. Three circular through-holes are visible in the red blade near the upper shoulder, increasing in size toward the right. The cutting edge follows a long concave/curving lower arc from the left tip into the handle transition.

The handle is a continuous pale ivory/white scale assembly over a red tang/backbone. It begins at the blade shoulder with a broad curved bolster-like transition, narrows through the grip, and terminates in a downward-curved finger groove and a circular finger ring. The pale scale has two visible seam/boundary lines dividing it into three broad panels. Multiple small circular gold/brass fasteners are visible across the panels, plus a central circular medallion with a radial flower/spoke design. The underside has a red accent strip visible beneath the ivory scale, and the ring is a real open annulus with a red rim.

The reference is almost pure side elevation: depth, thickness, bevel widths, and hidden/back surfaces are not directly observed. The reconstruction must flag these as inferred and should use a fixed camera for comparison plus a slow real-axis idle rotation so the ruby finish and thickness can be inspected without claiming unseen fidelity.

## Identity-critical detail inventory

| ID | Kind | Affects | Concrete mapping |
|---|---|---|---|
| curved-blade-silhouette | contour/geometry | geometry | traced blade outline component |
| five-spine-serrations | ridge/geometry | geometry | five real triangular/rounded tooth features on blade spine |
| three-blade-holes | hole/geometry | geometry | three real through-holes with inner walls |
| ruby-marbled-blade | decal/material | material | de-lit/reference-derived or procedural bounded ruby finish on blade broad faces |
| pale-ivory-scale-panels | material/geometry | both | three separate scale panels or one shell with explicit panel seams |
| scale-panel-seams | seam/linework | geometry/material | two physical seam strips/gaps at measured panel boundaries |
| brass-fasteners | fastener/geometry | geometry | instanced or explicit domed brass heads at visible measured positions |
| central-flower-medallion | relief/geometry | both | annulus, inlay, radial spokes, central hub |
| curved-finger-groove | contour/geometry | geometry | lower handle contour with real concave notch |
| open-finger-ring | hole/geometry | geometry | true annulus/opening at handle end |
| red-underlay-spine | material/geometry | both | red tang/underlay visible beneath ivory scale and around ring |
| wear-and-scratches | scratch/stain | material | subtle bounded roughness/color variation, not baked lighting |

## Intended implementation

Use a traced broadside polygon for the blade/tang/ring silhouette. Build the blade as a custom variable-thickness loft with an analytic grind field rather than a constant-thickness plate. Build the ring as a real annulus with inner walls. Use three scale panels as watertight extruded shells with small bevels and a shared measured seam/overlap arrangement. Use instanced brass fasteners and separate medallion parts. Use a front reference-projection texture only if a de-lit crop is created; otherwise author a bounded procedural ruby marbling texture with independent roughness and normal variation, keeping all geometry real.

Runtime should expose `bladeBody`, `redTang`, `scaleFrontPanelA`, `scaleFrontPanelB`, `scaleFrontPanelC`, `ring`, fastener/medallion groups, named sockets for blade base and ring axis, colliders, destruction groups, provenance, and an idle rotation around the ring axis. Because only a broadside view is supplied, report thickness and hidden-side details as inferred with low confidence.

## First browser-render review

The first controlled render is readable and structurally coherent: the curved red blade, five raised spine teeth, three real holes, pale handle shell, central medallion, and open finger ring are all visible. The broadside silhouette reads as a karambit. The current render is still an approximation: the ivory handle appears flatter and more rectangular than the source, the ring is visually dominant, the lower finger groove is too block-like, and the ruby marbling is subtle at the current camera distance. Thickness and rear-side behavior remain unverified until the orbit captures are reviewed.

## Three-quarter browser-render review

The three-quarter capture proves the asset is a real solid: the blade and scale slabs show thickness, the three holes expose inner walls, the medallion and fasteners sit above the panel, and the red tang is visibly separate below the ivory scales. The main refinement issue is now clear: the current model is too close to a broadside plate at large scale because the panel edges are too straight and the lower finger-groove insert reads as a separate rectangular tab. The source’s handle should be more organically curved and integrated, while the reference’s red finish has stronger marbled breakup than the current procedural field at the medium shot. These are visual-quality limitations, not missing runtime structure.

## Refined three-quarter review

The refined render keeps the geometry structurally sound. The custom blade loft shows real edge thickness and inner hole walls, the scale panels are no longer perfectly rectangular, the panel seams are readable, and the medallion remains attached. The main remaining visual mismatch is finish character: the generated ruby map is visibly directional/striped rather than the irregular marbled breakup of the reference. The handle is closer but still intentionally stylized because the source is a single broadside plate. No further geometry blocker was found in this pass.
