import {pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
export async function browser(){
  let runtime;
  if(process.env.TEST_SKILL_PLAYWRIGHT)runtime=await import(pathToFileURL(process.env.TEST_SKILL_PLAYWRIGHT).href);
  else {
    try{runtime=await import('playwright');}
    catch(error){
      const bundled=join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','playwright','index.mjs');
      if(!existsSync(bundled))throw new Error('Playwright unavailable. Run npm ci and npx playwright install chromium.',{cause:error});
      runtime=await import(pathToFileURL(bundled).href);
    }
  }
  const {chromium}=runtime;
  let executablePath=process.env.TEST_SKILL_BROWSER;
  if(!executablePath&&!existsSync(chromium.executablePath())&&process.platform==='win32'){
    executablePath=[join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')].find(existsSync);
  }
  return chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
}
