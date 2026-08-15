# Material Spec Wiring — 03 Sniper Rifle

The reviewed material analysis is wired into `object-sculpt-spec.json` through the material-analysis application step. The mapping is:

| Source region | Canonical profile | Spec material | Runtime component focus |
|---|---|---|---|
| dark-anodized-metal | `metal.steel-brushed` | `dark-anodized-metal` | receiverActionAssembly, receiverShell, barrelAssembly, muzzleAssembly |
| blue-ornamental-coating | `coating.painted-metal` | `blue-ornamental-coating` | stockOrnamentalPanel and ornamental receiver/stock surfaces |
| charcoal-polymer | `plastic.matte` | `charcoal-polymer` | stockAssembly, stock braces, magazineBody |
| cavity-material | `plastic.matte` with deep-cavity response | `cavity-material` | ejectionPortCavity, triggerGuardSystem, muzzleBoreWall |
| optic-glass | `glass.clear` | `optic-glass` | scopeGlassSystem and scopeGlassHighlight |
| silver-action-metal | `metal.steel-polished` | `silver-action-metal` | boltHandleSystem, triggerBlade, underActionRail, scope ring hardware |

Every region retains crop provenance, independent PBR map paths, confidence, required maps, optional maps, and controlled validation-view requirements. The single-image limitations remain explicit in the material-analysis artifact and are not hidden by the profile promotion.
