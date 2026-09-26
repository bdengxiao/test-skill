import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Adapter contract: generate({task,prompt,entry,baseDir}) -> {content,usage,model,provider}.
// Real adapters must map reasoning into outputTokens and preserve provider usage.
export async function generate({entry,baseDir}){
  if(!entry.file)throw new Error('Offline entry needs a response file');
  return {content:await readFile(resolve(baseDir,entry.file),'utf8'),usage:entry.usage||{},model:entry.model||'unreported',provider:entry.provider||'offline',rawUsage:entry.rawUsage||null};
}
