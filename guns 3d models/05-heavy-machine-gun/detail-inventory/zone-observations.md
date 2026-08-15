# Heavy Machine Gun Detail Zone Observations

The contact sheet confirms the following zone-specific evidence:

| Zone | Observed details | Intended mapping |
|---|---|---|
| r0c0 | Near-black upper background; the upper carry-handle grip spans the center-top with ribbed ends and a padded/segmented central sleeve. | `carryHandleAssembly.localFeatures`, `material.localOverrides` |
| r0c1 | Carry-handle right upright and upper receiver/rail top edge; repeated small rail teeth and a rounded hinge/brace. | `carryHandleAssembly.localFeatures`, `receiverAssembly.localFeatures`, `sightingAssembly.localFeatures` |
| r0c2 | Front sight tower rises above the barrel line; upper barrel/rail continuation and dark cylindrical support. | `sightingAssembly.localFeatures`, `barrelAssembly.localFeatures` |
| r1c0 | Rear stock with broad buttpad, lower support strut, blue/teal/violet coating tendrils, rear collar rings, receiver side plate, and fastener heads. | `stockAssembly.localFeatures`, `stockAssembly.material.localOverrides`, `receiverAssembly.localFeatures` |
| r1c1 | Main receiver and feed region: blue patterned side plate, top rail slots, side seams, pivot discs, trigger guard, pistol grip, and exposed brass cartridges with dark links. | `receiverAssembly.localFeatures`, `feedSystem.localFeatures`, `controlAssembly.localFeatures`, `surfacePattern.material.localOverrides` |
| r1c2 | Forward handguard with repeated elongated vent apertures, top rail teeth, blue/teal/violet painted relief, front sight block, barrel collars, and dark muzzle transition. | `handguardAssembly.localFeatures`, `handguardAssembly.material.localOverrides`, `barrelAssembly.localFeatures`, `sightingAssembly.localFeatures` |
| r2c0 | Lower rear grip and trigger region; grip texture/paint continuation, trigger opening, receiver underside, and shadowed junctions. | `controlAssembly.localFeatures`, `controlAssembly.material.localOverrides`, `receiverAssembly.localFeatures` |
| r2c1 | Hanging ammunition box with framed perimeter, top latch/hinge line, deep side panel, blue decorative motif, lower corner bevels, and visible feed-belt entry above. | `ammunitionBoxAssembly.localFeatures`, `ammunitionBoxAssembly.material.localOverrides`, `feedSystem.localFeatures` |
| r2c2 | Bipod central hinge and bilateral legs; elongated perforations, circular pivot caps, flared feet, flat contact pads, barrel/muzzle collars, and longitudinal muzzle ports. | `bipodAssembly.localFeatures`, `barrelAssembly.localFeatures`, `muzzleAssembly.localFeatures` |

## Additional repeated systems confirmed

The visible side contains repeated rail teeth, repeated receiver fasteners, repeated barrel collars, repeated feed cartridges and belt links, repeated handguard vents, repeated bipod perforations, and repeated muzzle ports. These must be represented as instanced or loop-generated systems rather than as one-off decorative planes. The coating pattern is a set of localized material overrides or procedural canvas marks over stock, receiver, handguard, and ammunition box; it must remain distinct from the substrate PBR material.
