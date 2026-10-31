# Color extraction and theme mapping

The application uses the version-one composable pipeline in `src/extraction/pipeline.ts`. `palette.service.ts` is the compatibility adapter. Six presets and validated custom compositions share the same implementations. The application UI requests five colors and has no palette-size switch. The pipeline count parameter still supports five or six colors for programmatic use.

## Data and execution

1. Sample eligible pixels from the processed raster (default alpha ≥ 192; at most 4,000 retained samples). Sampling advances through eligible-pixel order, so sparse transparency does not hide the remaining opaque pixels. Each retained sample represents its consecutive eligible-area block and keeps source coordinates and a stable ID.
2. Optionally change fitting influence with edge weighting or replace pixels with connected SLIC region means.
3. Generate a candidate pool, independently from the requested five/six final colors.
4. Select representatives using population, population plus separation, farthest-point diversity, or per-band lightness coverage.
5. Optionally snap candidates to original retained colors, then apply the selection policy again to resolve collisions and constraints using the available alternatives. Return fewer colors by default. Relax separation only when explicitly configured.
6. Assign every original sample to its nearest final swatch in Euclidean Oklab. Sum its **represented area**, not its fitting influence, to measure dominance. Sort by population, then stable swatch ID for ties.
7. Attempt strict dominance role mapping, validate raw usages, and use deterministic dominance-aware fallback if necessary. Generate contextual foreground tokens separately.

Empty/transparent and malformed inputs produce explicit errors. No synthetic extracted colors or hidden palette filling remain. Changing display sorting, shuffling roles, or reassigning a role does not change the extracted swatches or their dominance.

## Population, influence and provenance

Represented area estimates how much eligible image area belongs to a sample. Influence controls fitting. Edge strength scales influence while keeping area unchanged. Quantizers honor influence during fitting and retain area separately in candidate populations. Zero-influence samples still contribute area.

SLIC uses a bounded nearest-neighbor working raster (default longest side 160), CIELAB plus position, and connected-component repair. Its means retain working-pixel source memberships. Region areas are proportional to working-region size and calibrated to total original eligible area; isolated retained samples missed by downsampling become explicit singleton inputs. These are approximate preprocessing populations. Final dominance always uses original represented area. SLIC means are not labeled original pixels, even when passed through medoids.

`PipelineResult` includes original samples, candidate and final identities, derivations, compact membership tables, selection decisions, diagnostics, requested/effective configuration and run identity. Source references form an acyclic derivation graph. Original-color claims refer to the retained **processed raster sample pool**, not the untouched full-resolution file.

## Preset registry v3

Unless noted, the candidate budget is **three times the requested palette count**, selection ranks represented population with minimum Oklab separation **0.024**, and missing slots return fewer colors. The preset registry is `src/extraction/presets.ts`.

| Preprocessing | Candidate generation | Representative selection |
| --- | --- | --- |
| None | Hue groups | Auto: lightness vs dominance |
| None | Oklab K-means | Auto: dominance vs farthest |
| None | Octree | Auto: dominance vs farthest |
| SLIC | Original samples | Farthest |
| None | Medoids | Dominance |
| Edge-weighted | Medoids | Farthest |

The first preset is the default. Automatic presets run both variants, build themes for all bundled template manifests and compare scores lexicographically: failed raw/rendered readability checks, role distinction deficits, total Oklab distance of corrected foreground tokens from their source roles, then area-weighted nearest-color reconstruction error. Distinction uses a capped 0.1 Oklab target for accent/background, accent/surface, accent/secondary and secondary/tertiary. These are product heuristics, not proof of aesthetic quality. Numerical ties within 1e-9 retain the first variant. Both alternatives and scores are retained in `autoSelection`; the winning result retains its complete visualization. The viewer shows the winning selector and both palettes. Hue lightness retains independent per-band candidate generation. Fixed presets and custom configurations do not run automatic comparison. Dominance ranks population with minimum separation: 0.085 for hue groups, 0.06 for medoids, and 0.024 otherwise. Farthest uses maximin selection with separation 0.015. Lightness uses independent hue pools for bands at 0.4 and 0.7, with within-band separation 0.06. Hue grouping uses 12 sectors; K-means fits for at most 12 iterations. Medoids use at most 600 possible representatives and 20 iterations. Edge weighting has strength 1. SLIC uses a longest side of 160, 200 target regions, compactness 10 and 10 iterations. “Original samples” bypasses candidate fitting: after SLIC these are prepared region means, not original image pixels.

Other algorithms and strategies remain available through custom composition.

K-means seeds use deterministic nonduplicate farthest-point initialization. Final nearest-center memberships are kept separately from the assignments that produced the last mean. Medoids seed with the highest-influence entry in a deterministic evenly spaced positive-influence representative pool, then farthest-point entries. Medoid updates minimize weighted total Euclidean distance within clusters and retain current representatives on ties. **Every input contributes to medoid fitting and population accounting**, even when it is outside the bounded representative pool. Distances are streamed, with no quadratic pairwise distance matrix. This is alternating local optimization, not exhaustive PAM swap search.

Octree reduction can undershoot a candidate budget when a branch contains several occupied descendants. Hue grouping and monochrome inputs can also produce short pools. Those are explicit fewer-color outcomes. Averages that drift outside their required lightness band are excluded with a diagnostic; no substitute algorithm is silently introduced.

No algorithm is universally best: means can blur accents, bounded medoid pools can miss rare colors, spatial weighting changes the fitting preference, and fixed separation/band boundaries are product choices rather than perceptual laws.

## Advanced composition

The expandable controls expose preprocessing, candidate generation/budget, fitting iterations, medoid pool, MMCQ fraction, hue sectors, selection/separation, strategy, lightness boundaries, SLIC settings, original sampling, snapping and missing-color policy. Editing a valid setting switches the pipeline label to **Custom**. Invalid edits report a reason and keep the last valid palette.

All implemented quantizers support weighted prepared inputs. Medoids or passthrough over SLIC means preserve those means, not original-image colors; enable snapping for an original-sample guarantee. Adaptive K requires K-means and cannot replace stratified lightness quantization. Selecting lightness coverage with the standard strategy explicitly resolves to per-band quantization. Candidate budgets are never silently increased. Configuration bounds are validated in `capabilities.ts` (at most 64 candidates per quantizer invocation, 20,000 original samples, 1,000 medoid representatives, and 256px SLIC dimension).

Snapping searches the original retained sample pool in Oklab, restricted to the required band for lightness selection. It retains before/after provenance, reports duplicate collisions, rechecks separation through the active selection policy, and uses alternate snapped candidates when available. A configured relaxed separation is reported; exact duplicates remain prohibited.

## Dominance and roles

The percentage shown on each swatch is an **estimate of eligible area assigned to its nearest palette color**, not exact RGB occurrence. Shares sum to 100% for a nonempty palette. Zero-support swatches are flagged. Display order initially follows dominance; the lightness sort changes presentation only.

Strict dominance maps ranks 1–6 to Background, Surface, Text, Accent, Secondary, Tertiary. Short palettes assign available ranks first and reuse the last available swatch for missing roles; five-color tertiary aliases secondary. Aliases are reported.

Template usage manifests in `src/theme/validation.ts` require preferred text against background and surface at 4.5:1 **before foreground correction**. Bundled templates use contextual foreground tokens on their other colored panels. Their decorative borders are not universal hard distinction requirements. The manifest also supports additional text pairs and required non-text distinctions with an existing-cue exemption. Rendered usages are checked separately; these checks do not establish whole-page accessibility.

If strict mapping fails, keep the most dominant color fixed as background and enumerate up to 120 assignments of the remaining roles. Prefer zero failed requirements; otherwise minimize failure count, then normalized contrast deficit. Next prefer the highest-ranked surface, smallest rank departure, then stable rank order. If nothing passes with that background, retain the best available assignment, report unresolved raw requirements, and use separate readable foregrounds on each panel. Readability safeguards never replace the dominant automatic background or alter extracted colors. Manual and shuffled assignments may still choose a different background.

Derived text/muted/accent foreground tokens carry source-role dependencies and reasons. Manual and shuffled mappings remain user mappings through template changes and retain safeguards. **Reset to automatic** reruns strict validation/fallback. A new image, extraction configuration or palette count resets to automatic. Automatic mappings are reevaluated on template transitions only when relevant raw requirements change.

## Painting-based pipeline story

“How this palette was extracted” opens a painting-centered player with a swatch strip, one caption, chapter navigation, Original comparison, Play/Pause and Previous/Next. The default story lasts at most 18.5 seconds. Sampling, optional preparation, fitting, selection, optional refinement, coverage and theme roles are all represented. Stages that did not run are skipped. Pausing and choosing a swatch highlights its represented image area. Reduced-motion mode uses manual stepping; closing, replacing the viewer or hiding the page stops playback.

RGB/Oklab K-means captures actual initialization, every iteration's assignments and updated colors, final assignments and stop reason. Adaptive trials and stratified fits retain separate state. The first assignment/update gets reading time; repeated iterations accelerate, with all states still accessible by stepping or seeking. Medoid presets show the bounded representative pool, assignments and actual sample replacements. MMCQ highlights each family before splitting it; octree highlights groups before merging them; hue grouping reveals actual hue and neutral families. Farthest-point selection adds colors in the actual accepted order. These methods use the same painting player and timing cap.

The extraction result stores compact visual state only when `captureVisuals` is requested. Assignment arrays use lossless run-length or dense typed storage, whichever is smaller; identities are stored once per fitting invocation. Medoid iterations retain chosen input indices; MMCQ/octree store structural changes with changed group memberships once rather than copying all assignments per operation. Hue families retain their actual memberships and are progressively revealed (not presented as iterative fitting). SLIC retains its final working-resolution region map and initial representative selection is retained separately from postprocessing. No debug events, recording levels, event budgets or JSON-log exports are restored. There is no silent visual-state truncation. Memory scales with configured samples, iterations and fitting trials; maximum custom configurations can be more expensive than presets.

The painting overlay expands retained samples over their actual represented eligible-pixel intervals. It is labeled **Sample-based reconstruction**, not exact full-image clustering. SLIC overlays use working-resolution regions. Sampling displays at most 400 location marks for readability and states the displayed/total counts; underlying samples and fitting assignments remain intact. Candidate strips retain all candidate choices, using a compact strip and inspection slider for very large sets.

Opening the player consumes the current result without re-extraction or network access. Provenance validation remains in `src/extraction/provenance.ts`. Source coordinates, membership tables, derivation graphs, diagnostics and original-color guarantees are preserved independently of visuals.

## Validation and limits

Run `npm test`, `npm run test:browser`, `npm run build`, and `npm run format:check`. Tests verify lossless visual packing, capture/output invariance, complete iteration retention, optional chapters, timing, cancellation, original comparison, painting masks, mobile width and reduced motion alongside extraction and theme regressions.

`npm run benchmark:pipeline` measures extraction plus theme creation without visual capture in 12 preset/count cases with three trials each. It does not measure player rendering or visual-state memory. Sample, candidate and iteration budgets still bound algorithm work. Extraction remains synchronous; larger custom configurations can block the main thread.
