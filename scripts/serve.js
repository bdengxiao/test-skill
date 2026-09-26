import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
export function serve(port=4173){
  let evaluating=false;
  const server=http.createServer(async(req,res)=>{
    try{
      const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||'')){json(403,{error:'Loopback host required'});return;}
      if(req.url==='/api/evaluate'&&req.method==='POST'){
        if(req.headers.origin!==`http://${req.headers.host}`||!String(req.headers['content-type']).startsWith('application/json')){json(403,{error:'Use the local lab to submit JSON'});return;}
        if(evaluating){json(429,{error:'已有一个评测在运行，请稍后重试'});return;}
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>180000){json(413,{error:'提交过大'});return;}}
        let input;try{input=JSON.parse(body);}catch{json(400,{error:'Invalid JSON'});return;}
        evaluating=true;try{const {evaluateHTML}=await import('../validator/independent.js');json(200,await evaluateHTML(input.source,{maxElements:input.maxElements||200}));}catch(e){json(422,{error:e.message});}finally{evaluating=false;}return;
      }
      if(!['GET','HEAD'].includes(req.method)){json(405,{error:'Method not allowed'});return;}
      if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}
      const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
      const relative=path.slice(root.length).split(/[\\/]/);if(relative.some(p=>p.startsWith('.')||['work','node_modules','providers'].includes(p))){res.writeHead(403).end();return;}
      const file=extname(path)?path:resolve(path,'index.html');
      const body=await readFile(file);
      res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'}[extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(body);
    }catch{res.writeHead(404).end('Not found');}
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=await serve(Number(process.env.PORT||4173));console.log(`Test Skill: http://127.0.0.1:${server.address().port}`);
}
