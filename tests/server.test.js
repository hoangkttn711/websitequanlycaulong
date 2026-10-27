const {test}=require('node:test');
const assert=require('node:assert/strict'),http=require('node:http');
const {createServer}=require('../tools_and_scripts/server');
test('dev server serves only public files and rejects raw/encoded traversal and dotfiles',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=p=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path:p},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject);});
 try{
  assert.equal((await request('/')).status,200);
  for(const p of ['/../README.md','/%2e%2e/README.md','/.git/config','/assets/../../README.md','/..%5cREADME.md','/%00','/%ZZ'])assert([400,403,404].includes((await request(p)).status),p);
  assert.equal((await request('/tools_and_scripts/cloud_module.js')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
