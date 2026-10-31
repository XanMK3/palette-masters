import type { PipelineResult } from './pipeline.js';
import type { ThemeResult } from './types.js';
/** Verify derivation and table references without rerunning extraction. */
export function validateProvenance(result: PipelineResult, theme?: ThemeResult): void {
  const derivations = new Map(
    [...result.derivations, ...(theme?.derivations ?? [])].map((d) => [d.id, d]),
  );
  const entities = new Map(result.entities.map((e) => [e.id, e.derivationId]));
  for (const d of result.derivations)
    if (d.operation === 'sample' && !entities.has(d.id)) entities.set(d.id, d.id);
  const tables = new Map(result.memberships.map((t) => [t.id, t]));
  if (derivations.size !== result.derivations.length + (theme?.derivations.length ?? 0))
    throw new Error('Duplicate derivation IDs');
  if (tables.size !== result.memberships.length) throw new Error('Duplicate membership IDs');
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const entity = (id: string) => {
    const derivation = entities.get(id);
    if (!derivation) throw new Error(`Unresolved entity ${id}`);
    visit(derivation);
  };
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Cyclic derivation ${id}`);
    const d = derivations.get(id);
    if (!d) throw new Error(`Unresolved derivation ${id}`);
    visiting.add(id);
    for (const input of d.inputs) {
      if (input.kind === 'entity') entity(input.id);
      else {
        const table = tables.get(input.tableId),
          group = table?.groups.find((g) => g.id === input.groupId);
        if (!table || !group) throw new Error('Unresolved membership');
        if (
          group.start < 0 ||
          group.length < 0 ||
          group.start + group.length > table.memberIds.length
        )
          throw new Error('Invalid membership bounds');
        for (const member of table.memberIds.slice(group.start, group.start + group.length))
          entity(member);
      }
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of derivations.keys()) visit(id);
  for (const swatch of result.swatches) {
    visit(swatch.derivationId);
    if (
      swatch.originalSampleId &&
      !result.originalSamples.samples.some(
        (s) => s.id === swatch.originalSampleId && s.rgb.join() === swatch.rgb.join(),
      )
    )
      throw new Error('Invalid original-color claim');
  }
  if (theme) {
    for (const id of Object.values(theme.roleSwatchIds))
      if (!result.swatches.some((s) => s.id === id)) throw new Error('Invalid role swatch');
    for (const token of Object.values(theme.tokens)) visit(token.derivationId);
  }
}
