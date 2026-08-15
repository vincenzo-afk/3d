# Neutral Broadside Review

The corrected neutral route now uses the orthographic broadside camera and confirms the full rifle silhouette and 134-mesh runtime hierarchy. The stock cutout, optic window and reticle, handguard rail cadence, marbled coating, foregrip, curved magazine, stepped barrel, and muzzle block all resolve. The remaining defect is not geometry loss but **albedo compression**: the procedural dark-metal and polymer maps are too low-valued when multiplied into the physical materials, so receiver and stock relief read nearly black even under neutral light. The next code correction raises only the generated albedo floor for dark metal/polymer; cavity material remains dark by design.

The clean v4 browser capture is `/home/ubuntu/screenshots/localhost_2026-08-15_01-09-14_8199.webp`.
