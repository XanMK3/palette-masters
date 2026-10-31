# Pipeline validation report

Current validation for the six-preset registry.

- 67 unit tests pass: extraction properties, all six presets and both counts, preprocessing combinations, area/influence accounting, selection, snapping, dominance, provenance, theme mapping and run cancellation.
- 15 browser tests pass: artwork controls, templates, advanced composition and the painting-based pipeline player, including mobile layout and focus restoration.
- Type checking and production build pass. Formatting passes. Source also passes unused-local and unused-parameter checks.

Debug-event, replay and retired teaching-view tests were removed with those features. Algorithm/result assertions were retained or migrated to semantic outputs.

## Performance sample

`npm run benchmark:pipeline` runs 12 preset/count cases, three trials each. Current host: Apple M1 Pro, darwin arm64, v24.21.0.

- Per-case median range: 29.02–247.85 ms.
- Largest observed extraction-and-theme trial: 581.54 ms.
- Largest serialized result/theme bundle: 3.83 MiB.

Full results are in [PIPELINE_BENCHMARK.json](PIPELINE_BENCHMARK.json). These synthetic three-trial measurements are not statistical p95s or timing guarantees. Retained heap estimates are not peak memory. No debug events are collected.

## Remaining limits

Extraction remains synchronous. Sample, candidate, iteration, region and representative-pool budgets bound algorithm work. SLIC areas are calibrated estimates; final dominance uses original represented sample area. Provenance describes processed input samples, not necessarily the full-resolution source file.

The player animates the full K-means pipeline in at most 18.5 seconds using compact, lossless visual state. Medoid replacements, MMCQ splits, octree merges, hue-family reveals and farthest-point choices are also animated. Structural histories reconstruct backward and forward without changing semantic extraction outputs. Sample reconstruction and working-resolution regions are labeled. Existing benchmark figures exclude optional visual capture and player rendering.
