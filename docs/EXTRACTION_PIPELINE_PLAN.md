# Explainable extraction pipelines and dominance-based themes

**Latest update — remaining methods animated:** Medoid replacement states, MMCQ splits, octree merges, hue-family reveals and farthest-point selections now feed the painting story. Changes preserve actual sample/group identities and use compact structural partitions rather than debug events. All presets keep the ≤18.5-second default duration with full manual stepping. Historical notes about pending fitting animations below are superseded.


**Latest update — painting story implemented:** The current player animates the complete RGB/Oklab K-means pipeline on the painting, in at most 18.5 seconds. Compact visual state preserves every fitting iteration without debug events or truncation. Semantic outcomes are available for other methods, whose fitting animation remains pending. The historical logs below describe superseded interfaces. See COLOR_EXTRACTION.md for current behavior.


**Current update — debug tracing removed:** The historical completion log below describes earlier iterations. The debug recorder, all event instrumentation and schemas, download, event replay, and trace-driven teaching views have now been removed at the user's request. Extraction results, provenance validation and the static stage viewer remain. Opening the viewer no longer reruns extraction. A compact painting-based visual story is the next design direction; it is not yet implemented. See COLOR_EXTRACTION.md for current behavior.


Status: complete. All 20 steps have passed their acceptance checks. Historical completion-log entries describe their checkpoint; current behavior and measured limits are documented in COLOR_EXTRACTION.md and PIPELINE_VALIDATION.md.

## Implementation tracker

**Progress: 20 of 20 steps complete.**

Work proceeds in the order below. Mark a step complete only after its acceptance checks pass, then record the changes and verification in the completion log. Existing palette outputs are not an acceptance baseline.

- [x] **01 — Shared contracts and color math.** Introduce independent raster/sample/candidate/provenance/configuration/result types and versioned trace-event contracts. Move shared color math out of the extraction service while retaining its existing exports.
- [x] **02 — Original sampling with provenance.** Preserve source coordinates, eligibility counts, represented-area weights, and independent fitting influence. Account for all eligible area, including transparent and sparse inputs.
- [x] **03 — Trace recorder and run lifecycle.** Implement off/summary/detailed recording, event/byte limits, explicit omissions, serializable snapshots, cancellation and stale-run protection. Instrument original sampling as the first real traced stage.
- [x] **04 — Weighted K-means stage.** Port RGB/Oklab fitting into the quantizer contract, recording initialization, assignments, center updates, and stop reasons.
- [x] **05 — Weighted medoid stage.** Preserve sample/source identities, weighted objective accounting, bounded fitting, and representative-change events.
- [x] **06 — MMCQ, octree and hue stages.** Emit candidate populations/provenance and actual split, merge and grouping decisions.
- [x] **07 — Spatial preprocessing stages.** Port edge weighting and SLIC with area/influence separation, connected region membership, and bounded intermediate traces.
- [x] **08 — Representative selection stages.** Separate population ranking, dominance/separation and farthest-point selection; make additions/rejections and missing-slot policies explicit.
- [x] **09 — Orchestration strategies.** Implement Adaptive K and per-band lightness quantization/allocation using candidate budgets and explicit decisions.
- [x] **10 — Presets, configuration and compatibility.** Register twelve presets; resolve requested/effective configuration; validate supported combinations and weight/preservation guarantees.
- [x] **11 — Postprocessing and constraint validation.** Add optional nearest-original-sample snapping, collision handling, final checks and explicit fallback outcomes.
- [x] **12 — Final dominance measurement.** Measure final swatch coverage from original represented area; attach stable rank, percentage and sample-to-swatch assignments.
- [x] **13 — End-to-end extraction integration.** Route the application through the new orchestrator/adapter; retire hidden cleanup and old extraction branches after all presets are supported.
- [x] **14 — Strict dominance mapping and validation.** Add template usage manifests and validate raw strict assignments before foreground corrections.
- [x] **15 — Dominance-aware fallback.** Search feasible assignments deterministically, preserve dominance preferences, and report impossible constraints plus derived safeguards.
- [x] **16 — User mapping lifecycle.** Preserve shuffle/manual choices, stable IDs, aliasing and sorting behavior; add automatic reset and template transition rules.
- [x] **17 — Preset summary and palette metadata UX.** Show the pipeline, represented percentages, provenance and applied mapping/fallback status.
- [x] **18 — Advanced composition UX.** Add compatible stage controls, Custom state, parameter validation, snapping and missing-color policies.
- [x] **19 — Replay-ready trace verification.** Verify references, serialization/replay, real operation decisions, trace-mode invariance, truncation, and stale/cancelled-run behavior across the complete pipeline. Animation UI stays deferred.
- [x] **20 — Integrated validation and documentation.** Exercise presets/custom combinations, five/six-color modes, short palettes and rendered roles; measure latency/memory and update guides.

### Completion log

#### Steps 01–04 completed

- **01 — Shared contracts and color math:** added `src/extraction/types.ts` and versioned `tracing/types.ts` for raster/sample/candidate/provenance/configuration/selection/theme contracts. Moved pure color functions to `src/extraction/color-math.ts`; existing palette-service exports remain compatible. Theme math and SLIC types no longer depend on the extraction implementation.
- **02 — Original sampling:** added `sampling/original-samples.ts` and wired it into `extractPalette`. Each sample has a stable source-pixel ID, coordinates, eligible-area interval, represented-area weight and separate initial fitting influence. Results expose `originalSamples` for later stages/visualization. Sampling now strides through eligible pixels rather than all raster pixels, avoiding missed sparse opaque images; this is an intentional behavior correction, not a historical-palette compatibility requirement.
- **03 — Recording and run lifecycle:** added `tracing/recorder.ts` with lazy off/summary/detailed recording, separate summary/detail event and UTF-8 payload-byte budgets, detached serializable snapshots, and per-stage omission counts/sequence bounds. Added `run.ts` for cancellation and stale-run handles. Original sampling emits real selected/excluded-pixel events and summary accounting. This lifecycle is available to stage callers; full application orchestration migrates in step 13. Trace-byte limits count stored event envelopes, not whole-process heap usage.
- **04 — Weighted K-means:** added `quantizers/kmeans.ts` and replaced the previous fitting engine for RGB/Oklab and their composite callers. Direct presets now consume original represented-area/influence weights and expose candidate derivations/membership tables. Fitting uses deterministic nonduplicate seeds, honors zero influence, stops on convergence or the iteration limit, and records real seeds, assignments, weighted objectives, center changes, candidate populations and stop reasons. Final represented memberships remain separate from the memberships that produced the final averages. Composite preprocessing still uses migration adapters until step 07; their complete source-provenance chains are not yet available.

**Verification:** 49 unit tests pass; TypeScript and production build pass; formatting check passes; Playwright verifies all twelve presets update previews in five- and six-color modes. New tests cover weight conservation, sample coordinates, sparse alpha, source preservation, trace invariance/budgets/serialization, cancellation/staleness, weighted center updates and candidate provenance.

**Current limits after steps 01–04:** only sampling and K-means fitting are instrumented. Other quantizers, selection, snapping, dominance and mapping traces remain unchecked steps. Preset composition and the strict-dominance default/fallback UI are still planned; the current theme assignment behavior has not been replaced. Detailed trace memory/latency profiling and full replay validation remain steps 19–20.



### Step 05 completed

- Added `quantizers/medoids.ts`: deterministic alternating weighted Euclidean Oklab medoids with independent influence and represented-area accounting, original/prepared sample identities, final membership tables and medoid derivations.
- Bounded the possible representative pool using `maxSamples` (600 in migrated presets), with an explicit uniform positive-influence sampling policy. Every input still contributes to the weighted objective and final population, including area from zero-influence samples. Distances are streamed with no quadratic distance matrix; fitting is bounded by the input size, pool budget and iteration budget. Pool restriction is approximate and can omit rare representative colors.
- Added actual pool, initialization, assignment, representative-update, weighted-objective and stop events. Ties retain current medoids; duplicate seed colors are skipped; cancellation and trace-budget behavior preserve semantic output.
- Routed the direct Oklab K-medoids preset through the stage with original weights and source identities. Composite medoid selectors share the new fitting implementation through unit-weight adapters; their selection, orchestration and full tracing/provenance migration remain steps 08–09. Prepared means only claim original identity when explicitly supplied, never merely because medoid fitting preserves their RGB.
- Intentional semantic change: fitting previously discarded samples outside a 600-entry subset and aggregated that subset by RGB frequency. Now all input influence contributes while only the representative search is restricted. Seed ties follow stable input order. Updated `COLOR_EXTRACTION.md` accordingly. Shared final cleanup remains until the selection/integration steps.

**Verification:** 55 unit tests pass, including six new medoid-stage tests covering weighted replacements/objectives, source preservation, bounded-pool accounting, zero influence, ties/duplicates, invalid inputs, cancellation, serialization, trace-mode invariance/truncation and direct preset integration in both palette sizes. TypeScript, production build and formatting checks pass. Playwright extraction coverage passes for all twelve presets in five/six-color modes.

**Limits after step 05:** sampling, K-means and direct medoid fitting are instrumented. Other quantizers, composite selection/strategies, snapping, final dominance and theme mapping remain pending. Full performance profiling and replay verification remain steps 19–20.



### Steps 06–19 completed

- **06 — MMCQ, octree and hue:** weighted stage implementations now retain populations and membership derivations. Detailed events capture occupied box bounds/splits, octree node relationships/merges, and actual neutral/hue assignments.
- **07 — Spatial preprocessing:** edge weights preserve physical area; bounded SLIC records seeds, center motion, label snapshots and component repairs. Connected working-pixel memberships retain coordinates/RGB, region areas are calibrated to eligible area, and missed opaque islands receive explicit singleton inputs. Prepared samples retain effective influence in the result.
- **08 — Selection:** independent population, separation, maximin and lightness policies record acceptance/rejection comparisons. Exact duplicates, snapping collisions, separation failures and exhausted candidates have distinct outcomes. Final slot filling is no longer hidden.
- **09 — Strategies:** Adaptive K records actual weighted objectives, improvements and chosen K; stratified quantization fits independent band pools and allocates coverage/extras deterministically. Out-of-band averaged candidates are diagnosed and excluded.
- **10 — Presets/configuration:** versioned twelve-preset registry, bounded parameters, requested/effective settings and explicit compatibility errors. Lightness selection explicitly resolves standard execution to stratified execution; unsupported adaptive combinations are rejected.
- **11 — Postprocessing:** optional nearest-original snapping, required-band restriction, provenance chains, collisions, alternate candidate selection, exact duplicate checks and explicit return-fewer/relax-separation policies.
- **12 — Dominance:** all presets/custom compositions measure original represented area against final swatches. Results include stable rank/share, final assignment tables and zero-support diagnostics.
- **13 — Integration:** the application adapter exclusively uses the new pipeline. Removed legacy extraction branches and shared hidden normalization. The run manager prevents cancelled/stale commits; explanations verify the current final swatches before download.
- **14 — Strict mapping:** usage manifests validate raw preferred text against background/surface before guards, support additional template-specific text/distinction pairs and record deterministic short-palette aliases.
- **15 — Fallback:** bounded exhaustive assignments prefer feasible requirements, dominant background/surface and minimal rank departure. Impossible raw mappings retain the palette, report failures and apply contextual safeguards. Tokens have source dependencies and reasons; rendered foreground usages are independently checked.
- **16 — Mapping lifecycle:** manual/shuffle mappings survive template changes; reset/new extraction rules are implemented. Stable swatch IDs and display sorting preserve role identities and dominance.
- **17 — Summary/metadata UI:** pipeline summary, percentage/rank, original/averaged provenance, applied policy, fallback explanation, aliases and diagnostic text are visible. Bright swatch labels now use a readable opaque background.
- **18 — Advanced controls:** validated preprocessing, quantizer/budget, fitting, selection/separation, strategy, sampling, SLIC, snapping and missing-color settings; Custom state; invalid edits preserve the last valid palette and report their reason.
- **19 — Replay verification:** JSON explanation bundles contain result/theme/provenance plus bounded events. Loader checks schema, run identity, graphs, assignments, budgets and complete-trace references. Playback reads stored events/results without computation or network. Per-stage caps preserve later-stage tracing after sampling truncation. Animation UI remains deferred.

**Verification:** 68 unit tests pass. Coverage includes all twelve presets in both counts and 42 preprocessing/quantizer/count combinations, weighted stages, original-color guarantees, actual trace decisions, snapping collisions, adaptive trials, lightness fits, dominance ties, raw mapping/fallback, impossible constraints, serialization/replay, truncation, cancellation and source-graph validation. All 11 browser tests pass; the two new mapping/control/explanation tests were rerun successfully after final provenance changes. TypeScript, production build and formatting checks pass.

**Intentional behavior changes:** default display order follows final dominance, automatic role mapping starts with strict dominance, candidate pools are explicit, and exhausted palettes return fewer colors unless separation relaxation is configured. Historical exact palettes and luminance-default sorting are not acceptance baselines. Extracted colors remain unchanged by theme safeguards.



### Step 20 completed

Integrated acceptance coverage passes: 68 unit tests, all 11 browser tests, TypeScript, production build and formatting. Added `benchmark:pipeline` and recorded 48 preset/count/trace cases with three trials each on the current Apple M1 Pro host. The largest observed off-mode extraction-and-theme trial was 230.22 ms; detailed recording's largest trial was 151.93 ms. These are measured maxima, not timing guarantees or statistical p95s. Serialized event bytes, full explanation size and retained heap estimates are reported separately.

Rewrote `COLOR_EXTRACTION.md` around the delivered behavior, updated the README, and added `PIPELINE_VALIDATION.md` plus machine-readable `PIPELINE_BENCHMARK.json`. Current limits are explicit: synchronous execution, bounded/possibly truncated detailed history, approximate SLIC preprocessing populations, and processed-sample original-color guarantees. Worker transport is compatible with the contracts but is not implemented; animated visualization and the other deferred algorithms remain outside this plan's scope.


### Follow-up — preserve the dominant automatic background

At the user's request, automatic fallback now fixes dominance rank 1 as background and searches only the remaining roles (at most 120 permutations). Unresolved raw contrast on individual panels is handled by the existing contextual foreground tokens. Manual/shuffle mappings remain unrestricted. This supersedes the original background-changing fallback policy described below.

### Follow-up — five-color application UI

The application now always requests five colors. Removed the five/six switch, its styles and event/state handling, advanced-control count mutator, and six-color-only template elements. The extraction pipeline retains its configurable `count: 5 | 6` parameter and both sizes remain covered by unit tests. Browser coverage now exercises the five-color UI.

## 1. Decisions and scope

Refactor the twelve existing extraction modes into composable stages. Keep convenient presets, expose compatible combinations through advanced controls, and make every stage capable of explaining its actual execution.

The default automatic role policy is **Strict dominance order**. If it fails explicit mapping checks, automatically try **Dominance-aware roles**. Keep the existing shuffle and manual reassignment controls. They change role assignments, not extracted colors or their dominance measurements.

Visualization is the next UI iteration, but provenance, trace events, stable IDs, and bounded recording belong in this refactor. They must not require reverse-engineering final colors later.

Do not use existing black-box outputs as an acceptance baseline. Validate the new implementation against documented algorithm properties, data accounting, and user-visible guarantees. Palette outputs may change; record intentional semantic changes in the documentation. Existing functional and invariant tests remain useful, but exact historical palettes are not authoritative.

### In scope

- Separate preprocessing, quantization, representative selection, postprocessing, dominance measurement, and theme building.
- Express current methods as presets and explicit orchestration strategies.
- Preserve original sample provenance and population separately from algorithm weights.
- Optional nearest-original-sample snapping.
- Strict-dominance default assignment, deterministic automatic fallback, and preserved user control.
- Preset selector, compact pipeline summary, advanced controls, and actionable diagnostics.
- Instrumentation and trace replay contracts for later visualization.

### Deferred

- Animated visualization layouts, timelines, playback widgets, and interactive algorithm diagrams.
- Additional extractors such as Celebi and CIEDE2000 medoids.
- Semantic subject recognition and interactive masks/cropping. The sampling contract must permit them later.
- Claims that one algorithm is universally best; visual-quality rankings require separate benchmarking.

## 2. Execution model

```text
Decoded image + effective configuration
    ↓
Prepare original opaque samples and spatial/source mappings
    ↓
Optional spatial preprocessing / influence weighting
    ↓
Generate color candidates (or use original samples directly)
    ↓
Select representatives
    ↓
Optional snapping + duplicate/constraint validation
    ↓
Measure final represented population and dominance
    ↓
Strict dominance role mapping
    ├─ passes → retain strict mapping
    └─ fails  → evaluate dominance-aware mappings
                    ├─ passing mapping exists → apply it
                    └─ none passes → best available mapping + foreground safeguards
    ↓
Generate theme tokens and report provenance/diagnostics
```

Do not put missing-color filling inside an invisible normalization function. Candidate expansion, relaxed separation, fewer-color output, and derived theme colors are distinct, explicit policies.

Theme generation must never silently modify extracted swatches. Derived foreground and state colors belong to theme output, with their own provenance.

## 3. Contracts and data ownership

Keep the shared types and color math independent of UI, Canvas, DOM, and algorithm implementations. Obtain raster data at the application boundary.

| Data | Required information |
|---|---|
| Original samples | Stable sample IDs, RGB, source coordinates, opacity/eligibility decisions, represented-area weight, and raster dimensions |
| Prepared samples | Stable IDs, RGB, represented area, algorithmic influence, source references, and optional region membership |
| Candidate | Stable ID, RGB/Oklab, provenance, represented population, weighted influence, and references to contributing samples or regions |
| Selection result | Accepted IDs, ranking metrics, rejected IDs with reasons, constraints, and unavailable requirements |
| Postprocessing result | Before/after IDs and colors, snapping source IDs, duplicates, repairs, unresolved constraints |
| Final palette | Stable swatch IDs, source provenance, represented population/share, dominance rank, lightness, and optional display order |
| Theme result | Role-to-swatch IDs, requested/applied policy, validation results, fallback reason, derived tokens, and token dependencies |
| Run metadata | Resolved configuration, input fingerprint, algorithm/configuration versions, run ID, and trace completeness |

Use source-reference tables or typed-array indices for large membership relationships; do not copy an entire pixel list into every candidate or event. Averaged colors can later be snapped, so provenance is a derivation chain rather than a single mutable `sampled/averaged` flag.

### Population is not influence

- **Represented population:** estimated image area represented by a sample/candidate, accounting for the sampling scheme.
- **Algorithmic influence:** the effective weight used during fitting, possibly modified by edges or another preference.
- SLIC region means must carry region area rather than count every region as equally large.
- Keep both measurements through the pipeline. Edge emphasis must not masquerade as physical dominance.
- Report shares as estimates over eligible sampled image area, not exact full-resolution color-frequency claims.

## 4. Separate modules

```text
src/extraction/
  types.ts
  color-math.ts
  pipeline.ts
  presets.ts
  capabilities.ts
  diagnostics.ts
  dominance.ts

  sampling/
    original-samples.ts
    standard.ts
    edge-weighted.ts
    slic.ts

  quantizers/
    kmeans.ts                 # RGB and Oklab variants
    medoids.ts
    mmcq.ts
    octree.ts
    hue-groups.ts

  selection/
    population.ts
    dominance-separated.ts
    farthest-point.ts
    lightness-coverage.ts

  strategies/
    adaptive-k.ts
    stratified-quantization.ts

  postprocessing/
    snap-to-sample.ts
    deduplicate.ts
    validate.ts

  tracing/
    types.ts
    recorder.ts
    replay.ts

src/theme/
  types.ts
  mapping.ts
  validation.ts
  tokens.ts

src/palette.service.ts        # Thin integration adapter during migration
src/theme.service.ts          # Thin integration adapter during migration
```

Suggested configuration groups: sampling, preprocessing, quantizer, selection, postprocessing, palette size, fallback policy, and theme mapping. Keep requested settings separate from effective settings and record automatic resolution decisions. Trace level belongs to execution options, not palette semantics.

Use discriminated configuration types and a versioned preset registry. Avoid allowing meaningless parameter combinations through generic string dictionaries.

## 5. Quantization and selection combinations

Separate **candidate count** from the final five/six-color count. A selection policy needs alternatives to choose from. Make candidate budgets explicit in presets and traces; define compatible limits per quantizer. Do not silently change a budget to make an unsupported combination appear valid.

| Existing preset | Pipeline expression |
|---|---|
| RGB K-means | Standard samples → RGB K-means → explicit representative/fill policy |
| Oklab K-means | Standard samples → Oklab K-means → explicit representative/fill policy |
| MMCQ | Standard samples → MMCQ → explicit representative/fill policy |
| Octree quantization | Standard samples → selective octree reduction → explicit representative/fill policy |
| Oklab K-medoids | Standard samples → Oklab medoids → explicit representative/fill policy |
| Hue + Oklab diversity | Hue/neutral grouping → population-ranked perceptual separation |
| Edge-weighted RGB K-means | Edge-weighted samples → weighted RGB K-means → selection |
| SLIC regions + clustering | Connected SLIC regions with area weights → Oklab K-means → selection |
| Adaptive K | Repeated RGB K-means controlled by the adaptive-K strategy → explicit trimming/selection |
| Oklab farthest-point selection | Original samples → greedy maximin selection; quantizer bypassed |
| Dominance-ranked Oklab medoids | Oversized medoid candidate pool → represented-population ranking + minimum separation |
| Lightness-stratified medoids | Partition original samples by lightness → medoids per band → coverage-aware slot allocation |

These are semantic presets, not promises to reproduce historical arrays. Document selection/filling choices in each preset, especially where the old implementation relied on shared cleanup.

### Compatibility rules

- Quantizers receiving weighted input must actually support its weights. Adapt and test population calculations before enabling edge/SLIC combinations.
- Original-sample passthrough is a legitimate candidate source, not a fake quantizer.
- Lightness coverage can request per-band quantization so rare bands survive candidate generation.
- Adaptive K is an orchestration strategy around a quantizer, not interchangeable with final representative selection.
- K-medoids over SLIC means preserves those means, not original-image pixels. Such a combination cannot claim original-color preservation without original-sample constraints or snapping.
- Original-color mode always refers to the retained original processed sample pool.
- Unsupported combinations must be rejected with a reason; never silently substitute another algorithm.

## 6. Optional snapping and final constraints

Expose **Use only sampled image colors** as a postprocessing setting where applicable. For already sample-preserving pipelines it is redundant and can display “Already preserved.”

Snapping replaces each representative with its nearest original eligible sample in Oklab. Keep both the averaged candidate and the snapped sample in the provenance chain.

After snapping:

1. Detect exact duplicates.
2. Recheck separation and lightness constraints.
3. If permitted, seek alternate eligible candidates using the active selection policy.
4. If constraints still cannot be satisfied, follow an explicit fallback: return fewer colors by default, or relax a named constraint only when configured.
5. Never invent extracted colors to fill slots.

For lightness-preserving configurations, restrict snapping to the required band where possible; otherwise report the unavailable constraint rather than silently losing it. Display sorting must not alter candidate identity, dominance rank, or assignments.

## 7. Final dominance measurement

Run this after final selection, snapping, and duplicate handling for every pipeline.

1. Assign each original eligible sample to its nearest final swatch in Euclidean Oklab distance.
2. Accumulate represented-area weights, not edge-weighted influence or equal SLIC-region votes.
3. Divide by the total eligible represented area to obtain percentages.
4. Rank descending by population. Resolve ties deterministically using stable palette IDs.
5. Record sample-to-swatch assignments for visualization when detailed tracing is enabled.

Shares must sum to 100% within numeric tolerance for a nonempty valid palette. Zero-support swatches must be identified explicitly. Reject empty palette output before theme generation.

Dominance means **area represented by the nearest palette color**, not exact RGB occurrence. Report that distinction in the UI/help. Recompute after palette changes; do not recompute for shuffle or manual role reassignment.

Swatches should show represented percentages and dominance ranks. Use dominance order as the initial display order; a later lightness sort is purely presentational and must leave roles unchanged.

## 8. Default theme policy and automatic fallback

### Strict dominance order: always the initial automatic policy

Use the existing semantic role order:

| Dominance rank | Role |
|---|---|
| 1 | Background |
| 2 | Surface |
| 3 | Text |
| 4 | Accent |
| 5 | Secondary |
| 6 | Tertiary, when available |

For fewer than six colors, assign available ranks first. Missing roles reuse the last available swatch deterministically; in five-color mode tertiary aliases secondary. Record every alias and do not fabricate additional palette entries. The validator then determines whether the mapping is usable.

### Evaluate the mapping before corrective token generation

Otherwise black/white foreground guards would conceal every raw contrast failure and prevent meaningful fallback decisions.

Initial mapping rejection rules:

- Invalid/missing swatch references: configuration/data error, not a reason to silently remap.
- Preferred text against background or surface below **4.5:1**: reject strict mapping and attempt dominance-aware assignment.
- Additional required text/background pairs declared by a template below its configured contrast target: reject and attempt remapping.
- A required non-text distinction fails its template-specific target and cannot be supplied by an existing border/outline cue: reject and attempt remapping.

Use a template role-usage manifest to declare which pairs matter. Do not require every palette pair to contrast, treat every background/surface boundary as universally requiring 3:1, or claim a palette check establishes whole-page accessibility.

Background/surface similarity, lightness balance, chroma balance, and accent separation are initially **soft preferences**, not arbitrary universal rejection thresholds. Version any later product thresholds and explain them in diagnostics.

### Dominance-aware fallback

For five/six swatches, evaluate the at-most-120/720 unique role permutations. For shorter palettes, use the same documented alias policy and enumerate distinct assignments of available swatches.

Select deterministically:

1. Prefer mappings satisfying all applicable hard contrast/distinction requirements.
2. Among passing mappings, prefer retaining the most dominant background, then the highest-ranked feasible surface, then the smallest departure from strict rank order.
3. Use soft role-suitability preferences and a stable tie-break to decide remaining ties.
4. If none pass, choose the least-violating mapping using documented violation count/severity, then dominance preferences. Apply contextual foreground safeguards and report unresolved limitations.

Retain the extracted palette in every case. Derived text, border, hover, or focus tokens must be labeled as derived and linked to their source role(s). Validate rendered role usages after token generation as well; the best available raw mapping is not itself proof of a usable final page.

### Shuffle and manual assignments

- Retain the existing shuffle control; it changes assignments only.
- Keep manual role swaps and five-color secondary/tertiary alias behavior.
- Do not automatically undo a user's shuffle or manual assignment by rerunning dominance-aware mapping. Mark it as a user mapping, show diagnostics, and retain contextual readability safeguards.
- Provide **Reset to automatic**: rerun strict dominance followed by validation/fallback.
- A new image, extraction configuration, or palette count produces a new palette and resets to automatic mapping.
- Switching templates retains the user's palette and manual/shuffled mapping; update usage diagnostics and foreground guards. In automatic mode, revalidate and remap only if the relevant template requirements change.
- Changing display sort or opening explanations must never change role assignments.

## 9. Visualization-ready tracing: implement now

The future UI must explain the real pipeline, not run a separate illustrative algorithm.

### Recording modes

- **Off:** no trace allocation beyond data needed for extraction and normal diagnostics.
- **Summary:** stage inputs/outputs, counts, parameters, selection/rejection decisions, dominance, and role decisions.
- **Detailed:** bounded intermediate algorithm snapshots and membership/assignment deltas.

Pass a recorder through stage execution contexts. The no-op and recording implementations must produce identical palette/theme results. Never use wall-clock timing or trace-budget exhaustion to change algorithmic decisions.

A later “Explain this result” action can run the same configuration/input with detailed recording; verify matching semantic output and attach the new trace to that result. Replay itself must not rerun extraction or access the network.

### Event contract

Use a versioned serializable event union with:

- Run ID, stage ID, sequence number, and event type.
- Stable source/candidate/region/swatch IDs.
- Relevant parameters, scores, populations, comparison IDs, and reason codes.
- References to snapshot/membership tables rather than duplicated large payloads.

Typical events: `sample-excluded`, `weight-assigned`, `region-created`, `center-updated`, `box-split`, `branch-merged`, `candidate-generated`, `candidate-accepted`, `candidate-rejected`, `color-snapped`, `constraint-unmet`, `dominance-measured`, `mapping-rejected`, `fallback-applied`, `token-derived`.

Reason codes must distinguish alpha exclusion, sampling omission, cluster membership, low population, insufficient separation, filled lightness quota, snapping collision, and theme contrast failure. These are different decisions, not one generic “rejected” state.

### Algorithm-specific trace payloads

| Stage/algorithm | Record for later explanation |
|---|---|
| Sampling | Raster-to-source coordinate mapping, eligibility, sample stride/budget, represented area |
| Edge weighting | Edge scores and effective weights separate from physical populations |
| SLIC | Seeds, center movement, label snapshots/deltas, connected-component repairs, region means/areas |
| K-means | Seed IDs, assignments, centers and population/influence totals per iteration, stop reason |
| K-medoids | Candidate sample IDs, cluster membership, medoid replacements, objective and stop reason |
| MMCQ | Box bounds, histograms/references, chosen priority, split axis/position, averages |
| Octree | Node relationships, occupied descendants, selected merges, populations and resulting averages |
| Hue grouping | Bucket assignments, means, neutral/hue decisions |
| Adaptive K | Each K trial, objective, improvement threshold, chosen K and subsequent selection |
| Representative selection | Candidate ranks, population, separation comparisons, lightness quotas, accepted/rejected IDs |
| Snapping/validation | Original and replacement colors/IDs, distances, duplicates, constraint repairs/failures |
| Dominance | Final sample-to-swatch mapping and represented area percentages |
| Theme mapping | Strict mapping, failed checks, selected fallback rationale, shuffle/manual provenance, derived tokens |

Use snapshots plus deltas, configurable event/byte budgets, and explicit truncation metadata identifying omitted stages/iterations. Omitted detail must never be presented as a complete history. Keep compact stage summaries even when detailed recording is truncated.

Support cancellation and stale-run protection. Keep serializable inputs/results and transferable typed-array data compatible with future Web Worker execution. Clear large buffers when a run is replaced; do not retain original image pixels indefinitely merely to display a palette.

## 10. UX for this iteration

### Simple mode

- Keep the preset dropdown with the twelve recognizable presets.
- Add a compact summary: **Sampling → Candidate generation → Selection → Postprocessing**.
- Show palette size, dominance percentages, and original/averaged provenance in accessible details.
- Show applied mapping: **Strict dominance**, **Dominance-aware fallback**, or **User mapping**.
- When fallback occurs, provide one concrete explanation, such as “Text contrast on the background was too low; roles were reassigned.”
- Keep shuffle and manual role controls; add Reset to automatic.

### Advanced mode

Expandable controls for preprocessing, candidate generation, candidate budget, representative selection, optional snapping, separation/lightness parameters, and missing-color fallback.

Preset selection populates the controls. Changing a stage sets the label to **Custom**. Validate compatibility immediately, explaining unavailable choices. Resolve orchestration requirements visibly, such as enabling per-band candidate generation for lightness coverage. Avoid long compound labels and a dropdown entry for every permutation.

### Next visualization iteration

Use recorded data to show source overlays, sample/region influence, candidate generation, accepted/rejected colors, final coverage, and role assignment. Add step/play/pause/replay, stage navigation, and comparisons. Do not build this animation UI in the current refactor.

## 11. Delivery sequence

### Milestone A: contracts and pipeline foundations

1. Define stage contracts, provenance tables, population/influence semantics, resolved configurations, and trace schemas.
2. Separate shared color math and original sampling from extraction implementations.
3. Introduce recorder modes, no-op recording, trace budgets, cancellation/run identity, and serialization.
4. Port quantizers and sampling strategies with meaningful invariants and actual intermediate instrumentation.

Acceptance: algorithms work through explicit stage boundaries, metadata survives averaging, and tracing does not alter outputs. No historical-output baseline is required.

### Milestone B: presets and composition

5. Separate selection/fill policies from quantization; implement candidate budgets and strategy orchestration.
6. Convert twelve modes into registered presets with documented semantics and capabilities.
7. Add snapping, duplicate handling, final constraint validation, and explicit fallback results.
8. Implement final dominance measurement for every pipeline.

Acceptance: each supported preset/combination has valid population accounting, explainable candidate decisions, and accurate color-preservation guarantees.

### Milestone C: dominance-based theme mapping

9. Implement strict dominance default, template role-usage validation, and deterministic dominance-aware fallback.
10. Preserve manual/shuffle control, contextual safeguards, stable IDs, and reset behavior.
11. Record mapping validation and derived-token provenance.

Acceptance: strict mapping is retained when valid, fallback occurs when required, and user assignments are not silently overwritten.

### Milestone D: advanced UX, verification, and documentation

12. Add pipeline summary, advanced controls, compatibility explanations, dominance labels, and mapping status.
13. Test representative pipelines and edge cases; benchmark interactive latency and bounded trace memory.
14. Document presets, custom combinations, constraints, dominance semantics, fallback policy, and trace format.

Acceptance: the app remains usable with presets, custom pipelines are understandable, and a future visualization can replay traces without algorithm changes.

## 12. Acceptance tests

### Extraction and composition

- Empty, transparent, monochrome, thin, high-entropy and malformed images have explicit outcomes.
- Weighted input is honored; population and influence are separately accounted for.
- Every declared sampled-color pipeline returns colors found in the original eligible sample pool.
- SLIC-derived means cannot be mislabeled as original pixel colors.
- Selection obeys its advertised ordering/separation rules; lightness bands survive where required and available.
- Snapping revalidates constraints, handles collisions, and does not invent colors.
- Deterministic configurations repeat exactly; input data is not mutated.
- Supported presets and representative custom combinations work in both five/six-color modes.

### Dominance and themes

- Final represented-area shares sum to 100% within tolerance; sample assignment ties are deterministic.
- Changing display order does not alter dominance or role identities.
- Strict mapping follows rank order and remains unchanged when it passes validation.
- Raw contrast failures trigger the documented dominance-aware fallback before foreground correction.
- Impossible raw mappings produce explicit diagnostics and contextual safeguards, never false success.
- One-to-four-color output and five-color tertiary aliasing work without invalid indices.
- Shuffle/manual assignment leaves colors and population unchanged and is not automatically undone.
- Automatic reset, new extraction, and template transitions follow the specified policy.
- Rendered theme tests cover actual role usages, not just arbitrary swatch pairs.

### Tracing and future visualization

- Off, summary and detailed runs produce identical semantic extraction/theme results.
- Every trace reference resolves and derivation graphs have no broken or cyclic source relationships.
- Accepted/rejected decisions contain machine-readable reasons and relevant comparisons.
- Summary/detailed traces serialize, reload, and replay without recomputation.
- Detailed trace limits are enforced; truncation is explicit and does not change results.
- Cancelled or superseded runs cannot replace newer results or traces.
- Small fixtures verify that recorded splits, merges, averages, selections and mappings match the actual algorithm execution.

## 13. Performance and completion limits

Benchmark normal extraction and detailed recording separately. Use representative processed-image dimensions and both palette counts; record typical and tail latency plus trace memory. Do not set device-independent pass/fail timing limits before measuring target hardware.

Pairwise medoid distances and SLIC label snapshots need explicit memory budgets. Candidate limits and sampling resolution are effective configuration, recorded in results. If normal extraction needs a worker, the serializable contracts should allow that migration without changing stage APIs.

Completion of this plan means composable and explainable pipelines with dominance-based theme assignment. It does not mean proving every extracted palette visually optimal, implementing deferred algorithms, or delivering the next iteration's animation UI.


### Pipeline viewer — milestone 1 delivered

`src/pipeline-viewer/` provides a static modal explorer with seven stage views, original-image sample overlays, edge influence and retained SLIC region boundaries, candidate colors, selection decisions, snapping information, final dominance and theme roles. The modal uses native dialog focus handling, Escape dismissal and focus restoration, with a fullscreen mobile layout.

The application shares validated explanation generation with JSON download. Detailed recording is generated on demand and checked against the current palette; the viewer never performs extraction. Stored results remain visible when event history is truncated, with explicit omission notices. Candidate and decision lists display at most 200 entries and disclose that limit. Replacement extraction or mapping closes the viewer and releases its DOM. Animated playback and comparisons remain deferred.

Validation includes a stage-model unit test and browser coverage of all twelve presets, all stages, keyboard dismissal, focus restoration and mobile width.


### Pipeline viewer — milestone 2 delivered

Added `playback.ts` for timer ownership, bounded event-index seeking and stage jumps, and `replay-view.ts` for reconstruction from consumed recorded events. Controls provide play/pause, previous/next, reset, timeline seeking, 0.5×–4× speed and return to a static stage overview. The timeline counts retained events rather than sequence numbers or wall-clock algorithm duration.

Replay shows retained sampling and edge-weight overlays, region snapshots, candidate/center/medoid changes, selection decisions, snapping, dominance and theme events. Generic recorded-event details cover remaining algorithm operations. Missing events remain explicitly unknown; final palette swatches are labeled as a reference, never used to fabricate intermediate state. Recorded-state rendering uses bounded history reconstruction rather than checkpoint caching. Closing or replacing a viewer clears its timer. Playback does not trigger extraction or networking; opening still uses the existing validated explanation-generation path.

Validation: 74 unit tests and 14 browser tests passed, including deterministic backward seeking, sequence gaps, timer disposal, speed, end/restart, stage navigation and reopen. Comparisons remain deferred.


### K-means teaching view delivered

`src/pipeline-viewer/kmeans/` separates recorded-step reconstruction (`steps.ts`), fixed-axis RGB/Oklab plots (`color-plot.ts`) and the lesson UI/lifecycle (`view.ts`). The Candidates stage opens this view for K-means, with a Learn K-means shortcut and separate Event replay mode. Lessons cover deterministic initialization, assignments, weighted updates, repeat/iteration navigation, stopping and the candidate-to-palette distinction. Original-source highlighting and keyboard-accessible inspection accompany the plots. Adaptive/stratified invocations remain distinct. All playback timers are disposed on stage/mode changes and modal closure.

Validation: 77 unit tests and 15 browser tests pass, including weighted updates in both color spaces, missing updates, iteration limits, multiple invocations, deterministic plot subsets, backward navigation, linked source selection, teaching playback, mobile width and the existing viewer regressions.


### K-medoids teaching view delivered

Added `src/pipeline-viewer/medoids/steps.ts` and `view.ts`, reusing the existing cluster lesson UI, linked plots and lifecycle controls. Lessons group raw replacement-before-assignment records into the explanatory assignment-then-replacement order. Recorded costs remain weighted Euclidean Oklab distances; no averaged representatives are fabricated. Pool limits, prepared-input provenance, unchanged representatives, stopping conditions and trace gaps are explicit.

Validation: 80 unit tests and 16 browser tests passed, with K-means regressions included. Type checking, production build and formatting passed.
