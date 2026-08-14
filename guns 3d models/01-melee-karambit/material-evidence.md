# Material Evidence

The repository material-region analyzer generated verified crops and independent albedo, roughness, height, normal, and AO evidence for four visible regions. All four PBR extractors returned `verdict: pass` with confidence `0.86`, above the requested `0.70` threshold:

| Region | Evidence result | Notes |
|---|---|---|
| Ruby blade coating | Pass, 0.86 | Reference-derived painted-metal evidence with separate maps |
| Ivory scale face | Pass, 0.86 | Reference-derived worn-composite evidence with separate maps |
| Brass hardware crop | Pass, 0.86 | Pixel evidence is usable, but the broad visual crop is ambiguous to the canonical registry |
| Ruby pommel ring | Pass, 0.86 | Reference-derived painted-metal evidence with separate maps |

The analyzer’s canonical assignment layer resolves the ruby regions to `coating.painted-metal`. The ivory and brass custom material IDs remain `unknown`/`request-input` at the registry layer because the supplied image is a stylized broadside and the repository registry does not contain exact custom entries for `aged-ivory-scale` or `brass-hardware`. This is not treated as proof of exact physical substance. The factory therefore keeps explicit authored material routes, records the reference-derived PBR artifact paths in the spec, and preserves the single-image inference limitation.

The material-analysis artifact is `material-analysis.json`; generated maps are under `material-evidence/` and remain independent by channel.
