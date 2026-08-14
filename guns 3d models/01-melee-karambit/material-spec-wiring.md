# Material Specification Wiring

The automatic `apply_material_analysis.py` command was intentionally not allowed to promote the analysis because the artifact contains unresolved registry assignments for the custom ivory and brass regions. The wiring was completed manually and transparently instead.

The object specification now carries `referencePbrEvidence` blocks for the ruby blade coating, ivory scale face, and brass hardware. Each block points to `material-analysis.json`, records the extractor confidence `0.86`, identifies the generated independent map directory, and marks the evidence `exactness` as `image-only`. The brass block additionally records `registryAssignment: request-input`; it is not presented as an exact canonical material match.

The factory remains code-only and does not depend on these generated maps at runtime. The maps are preserved as evidence and future upgrade inputs; the current factory uses independent authored procedural channels for its orbit route and the supplied source texture for its broadside evaluation route.
