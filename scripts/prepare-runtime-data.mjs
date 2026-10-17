import fs from 'node:fs';
const directory=new URL('../src/regions/arm-back/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,directory),'utf8'));
const original=read('manifest.json'), left=read('left-manifest.json');
const records=new Map(original.structures.map(record=>[record.id,record]));
for(const record of left.structures) {
 const existing=records.get(record.id);
 records.set(record.id,existing?{...existing,regions:[...new Set([...existing.regions,...record.regions])]}:record);
}
const keys=['id','canonicalId','name','sourceObject','tissue','laterality','regions','area','assetGroup','materialSeparation','boundsMm','sourceAttachments','unverifiedAttachmentPatches'];
const runtime={sourceRevision:original.sourceRevision,structures:[...records.values()].map(record=>Object.fromEntries(keys.map(key=>[key,record[key]]))),dataOnly:original.dataOnly,attachmentValidation:{references:original.attachmentValidation.references}};
const bytes=JSON.stringify(runtime)+'\n';
const destination=new URL('runtime-manifest.json',directory);
if(process.argv.includes('--check')) {
 if(fs.readFileSync(destination,'utf8').replaceAll('\r\n','\n')!==bytes)throw new Error('Runtime anatomy is stale. Run node scripts/prepare-runtime-data.mjs.');
} else fs.writeFileSync(destination,bytes);
