import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const script=fileURLToPath(import.meta.url);
export async function openPreviewServer(directory){
  const dir=resolve(directory),state=join(dir,'preview-window.json');
  const child=spawn(process.execPath,[script,'--serve',dir],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
  for(let i=0;i<50;i++){
    try{const result=JSON.parse(await readFile(state,'utf8'));if(result.pid===child.pid)return result;}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('Preview window server did not start');
}
if(process.argv[1]&&resolve(process.argv[1])===script&&process.argv[2]==='--serve'){
  const dir=resolve(process.argv[3]);let idle;
  const server=http.createServer(async(req,res)=>{
    clearTimeout(idle);idle=setTimeout(()=>server.close(),60*60*1000);idle.unref();
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||'')){res.writeHead(403).end();return;}
    const name=new URL(req.url,'http://localhost').pathname;
    const files={'/':['preview.html','text/html; charset=utf-8'],'/preview.png':['preview.png','image/png']};
    if(!files[name]){res.writeHead(404).end();return;}
    try{res.writeHead(200,{'Content-Type':files[name][1],'Cache-Control':'no-store'});res.end(await readFile(join(dir,files[name][0])));}catch{res.end('Preview unavailable');}
  });
  server.listen(0,'127.0.0.1',async()=>{
    await writeFile(join(dir,'preview-window.json'),JSON.stringify({url:`http://127.0.0.1:${server.address().port}/`,pid:process.pid}));
    idle=setTimeout(()=>server.close(),60*60*1000);idle.unref();
  });
}else if(process.argv[1]&&resolve(process.argv[1])===script&&process.argv[2]==='--open')console.log(JSON.stringify(await openPreviewServer(process.argv[3])));
