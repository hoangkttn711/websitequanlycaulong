const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const acorn = require('acorn');
const root = path.resolve(__dirname, '..');
function build() {
  const out = path.join(root, 'public');
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
  const cloud = fs.readFileSync(path.join(__dirname, 'cloud_module.js'), 'utf8');
  let app = fs.readFileSync(path.join(__dirname, 'app_logic.js'), 'utf8').replace('/* CLOUD_MODULE */', cloud);
  const ast = acorn.parse(app, { ecmaVersion: 'latest' }), edits = [];
  function walk(node) {
    if(node.type==='FunctionDeclaration'&&node.id?.name==='setupHorizontalScrollInteractions')return;
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'addEventListener'
        && ['click', 'submit', 'change', 'input'].includes(node.arguments[0]?.value)) {
      const cb = node.arguments[1]; edits.push({ start: cb.start, end: cb.end, text: 'guarded(' + app.slice(cb.start, cb.end) + ')' }); return;
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(n => { if (n && typeof n.type === 'string') walk(n); });
      else if (v && typeof v.type === 'string') walk(v);
    }
  }
  walk(ast);
  for (const e of edits.sort((a,b) => b.start-a.start)) app = app.slice(0,e.start)+e.text+app.slice(e.end);
  // Only HTML templates escape text. Plain textContent and stored invoice names stay raw.
  const htmlAst = acorn.parse(app, {ecmaVersion:'latest'}), htmlEdits=[];
  const textFields=new Set(['customer','phone','name','zone','unit','icon','courtName','slot','id','productId','paymentMethod','time']);
  function textExpr(expr) {
    if(expr.type==='MemberExpression')return textFields.has(expr.property.name);
    if(expr.type==='TemplateLiteral')return !expr.quasis.some(q=>/<[a-z!]/i.test(q.value.raw))&&expr.expressions.some(textExpr);
    if(expr.type==='LogicalExpression')return textExpr(expr.left);
    if(expr.type==='ConditionalExpression')return textExpr(expr.test)||textExpr(expr.consequent)||textExpr(expr.alternate);
    if(expr.type==='CallExpression'&&expr.callee.type==='MemberExpression')return textExpr(expr.callee.object);
    return expr.type==='Identifier'&&['courtName','cDesc','tagText'].includes(expr.name);
  }
  function escapeTemplates(node) {
    if(node.type==='TemplateLiteral'&&node.quasis.some(q=>/<[a-z!]/i.test(q.value.raw)))for(const expr of node.expressions) {
      if(textExpr(expr))htmlEdits.push({start:expr.start,end:expr.end,text:'Core.escapeHTML('+app.slice(expr.start,expr.end)+')'});
    }
    for(const v of Object.values(node)) {
      if(Array.isArray(v))v.forEach(n=>{if(n&&typeof n.type==='string')escapeTemplates(n);});
      else if(v&&typeof v.type==='string')escapeTemplates(v);
    }
  }
  escapeTemplates(htmlAst);
  for(const e of htmlEdits.sort((a,b)=>b.start-a.start))app=app.slice(0,e.start)+e.text+app.slice(e.end);
  const script = fs.readFileSync(path.join(__dirname, 'app_core.js'), 'utf8') + '\n' + app;
  new (require('node:vm').Script)(script);
  for (const name of ['index','pc','mobile']) {
    const template = fs.readFileSync(path.join(root,'templates',name+'.html'),'utf8');
    if (template.split('<!-- APP_SCRIPT -->').length !== 2) throw new Error('Expected one script marker: '+name);
    const html = template.replace('<!-- APP_SCRIPT -->', () => '<script>\n'+script+'\n</script>');
    fs.writeFileSync(path.join(root,name+'.html'),html); fs.writeFileSync(path.join(out,name+'.html'),html);
  }
  fs.copyFileSync(path.join(root,'node_modules/chart.js/dist/chart.umd.js'),path.join(out,'assets/chart.umd.js'));
  fs.copyFileSync(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),path.join(out,'assets/supabase.js'));
  const css = spawnSync(process.execPath,[path.join(root,'node_modules/tailwindcss/lib/cli.js'),'-i',path.join(root,'styles.css'),'-o',path.join(out,'assets/styles.css'),'--minify','--content',path.join(root,'templates/*.html')+','+path.join(root,'tools_and_scripts/app_logic.js')+','+path.join(root,'tools_and_scripts/cloud_module.js')],{cwd:root,encoding:'utf8'});
  if (css.status !== 0) throw new Error(css.stderr);
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  for(const file of fs.readdirSync(path.join(out,'assets'))) fs.copyFileSync(path.join(out,'assets',file),path.join(root,'assets',file));
  fs.writeFileSync(path.join(out,'.nojekyll'),''); console.log('Built index, PC, mobile and pinned local assets.');
}
if(require.main===module)build();
module.exports={build};
