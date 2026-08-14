# Projection Route Evidence

The model uses a two-route contract.

The **reference-projection evaluation route** receives the local supplied PNG as a texture, maps the dense source-derived geometry through the measured pixel-to-world transform, and keeps the fixed broadside camera aligned to the source. The inverse transform uses the admitted source bounds `(95,233)–(1642,768)`, source size `1684×934`, and Three.js bottom-origin UV correction. Duplicate procedural fasteners, ring overlays, seam strips, hole walls, and rosette relief are hidden in this evaluation route so the supplied pixels are not doubled.

The **procedural orbit route** does not load the image. It uses the same source-derived silhouette and inferred 3D geometry, but uses independent authored ruby albedo/roughness/normal channels, ivory albedo/roughness/normal channels, warm brass dome crowns, physical seam/edge materials, real holes, and the inferred ring wall. This route is the honest test of 3D construction.

The projection route is required because the reference contains a specific patterned ruby finish and local wear that a generic procedural texture cannot reproduce reliably. The source image is not treated as exact de-lit albedo; it is an image-matched evaluation surface. Procedural PBR channels remain separate and are used for orbit response. The camera/framing and hidden backside remain single-view inferences.
