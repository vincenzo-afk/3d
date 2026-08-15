# Material Evidence — 02 Assault Rifle

The material gate uses four source-grounded crops from the admitted 1672×941 broadside reference. The dark receiver crop is mapped to the closest canonical `metal.steel-brushed` profile, the blue-violet/teal ornamental field is mapped to `coating.painted-metal`, the skeleton stock is mapped to `plastic.matte`, and vent/seam recesses reuse `plastic.matte` with a dedicated high-roughness cavity response. The analyzer produced independent albedo, roughness, height, normal, and ambient-occlusion evidence for every region.

| Region | Component | Canonical profile | Confidence | Implementation response |
|---|---|---|---:|---|
| dark-metal-body | receiverAssembly | `metal.steel-brushed` | 0.82 | Near-black cool metal, bounded edge wear, high-metalness response, recessed seam AO. |
| marbled-coating | handguardAssembly | `coating.painted-metal` | 0.84 | Blue-violet/teal tendrils over dark substrate, clearcoat-like highlight breakup, independent roughness and height fields. |
| charcoal-polymer | stockAssembly | `plastic.matte` | 0.81 | Molded charcoal polymer, medium-high roughness, restrained micro-bump and contact wear. |
| cavity-seams | handguardVentSystem | `plastic.matte` | 0.78 | Recessed black vent/seam response, geometry-backed cavity, high roughness and AO dominance. |

The single-image limitation is retained explicitly: these are reference-derived PBR approximations, not measured scans or exact inverse-rendered maps. Controlled validation is required in neutral-light, grazing-light, reference-matched broadside, and three-quarter orbit views. The dark-metal and cavity identity remains an evidence-backed approximation because the image does not expose chemistry or hidden wall thickness.
