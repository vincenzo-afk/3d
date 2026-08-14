# Karambit Refinement Diagnosis

## Direct visual comparison

The reference is a long, shallow, organically curved karambit. The red blade has a smooth sweeping upper arc, a strongly concave lower cutting edge, five smaller irregular serrations, three dark holes with clean openings, and visible irregular red marbling. The ivory handle wraps over the red tang with three curved scale panels. The panels taper and follow the handle contour, their seam lines are narrow and integrated, and the lower edge has a single clean hooked finger groove. The finger ring is open, slightly smaller relative to the handle, and integrated into the red rear tang. The reference includes a larger number of brass fasteners distributed across the panels and a more legible floral medallion.

The current render has the right high-level object identity and several real geometric features, but it is visibly under-detailed relative to the showcase target. The blade broadside is too visually flat and its finish reads as diagonal stripes rather than irregular marbled coated metal. The serrations are too large and regular. The ivory handle reads as three angular hanging plates rather than shaped, edge-following scales. The lower groove is too detached/tab-like. The ring is oversized and visually dominates the pommel. Fastener density is lower than the reference, with several reference fasteners missing. The medallion is too dark and simplified. The camera/scale staging also leaves more empty background than the reference and makes the object feel smaller.

## Refinement priorities

| Priority | Change | Reason |
|---|---|---|
| 1 | Replace the blade profile with a denser traced outline and smaller irregular serrations | Silhouette and identity are the strongest reference signal |
| 2 | Build the ivory scales as curved, overlapping shells with a continuous hooked lower contour | Current plates are visibly too angular and disconnected |
| 3 | Reduce ring outer radius slightly and integrate the ring transition into a shaped red pommel/tang | Reference ring is a component of the handle, not a dominant separate disc |
| 4 | Add the reference’s visible brass hardware positions and make the medallion a true ring/inlay/spoke assembly | Detail density and material hierarchy are currently below showcase examples |
| 5 | Replace directional stripe texture with low-frequency irregular marbling plus fine wear and independent roughness/normal | Current albedo pattern is the most obvious material mismatch |
| 6 | Add real chamfer/edge strips and shallow engraved/recessed panel accents | Showcase-quality models remain readable in three-quarter and grazing light |
| 7 | Reframe the evaluation camera closer to the source’s subject occupancy | Reference match should not be weakened by excess empty background |

## Showcase-level comparison

The mature showcase factories use custom lofts and measured outlines, real openings, detailed hardware, independent PBR channels, named physical modules, and review-oriented cameras. The current factory already has the beginnings of that contract, but the next pass must increase geometry density and material specificity rather than only adding metadata.

## Second-pass browser review

The second pass is materially better: the blade now has a smoother variable-thickness loft, a readable silver-like cutting rail, irregular multi-frequency red surface breakup, smaller serrations, and stronger depth in the holes. The handle contour and ring proportion are closer to the source, and the medallion reads more clearly.

A new issue is visible in the close three-quarter view: the instanced fastener bank reads as pale grey discs instead of warm brass. This is likely a material/lighting response issue, not a missing geometry issue. The source reference expects warm gold fasteners with small domed highlights. The final pass should make the brass more diffuse and visibly warm, and ensure the fastener heads sit slightly proud of the ivory scale. The current close-up also reveals that the blade material has large abstract dark patches; the irregularity is better than stripes but should be softened toward finer marbling rather than broad blotches.

## Final material-state check

The live runtime confirms the fastener bank is present with eight instances and the intended warm brass material (`#d39b32`, metalness 0.54, roughness 0.34). The remaining pale appearance is caused by the current look-dev/tone-mapping response rather than missing geometry or incorrect material assignment. The browser front render now has finer red breakup than the first pass, although the single broadside source still limits exact hidden-side and microdetail claims.

## Final visual gate

The final front view retains the reference identity and now has stronger surface breakup, a more measured blade sweep, a silver-like cutting rail, smaller serrations, integrated curved scales, a proportionally reduced ring, a denser fastener layout, and a more legible flower medallion. The final three-quarter view confirms real blade loft thickness, inner hole walls, raised scale/fastener/medallion relief, and a separate red tang underlay. The code and render are now substantially closer to the showcase builder’s standard than the original first pass.

Remaining limitations are explicitly accepted as single-image inference: hidden/back-side construction, exact PBR chemistry, and the precise unseen grind profile cannot be proven from the supplied broadside image. The model is intentionally a high-quality procedural reconstruction, not a claim of photogrammetric recovery.
