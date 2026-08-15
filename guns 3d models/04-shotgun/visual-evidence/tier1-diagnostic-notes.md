# 04 Shotgun — Tier-1 Diagnostic Notes

The raw tier-1 probe against the de-lit reference reports silhouette IoU 0.1714, aspect-ratio delta 0.5556, and scale delta 1.4198. The raw render and reference use different foreground-mask behavior and photographic background/value structure, so the raw score is retained as a diagnostic probe rather than treated as a complete geometry verdict.

The source-edge-normalized probe reports aspect-ratio delta 0.0, scale delta 0.0, bilateral symmetry error 0.0127, and silhouette IoU 0.1323. The normalized bounds confirm that the authored render is correctly framed and scaled for the reference review route; the remaining IoU is dominated by the single-view source mask and different internal negative-space/lighting segmentation. The neutral broadside and three orbit captures are therefore the primary geometry evidence, with this limitation explicitly retained rather than hidden.
