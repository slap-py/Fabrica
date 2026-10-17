import original from './manifest.json';
import left from './left-manifest.json';

// Complete native source objects share identity across Arm and Back. Keep the
// original export authoritative for objects already available in Back.
type SourceRecord = (typeof original.structures)[number];
const records = new Map<string, SourceRecord>(original.structures.map(r => [r.id, r]));
for (const record of left.structures) {
 const existing = records.get(record.id);
 records.set(record.id, existing ? {...existing, regions:[...new Set([...existing.regions, ...record.regions])]} : record as SourceRecord);
}
export default {...original, structures:[...records.values()]};
