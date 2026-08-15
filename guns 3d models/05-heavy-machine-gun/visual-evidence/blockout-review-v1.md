# Heavy Machine Gun Blockout Review — v1

## Evidence reviewed

The fixed broadside render `front-v3.png`, source comparison sheet `blockout-comparison-sheet.png`, and map-stripped diagnostic render `diagnostic-v1.png` were inspected together. The source reference is `reference-source.png`.

## Provisional blockout decision

**Blockout geometry: continue provisionally.** The model presents the correct major silhouette order and all identity-defining macro systems: rear stock, deep receiver, overhead carry handle, top rail, exposed cartridge/link run, hanging ammunition box, angled pistol grip, ventilated forward handguard, long barrel, front sight, slotted muzzle device, and deployed bipod. The map-stripped render proves these are generated geometry rather than image cards. The full factory currently exposes 248 named meshes and 12 macro assembly groups.

The blockout comparison is not a final fidelity claim. The main remaining differences are that the source has a more compact, dark, organically rounded receiver/handguard treatment; the procedural version has flatter extruded side planes, larger angular stock/handguard panels, simplified bipod perforation visibility, and a coating represented by raised blue tendrils rather than broad hydro-dip patches. The source's dark-on-black body planes are preserved as a target while the diagnostic route deliberately lifts values for geometry inspection.

## Layer scorecard

| Layer | Score | Rationale |
|---|---:|---|
| silhouetteProportion | 0.78 | Long-axis, stock, receiver, feed box, handguard, barrel, muzzle, and bipod ordering are correct; stock/handguard proportions remain angular and somewhat oversized. |
| componentStructure | 0.84 | Receiver, feed cover, belt, ammunition box, carry handle, rail, grip, handguard, barrel, muzzle, sight, and bipod are separated into named procedural assemblies. |
| formDetail | 0.72 | Real vents, rails, ports, bore, cartridges, links, fasteners, trigger opening, and bipod volumes exist, but some visible relief is simplified. |
| materialSurface | 0.63 | Dark substrate, brass, cavity, and blue accent families exist, but broad source pattern placement and dark coated response are approximate. |
| lightingCamera | 0.76 | Broadside framing is corrected and neutral/studio routes exist; source-studio remains darker and more edge-lit than the current bright diagnostic. |

## Critical feature review

| Feature | Score | Status |
|---|---:|---|
| hmg-silhouette | 0.79 | Provisional; continue to structural/form refinement. |
| feed-system-identity | 0.84 | Passes blockout identity; exposed brass/link run and hanging box are clear. |
| receiver-action-identity | 0.80 | Provisional; receiver, carry handle, rail, trigger area, and feed cover are present, but side-panel proportions need refinement. |
| barrel-bipod-identity | 0.78 | Provisional; long barrel, muzzle, handguard, sight, and deployed bipod are present, with perforation detail better in neutral orbit than broadside. |
| orbit-construction | 0.82 | Passes provisional construction review; three-quarter/top/side/rear neutral views are non-degenerate and show real thickness/attachments. |

## Root cause and next action

The remaining mismatch is primarily implementation/lighting rather than missing spec coverage. Proceed with `refine-code`: round and darken the painted shell response, broaden the coating panels, add shell collars and bevel relief, and keep the current macro/socket contract intact. The deterministic tier-1 result will be recorded separately; its raw pixel score is advisory because this is a dark-on-black photo/product reconstruction.
