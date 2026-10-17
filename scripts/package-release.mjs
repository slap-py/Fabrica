import fs from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
const entries={};
async function visit(directory) {
 for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await visit(file);
  else entries[path.relative('dist',file).replaceAll('\\','/')]=new Uint8Array(await fs.readFile(file));
 }
}
await visit('dist');
await fs.mkdir('output/releases',{recursive:true});
const bytes=zipSync(entries,{level:9});
await fs.writeFile('output/releases/fabrica.zip',bytes);
console.log('Complete static release: output/releases/fabrica.zip ('+(bytes.length/1048576).toFixed(2)+' MiB)');
