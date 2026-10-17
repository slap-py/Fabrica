/** Region toggles preserve independent selections, including both arms. */
export function toggleRegion(selected: readonly string[], id: string): string[] {
 return selected.includes(id) ? selected.filter(region=>region!==id) : [...selected,id];
}
export function normalizeRegionSelection(ids: readonly string[]): string[] {
 return [...new Set(ids)];
}
