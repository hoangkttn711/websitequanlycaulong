const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
function createServer() {
  return http.createServer((req,res)=>{
    let pathname;
    try { pathname=decodeURIComponent(req.url.split('?')[0]); } catch {res.writeHead(400);res.end();return;}
    if(pathname==='/')pathname='/index.html';
    if(pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p=>p.startsWith('.')||p==='..')) {res.writeHead(403);res.end();return;}
    const target=path.resolve(ROOT,'.'+pathname);
    if(!target.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
    fs.realpath(target,(error,real)=>{
      if(error || !real.startsWith(ROOT+path.sep)){res.writeHead(404);res.end();return;}
      fs.stat(real,(error,stat)=>{
        if(error||!stat.isFile()){res.writeHead(404);res.end();return;}
        res.writeHead(200,{'Content-Type':MIME[path.extname(real)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
        const stream=fs.createReadStream(real);stream.on('error',()=>res.destroy());stream.pipe(res);
      });
    });
  });
}
if(require.main===module)createServer().listen(3000,'127.0.0.1',()=>console.log('http://127.0.0.1:3000'));
module.exports={createServer};
