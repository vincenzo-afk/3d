# 05 Heavy Machine Gun — Image Analysis

## Layer 1 — Identification and classification

**Observation.** The image contains one complete, side-oriented firearm prop occupying most of the horizontal frame. The visible inventory is a shoulder stock, rear receiver/action housing, pistol grip, top carry handle, top rail, feed-cover/upper receiver region, exposed linked ammunition and feed interface, a large lower ammunition box, forward handguard, long heavy barrel, muzzle device, front sight block, and a deployed bipod. The object is a mechanically assembled weapon prop rather than a single continuous shell. `primaryDomain` is `object`; confidence is high for the visible broadside assembly.

**Inference.** The prop is a belt-fed heavy machine gun or heavy automatic rifle. The exact real-world platform is undetermined from this single stylized image and is not required for procedural reconstruction.

## Layer 2 — Overall form and silhouette

The principal object-space axis is longitudinal: the stock and rear action occupy the proximal/rear end, while the barrel and muzzle extend distally/forward. The silhouette is strongly asymmetric in vertical distribution but approximately bilateral about the weapon's longitudinal center plane. The receiver is a deep, elongated cuboid with beveled/rounded transitions. The barrel is a long coaxial cylinder with stepped cylindrical collars. The handguard is a long polygonal shell around the forward barrel support. The stock is a skeletal/adjustable profile with a broad cheek/rest block and a lower butt support. The pistol grip is a tapered, angled extruded profile. The bipod is a bilateral pair of articulated struts below the forward receiver/handguard junction. The ammunition box is a deep rectangular prism hanging below the feed area.

Relative proportions visible in the broadside view are approximately: complete weapon length 1.0; receiver plus feed section 0.29; handguard and barrel-support section 0.30; exposed barrel and muzzle section 0.31; stock section 0.20. The weapon's maximum vertical envelope is created by the carry handle and bipod, not by the receiver alone.

## Layer 3 — Macro → meso → micro decomposition

### Macro assemblies

1. **Stock assembly:** rear butt/cheek body, lower support strut, buttpad, rear sling/attachment hardware, and receiver hinge/collar.
2. **Receiver/action assembly:** main receiver shell, rear action cover, side plates, ejection/feed-side panels, trigger housing, pistol grip mount, and rear-to-front structural collars.
3. **Feed system:** upper feed cover, feed tray/interface, exposed linked cartridge run, feed guide, and hanging ammunition box.
4. **Carry-handle assembly:** two mounting uprights, horizontal grip bar, grip sleeve, and hinge/brace details.
5. **Top rail and sighting assembly:** longitudinal rail with repeated transverse slots, rear/top sight block, front sight tower, and adjustment hardware.
6. **Forward handguard/barrel-support assembly:** ventilated polygonal shroud with repeated side slots, top rail section, lower mounting ring, and attachment lugs.
7. **Barrel and muzzle assembly:** barrel root, gas/locking collars, exposed barrel, front sight block, muzzle collar, and slotted muzzle brake/flash hider.
8. **Bipod assembly:** central hinge block, bilateral pivot sockets, articulated legs, perforation groups, feet, and contact pads.
9. **Control assembly:** trigger guard, trigger, pistol grip shell, grip panels, and local fasteners.

### Meso features

The receiver has repeated side-cover plates, shallow recessed panels, perimeter seams, round pivot bosses, small fastener heads, a long lower rail/edge, and a side charging/operating handle region. The feed system has a visible short belt segment of alternating dark links and brass-colored cartridges, with cartridge bodies aligned longitudinally and bullet tips projecting toward the feed throat. The ammunition box has a framed lid, top hinge/latch line, side panel border, deep lower corners, and a decorative surface region. The handguard has repeated horizontal/rounded vent apertures, a top rail, a lower sling or mounting loop, and a front retaining collar. The bipod legs have hinge blocks, elongated slots, cylindrical pivots, flared feet, and flat contact pads. The muzzle device has multiple longitudinal ports and stepped outer collars.

### Micro feature groups

Micro groups include bevel highlights along hard shells, repeated rail teeth/slots, rows of screws and rivets, circular hinge caps, cartridge rims and bullet tips, belt-link gaps, panel seams, recessed vent interiors, knurled or ribbed grip bands, bipod leg perforations, muzzle ports, sling loops, and stylized blue/teal/purple organic linework painted over the stock, receiver, handguard, and ammunition box. The decorative coating is a recurring identity feature, not generic colour noise.

## Layer 4 — Spatial relationships and attachment graph

- `<stock assembly, is butt-attached-to, rear receiver>` with a cylindrical hinge/collar contact.
- `<receiver shell, contains, action/feed cavity>` with the feed cover seated flush over the upper shell.
- `<carry handle, bridges, upper receiver>` through two embedded uprights and a horizontal grip bar above the receiver.
- `<top rail, is mounted-on, receiver and handguard>` with repeated transverse slot geometry.
- `<feed belt, enters, feed throat>` and `<ammunition box, hangs-below, feed interface>` through a short exposed belt segment.
- `<pistol grip, is mounted-under, trigger housing>` with a rigid angled butt joint.
- `<handguard, surrounds, forward barrel support>` with a front retaining band and rear receiver collar.
- `<barrel, passes-through, handguard and muzzle collar>` along the longitudinal centerline.
- `<front sight tower, is mounted-on, barrel support>` above the forward barrel axis.
- `<bipod hinge, is attached-under, forward handguard>` and `<bipod legs, pivot-from, bipod hinge>` with bilateral articulated contact.
- `<muzzle device, is coaxially-attached-to, barrel>` through stepped cylindrical collars.

## Layer 5 — Materials and surface response

The dominant receiver, barrel, rail, muzzle, and bipod surfaces appear to be dark blued or coated metal: low-to-mid albedo, metalness near 1, satin-to-semi-gloss roughness with narrow specular highlights and bevel-driven edge response. The stock, pistol grip, and handguard may be coated metal or rigid polymer; their large shells show a darker non-metallic-looking base under the decorative coating, so the specification should keep polymer/painted-composite as an explicit alternative rather than silently claiming raw metal. The ammunition cartridges are brass or brass-colored metal with higher value and warm hue; the links and box frame are dark metal. The decorative blue/teal/purple surface pattern is a glossy painted/hydro-dipped coating over dark substrate, with localized cyan highlights and indigo-violet linework. Recesses, slot interiors, and seams are near-black cavity surfaces. The sighting element appears dark metal with a small low-value glass/optic-like inset only if the rendered geometry supports it; this is uncertain in the source.

## Layer 6 — Color and finish

The background is near-black and provides a high-contrast silhouette. The substrate is predominantly charcoal/blue-black with low saturation. Painted regions use dark indigo, electric blue, teal, and small violet accents in irregular flowing tendrils and patches. Brass ammunition uses warm yellow-brown mid-value accents. The finish hierarchy is: satin dark metal for major mechanical parts, gloss or clearcoat-painted accents for the blue pattern, matte-to-satin polymer/composite for grip surfaces, brighter metallic brass for cartridges, and near-black rough cavity interiors. No exact manufacturer color identity is inferred.

## Layer 7 — Identity-defining features

The strongest identity features are the broad, deep receiver; the visible belt-fed cartridge segment; the hanging rectangular ammunition box; the forward ventilated handguard; the long barrel with slotted muzzle device; the deployed perforated bipod; the overhead carry handle; and the repeated blue/teal/purple organic coating on stock, receiver, handguard, and box. Secondary identity features are the top rail with repeated slots, front sight tower, trigger/pistol grip silhouette, stepped barrel collars, exposed feed cover, cartridge tips and links, and bilateral bipod feet. These features must become named spec components and review targets rather than remaining descriptive prose.

## Layer 8 — Uncertainty and single-image limits

The reference is a single broadside view with a dark background and no rear, top, underside, or opposite-side view. The far-side receiver, hidden stock surfaces, interior feed mechanism, exact belt link topology, barrel bore, trigger mechanism, and back side of the ammunition box are occluded or hidden. The image does not prove whether the handguard and stock are polymer, painted metal, or a hybrid; the procedural spec should record the selected approximation. The exact real-world platform, caliber, action type, and internal moving parts are undetermined. The muzzle bore depth and sight aperture are also uncertain. These regions should be represented with plausible low-complexity hidden geometry and explicitly marked as inferred. The broadside framing is strong enough for silhouette, macro assembly, visible material grouping, and visible surface-pattern reconstruction, but not for exact hidden-side or internal-mechanism claims.

## Reconstruction route

Use a code-only procedural factory with a broadside reference camera plus meaningful orbit review. Use authored geometry for the firearm structure and a procedural stylized coating approximation for the blue/teal/purple painted pattern because the source provides one visible patterned side but no clean multi-view de-lit texture set. Preserve the approximation note in the material evidence and review record. The target is a real-time browser prop with animation-ready sockets for stock, feed cover, belt box, carry handle, trigger, bipod, barrel, muzzle, and sight assemblies.
