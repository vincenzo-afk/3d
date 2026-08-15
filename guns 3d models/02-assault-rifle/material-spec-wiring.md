# Material Spec Wiring — 02 Assault Rifle

`apply_material_analysis.py` wired the proceed-status analysis into `object-sculpt-spec.json`. Four regions are attached to the authored component tree: `dark-metal-body` → `receiverAssembly` → `dark-anodized-metal` → `metal.steel-brushed`; `marbled-coating` → `handguardAssembly` → `marbled-coating` → `coating.painted-metal`; `charcoal-polymer` → `stockAssembly` → `charcoal-polymer` → `plastic.matte`; and `cavity-seams` → `handguardVentSystem` → `cavity-material` → `plastic.matte`.

The wired spec retains independent `roughness`, `metalness`, `normal`, `bump`, `displacement`, `ambientOcclusion`, edge-wear, and cavity overrides. The `materialPipeline.status` is `proceed`, the four applied regions retain source crop provenance and registry profile IDs, and the runtime factory remains code-only: no imported mesh or runtime network material asset is introduced.
