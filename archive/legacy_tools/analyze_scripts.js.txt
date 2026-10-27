const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

console.log('Original length:', orig.length);
// Find all <script> tags
const scripts = orig.split('<script');
console.log('Total scripts:', scripts.length - 1);
for (let i = 1; i < scripts.length; i++) {
  const s = scripts[i];
  const tagEnd = s.indexOf('>');
  const tag = s.slice(0, tagEnd);
  const closing = s.indexOf('</script>');
  const body = s.slice(tagEnd + 1, closing);
  console.log(`Script ${i}: tag=[${tag}], bodyLength=${body.length}`);
  if (body.length > 500) {
    console.log(`  Starts with: ${body.trim().slice(0, 150)}...`);
  }
}
