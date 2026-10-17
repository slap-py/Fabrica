import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeObject } from '../src/viewerResources';
const { compressGlb } = await import(new URL('../scripts/compress-models.mjs', import.meta.url).href);
const files = (dir: string): string[] => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const parse = async (bytes: Buffer) => (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '')).scene;
const rawBytes = (array: THREE.TypedArray) => Buffer.from(array.buffer,array.byteOffset,array.byteLength);
it('delivers every anatomical mesh with identical vertices, normals, indices, transforms and source metadata', async () => {
 let originalBytes=0,deliveryBytes=0;
 for(const file of files('public/models').filter(file=>file.endsWith('.glb'))) {
  const original = fs.readFileSync(file), compressed = await compressGlb(original);
  originalBytes+=original.length; deliveryBytes+=compressed.bytes.length;
  const a = await parse(original), b = await parse(compressed.bytes);
  try {
   const meshes = (root: THREE.Object3D) => { const result: THREE.Mesh[]=[];root.traverse(object=>{if(object instanceof THREE.Mesh)result.push(object);});return result; };
   const source=meshes(a),delivered=meshes(b);expect(delivered.length,file).toBe(source.length);
   for(let i=0;i<source.length;i++) {
    expect(delivered[i].name,file).toBe(source[i].name);
    expect(delivered[i].userData,file).toEqual(source[i].userData);
    expect(delivered[i].matrix.toArray(),file).toEqual(source[i].matrix.toArray());
    for(const [name,attribute] of Object.entries(source[i].geometry.attributes)) {
     const other=delivered[i].geometry.getAttribute(name);
     expect(other.itemSize,file+':'+name).toBe(attribute.itemSize);
     expect(rawBytes(other.array).equals(rawBytes(attribute.array)),file+':'+name).toBe(true);
    }
    const index=source[i].geometry.index,otherIndex=delivered[i].geometry.index;
    expect(!!otherIndex,file).toBe(!!index);
    if(index)expect(rawBytes(otherIndex!.array).equals(rawBytes(index.array)),file+':indices').toBe(true);
   }
  } finally {disposeObject(a);disposeObject(b);}
 }
 expect(deliveryBytes).toBeLessThan(originalBytes);
},60000);
