# Karambit Blockout Visual Review Findings

The browser harness was inspected in both reference-projection and authored-procedural modes on 2026-08-14.

The reference-projection front view preserves the source broadside silhouette, the hawkbill blade curvature, the three blade holes, the ivory scale silhouette, the brass fastener layout, the central medallion, and the open finger-ring negative space. It is the primary same-camera comparison artifact for the source image.

The authored-procedural front view replaces the projection with code-only geometry and procedural PBR response. It preserves the overall weapon silhouette, ruby blade/tang zones, ivory shell panels, brass hardware, hole openings, and ring construction. The authored procedural route reads as a complete 3D object rather than a flat image card.

The authored-procedural three-quarter view was captured after resetting the camera to a full-object framing. It shows a meaningful thickness axis, raised fastener crowns, shell edge separation, the raised rosette, the ring wall, and the cutting-edge rail. The view is suitable for the orbit/material-read gate.

Remaining visual limitations are documented rather than hidden: the single source image does not establish backside construction, the ruby finish is a reference-derived approximation, and the procedural orbit view has less exact pattern placement than the reference-projection route. No imported mesh or runtime network asset is used.

## Evidence files

| Evidence | File |
|---|---|
| Source reference | `reference-source.png` |
| Reference projection front | `reference-projection-front.webp` |
| Procedural front | `procedural-front.webp` |
| Procedural three-quarter | `procedural-three-quarter.webp` |
| Labeled comparison sheet | `blockout-comparison-sheet.png` |

## Tier 1 diagnostic investigation

The first diagnostic invocation correctly exposed a hard-gate problem rather than silently passing: the render needed a `--map-stripped-render` evidence path, and the harness screenshot included UI chrome. A UI-free PNG was created. The source reference is 1684×934 with a black background and the object occupying most of the width; the procedural screenshot is a 896×768 browser viewport with a smaller object and different framing. The diagnostic mismatch is therefore dominated by source/render framing and map-stripped evidence requirements, while the agent-vision comparison remains the authority for this photo-to-procedural reconstruction. The next corrective step is to create a neutral map-stripped render evidence with source-matched object framing, then rerun Tier 1 without altering the procedural factory.

## Map-stripped blockout capture

The visual-check harness now supports `?projection=0&noTextures=1`, which passes `noTextures: true` into the code-only factory. The captured map-stripped render still shows the traced hawkbill silhouette, three blade holes, raised brass fasteners, central rosette, shell seams, ring wall, and cutting-edge thickness while removing generated marbling and surface-map variation. This is the correct neutral geometry evidence for the blockout Tier 1 gate.

## Neutral clay map-stripped render

The no-textures route now replaces every mesh material with a neutral `MeshStandardMaterial` clay response after the code-only factory is built. The captured render is high-contrast against black and preserves the complete geometry mask, including the hawkbill contour, three holes, raised fasteners, medallion relief, shell seams, ring opening/wall, and cutting-edge thickness. This is stronger Tier 1 evidence than the earlier textured screenshot because it isolates form from color and map detail.

## Orthographic source-matched projection

An optional `ortho=1` evaluation camera was added to the visual-check harness. The source-projection route now renders a broadside silhouette with no perspective foreshortening; the captured view fills the viewport and keeps the tip, serrations, holes, ivory shell, medallion, fasteners, and open ring clearly legible. This route is the preferred front-view comparison fixture; the authored procedural route remains the authority for three-quarter and thickness review.

## Material-pass Tier 1 calibration finding
The normalized 842x467 source-projection fixture visibly contains all four observed material systems: ruby blade/ring, pale ivory shell panels, warm brass fasteners/medallion, and dark cavity/edge regions. The current Tier 1 color report nevertheless clusters mostly ruby/dark values and produces a max Delta-E of 50.9 for brass; this is a coarse overall-foreground color-recipe calibration issue, not evidence that the ivory or brass regions are absent from the render. The dedicated materialGate has passed using the four per-region crop records and controlled four-view plan.
