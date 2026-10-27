const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const name of ['index','pc','mobile']){
 const html=fs.readFileSync(path.join(root,name+'.html'),'utf8');
 const template=fs.readFileSync(path.join(root,'templates',name+'.html'),'utf8');
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(script.length,1);new vm.Script(script[0][1]);
 const ids=[...template.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 assert(!html.includes("pass === 'admin'"));assert(!html.includes('cdn.tailwindcss.com'));
 assert.equal(html,fs.readFileSync(path.join(root,'public',name+'.html'),'utf8'));
 console.log(name+': syntax, IDs, local dependencies and deployment copy passed');
}
