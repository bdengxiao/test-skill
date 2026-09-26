import {animals} from '../examples/animals.js';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('work/smoke',{recursive:true});const entries=[];
for(const [name,data] of Object.entries(animals)){
  await writeFile(`work/smoke/${name}.json`,JSON.stringify(data));
  entries.push({task:{id:name+'-a',animal:name,track:'A',budget:500,maxElements:30},file:name+'.json',model:'handcrafted-fixture',usage:{}});
}
await writeFile('work/smoke/broken.svg','<g id="animal"/>');
entries.push({task:{id:'negative',animal:'cat',track:'A',budget:50,maxElements:10},file:'broken.svg',model:'negative-fixture'});
await writeFile('work/smoke/scratch.html','<!doctype html><title>Archived fixture only</title>');
entries.push({task:{id:'scratch',animal:'cat',track:'B',budget:500,maxElements:30},file:'scratch.html',model:'handcrafted-fixture'});
await writeFile('work/smoke/manifest.json',JSON.stringify(entries,null,2));
