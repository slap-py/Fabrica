/** Shared region selection rules, including the reserved future left arm. */
export const armRegionIds = ['right-arm', 'left-arm'] as const;
export function toggleRegion(selected: readonly string[], id: string): string[] {
 if(selected.includes(id)) return selected.filter(region=>region!==id);
 const remaining = (armRegionIds as readonly string[]).includes(id) ? selected.filter(region=>!(armRegionIds as readonly string[]).includes(region)) : [...selected];
 return [...remaining,id];
}
export function normalizeRegionSelection(ids: readonly string[]): string[] {
 return ids.reduce<string[]>((selected,id)=>selected.includes(id)?selected:toggleRegion(selected,id),[]);
}
