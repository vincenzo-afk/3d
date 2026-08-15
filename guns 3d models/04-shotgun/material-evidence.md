# 04 Shotgun — Material Evidence

Eight source crops were analyzed: varnished stock wood, blued receiver steel, blued barrel steel, blued magazine-tube steel, varnished ribbed pump wood, matte rubber/cavity, polished front-band steel, and brushed knurled muzzle steel. Canonical registry mappings are explicit in `material-analysis.json`.

The wood regions use `wood.varnished`; dark tubes and receiver use `metal.steel-brushed`; the front band uses `metal.steel-polished`; the muzzle uses `metal.steel-brushed`; and the trigger/rubber/cavity crop uses `rubber.matte` as a documented probe. The single broadside cannot perfectly separate matte rubber from the recessed trigger cavity, so that region remains flagged for neutral-light render review rather than being treated as exact physical PBR.
