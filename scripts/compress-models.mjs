import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const extension = 'EXT_meshopt_compression';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const align = n => (n + 3) & ~3;

/** Lossless delivery only: no quantization, vertex welding, triangle reordering,
 * simplification, or edits to node IDs, provenance and anatomical metadata. */
export async function compressGlb(source) {
 await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
 if(source.readUInt32LE(0)!==0x46546c67 || source.readUInt32LE(4)!==2) throw new Error('Expected GLB 2');
 const jsonLength=source.readUInt32LE(12);
 const doc=JSON.parse(source.subarray(20,20+jsonLength).toString());
 if(doc.buffers.length!==1 || doc.buffers[0].uri) throw new Error('Expected one embedded buffer');
 const binary=source.subarray(28+jsonLength);
 const chunks=[];let byteLength=0,compressedViews=0;
 const append = bytes => {const offset=byteLength;chunks.push(bytes,Buffer.alloc(align(bytes.length)-bytes.length));byteLength+=align(bytes.length);return offset;};
 for(let i=0;i<doc.bufferViews.length;i++) {
  const view=doc.bufferViews[i];
  if(view.extensions?.[extension]) throw new Error('Already compressed');
  const raw=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const accessors=doc.accessors.filter(a=>a.bufferView===i);
  const accessor=accessors[0];
  const componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[accessor?.componentType];
  const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}[accessor?.type];
  const stride=view.byteStride??componentBytes*components;
  const mode=view.target===34963?'INDICES':'ATTRIBUTES';
  const eligible=accessors.length===1 && !accessor.sparse && !(accessor.byteOffset??0) &&
    raw.length===accessor.count*stride && (mode==='INDICES'?[2,4].includes(stride):stride>=4&&stride<=256&&stride%4===0);
  let encoded;
  if(eligible) {
   encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(raw,accessor.count,stride,mode));
   const decoded=new Uint8Array(raw.length);
   MeshoptDecoder.decodeGltfBuffer(decoded,accessor.count,stride,encoded,mode,'NONE');
   if(!raw.equals(decoded))throw new Error('Lossless round-trip failed for bufferView '+i);
  }
  if(encoded && encoded.length<raw.length) {
   const offset=append(encoded);
   view.buffer=1;
   view.extensions={...view.extensions,[extension]:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:stride,count:accessor.count,mode,filter:'NONE'}};
   compressedViews++;
  } else {view.buffer=0;view.byteOffset=append(raw);}
 }
 doc.buffers=[{byteLength},{byteLength:doc.buffers[0].byteLength,extensions:{[extension]:{fallback:true}}}];
 doc.extensionsUsed=[...new Set([...(doc.extensionsUsed??[]),extension])];
 doc.extensionsRequired=[...new Set([...(doc.extensionsRequired??[]),extension])];
 doc.asset.extras={...doc.asset.extras,delivery:{encoding:extension,lossless:true,sourceSha256:hash(source)}};
 const json=Buffer.from(JSON.stringify(doc));const paddedJson=Buffer.concat([json,Buffer.alloc(align(json.length)-json.length,0x20)]);
 const body=Buffer.concat(chunks);const output=Buffer.alloc(28+paddedJson.length+body.length);
 output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
 output.writeUInt32LE(paddedJson.length,12);output.writeUInt32LE(0x4e4f534a,16);paddedJson.copy(output,20);
 output.writeUInt32LE(body.length,20+paddedJson.length);output.writeUInt32LE(0x004e4942,24+paddedJson.length);body.copy(output,28+paddedJson.length);
 return {bytes:output,compressedViews,sourceSha256:hash(source),deliverySha256:hash(output)};
}
async function files(directory) {
 const entries=await fs.readdir(directory,{withFileTypes:true});
 return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(directory,e.name)):[path.join(directory,e.name)]))).flat();
}
export function losslessModels() {
 let outDir;
 return {name:'lossless-anatomy-delivery',apply:'build',configResolved(config){outDir=path.resolve(config.root,config.build.outDir);},async closeBundle(){
  const rows=[];
  for(const file of (await files(path.join(outDir,'models'))).filter(file=>file.endsWith('.glb'))) {
   const source=await fs.readFile(file);const result=await compressGlb(source);
   await fs.writeFile(file,result.bytes);
   rows.push({path:path.relative(outDir,file).replaceAll('\\','/'),sourceBytes:source.length,deliveryBytes:result.bytes.length,compressedViews:result.compressedViews,sourceSha256:result.sourceSha256,deliverySha256:result.deliverySha256});
  }
  const report={encoding:extension,lossless:true,verification:'Every decoded bufferView is byte-identical to its source; original public/models assets and provenance hashes remain authoritative.',sourceBytes:rows.reduce((n,r)=>n+r.sourceBytes,0),deliveryBytes:rows.reduce((n,r)=>n+r.deliveryBytes,0),files:rows};
  await fs.writeFile(path.join(outDir,'models/delivery-manifest.json'),JSON.stringify(report,null,2));
  console.log('Lossless models: '+(report.sourceBytes/1048576).toFixed(2)+' → '+(report.deliveryBytes/1048576).toFixed(2)+' MiB');
 }};
}
