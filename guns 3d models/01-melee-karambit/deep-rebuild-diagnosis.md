# Deep Rebuild Diagnosis

## Why the current result still fails the target

The current render is recognizable but it does not look like the reference object at the showcase builder’s quality level. The failure is not primarily missing metadata; it is visible image fidelity and construction fidelity.

| Failure | Evidence in current render | Required correction |
|---|---|---|
| Reference composition mismatch | The reference fills the frame with a long shallow object on a near-black field; current render has excessive empty space and a dark burgundy stage gradient | Use a reference-sized camera and a black evaluation background for the comparison view |
| Blade silhouette mismatch | Current blade has a broad triangular upper mass and tall, evenly spaced spikes; reference has a smooth lower/upper sweep with five small, irregular teeth | Re-trace the blade in image-normalized coordinates and use the traced outline directly, not a hand-fitted approximation |
| Blade surface mismatch | Current red finish has large graphic patches and the blade looks like a translucent red plate; reference has dark ruby marbling, localized wear, and more believable steel edge behavior | Use the reference pixels as a front finish plate or create a tightly controlled de-lit reference crop; reserve procedural maps for roughness/normal and unseen surfaces |
| Hole treatment mismatch | Current holes have heavy dark annuli and read like thick cylinders; reference holes are clean dark openings integrated into the red blade | Remove oversized decorative rings and let the traced loft/hole walls carry the opening with a restrained dark interior |
| Handle silhouette mismatch | Current ivory scales are three hanging polygon slabs with repeated downward points; reference is a continuous contoured handle with one main hooked lower groove and curved ends | Build the handle from a traced outer contour split by two seam curves, not three independently guessed polygons |
| Fastener material mismatch | Fasteners still read as pale circles in close view, not small warm domed brass heads | Use a gold/brass material tuned for the evaluation rig and dome geometry with a darker base/bright crown response |
| Medallion mismatch | Current medallion is a black disk with a simple sun; reference is a smaller brass-on-ivory engraved rosette | Make the rosette smaller, less black, and composed of shallow brass ring, neutral inset, and petal relief |
| Ring transition mismatch | Current ring is a large red disc attached to a thin tang; reference ring is integrated into a thicker curved pommel with a clean bore | Use one coherent pommel/tang contour with a ring hole, plus a restrained inner wall and outer rim |
| Three-quarter construction mismatch | Current scale shells and blade still read as flat cutouts with generic thickness; reference quality implies controlled bevels, face normals, and material separation | Add measured front/back shells, chamfer bands, material groups, and a calmer look-dev rig |

## Rebuild decision

The next pass should not be another local patch. It should replace the hand-fitted broadside coordinates with a reference-normalized traced model layout and separate **evaluation route** from **orbit route**. The evaluation route should maximize the supplied image match from the exact source camera; the orbit route should expose inferred thickness with understated materials rather than allowing exaggerated graphic geometry to dominate.

The model remains code-only in the sense that no external mesh is loaded. A local reference-derived image plate is acceptable for the visible broadside finish under the img2threejs reference-projection route, while the model’s geometry, roughness, normal, wear, and hidden surfaces remain authored in code. This is the central change required to move from a stylized approximation toward the showcase builder’s actual output quality.

## Source-derived contour check

The corrected connected-component mask now cleanly captures the complete visible ivory scale assembly: the curved upper handle edge, vertical seam, lower hook/choil, six visible fastener openings, and the circular medallion opening. The initial mask was wrong because its fallback seed landed on a separate right-side component; the verified seed at a pale central scale pixel fixed that segmentation. The deep rebuild will use the source-derived outline as its evaluation silhouette instead of the prior hand-fitted panel polygons.

## Deep-rebuild render check

The source-derived silhouette is structurally much closer to the reference, but the first projection render is not acceptable: the visible broadside handle is rendered nearly black instead of ivory, and the ring area receives the wrong source colors. This shows that a single full-crop texture assigned to both ruby and ivory materials is not a valid projection route. The reference itself clearly shows a bright ivory continuous handle, dark-gold seams, warm brass fasteners/rosette, deep ruby blade/tang/ring, and a black background. The next pass must use region-specific source crops or region-aware UV/material assignment rather than one global texture shared by all parts.

The three-quarter view confirms that the new traced geometry has a coherent continuous handle contour and real thickness, but the projection failure dominates the visual result and must be fixed before acceptance.

## Corrected clean broadside result

After correcting the inverse pixel-to-world UV transform, flipping the final Three.js V convention, disabling idle rotation for evaluation, and hiding duplicate procedural overlays, the broadside render now matches the source composition substantially better: ruby blade/tang/ring, bright ivory handle, gold fasteners, seams, medallion, three openings, and black background are all in the correct regions. This is the first deep-rebuild render that is visually useful for direct source comparison.

This evaluation route must not be mistaken for the complete 3D acceptance gate. The next check is the default procedural route without a reference texture, which must show real thickness, clean back surfaces, physical hole walls, and coherent ring/handle construction instead of relying on the source projection.

## Procedural three-quarter construction review

The traced shell is now coherent and the overall hook/silhouette is much closer, but the close procedural three-quarter view still falls below the target. The ivory scales read as a single smooth untextured shell with flat circular gray fasteners, the medallion remains an oversized black disk with a simple radial insert, and the red ring/tang region still reads as a broad plate rather than a carefully layered pommel. The model has thickness and a real lower contour, but the face/bevel/material breakup is too quiet to communicate a premium machined object.

The next rebuild pass should add explicit scale face/edge separation, warm domed brass heads with darker collars, a smaller engraved medallion, a layered pommel bridge around the real bore, and stronger but finer ivory/ruby surface-frequency response. The reference-projection broadside should remain as the evaluation route; the procedural three-quarter route must carry the detailed 3D quality itself.

## Updated physical-detail review

The raised edge shells and smaller medallion improved the assembly hierarchy, and the close view now shows a clearer scale edge, handle hook, blade thickness, and six-spoke medallion. However, the fastener heads still render gray because their current geometry/material response is not producing warm brass highlights; the red surface remains too uniform at this scale; and the ring/pommel is still a large red disk with concentric overlays rather than a shaped, layered ring transition. The next corrective group must be hardware material/orientation, ruby map contrast, and pommel geometry—not another silhouette edit.

## Improved material and hardware review

The current procedural route is now visibly stronger. Ruby marbling is present instead of a flat red plate, the brass fasteners render warm with actual domed highlights, and the medallion is smaller and more proportionate. The source-derived silhouette and continuous ivory shell remain stable.

The close three-quarter view still reveals two remaining quality gaps: the visible panel face is too uniformly gray-beige compared with the reference’s worn ivory/steel variation, and the ring/pommel remains less articulated than the showcase exemplar because its hidden transition is inferred from one broadside. These are acceptable only if the package records them as remaining limitations; they should not be described as a perfect match. The model is now a substantial improvement over the pushed version, but the visual gate is "improved, not exact" for the three-quarter route.
