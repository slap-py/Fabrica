import runtime from './runtime-manifest.json';
import type original from './manifest.json';
type SourceRecord = (typeof original.structures)[number];
type RuntimeKeys = 'id' | 'canonicalId' | 'name' | 'sourceObject' | 'tissue' | 'laterality' | 'regions' | 'area' | 'assetGroup' | 'materialSeparation' | 'boundsMm' | 'sourceAttachments' | 'unverifiedAttachmentPatches';
// Generated from the authoritative full manifests; audit-only fields stay in the
// source and public records rather than every browser's JavaScript heap.
export default runtime as {
 sourceRevision: string;
 structures: Pick<SourceRecord, RuntimeKeys>[];
 dataOnly: typeof original.dataOnly;
 attachmentValidation: Pick<typeof original.attachmentValidation, 'references'>;
};
