const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const scriptStart = orig.lastIndexOf('<script>');
const script = orig.slice(scriptStart);

const idMatches = [...script.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(idMatches)];
console.log('Total unique getElementById:', uniqueIds.length);

const missingInOrig = uniqueIds.filter(id => !orig.includes(`id="${id}"`) && !orig.includes(`id='${id}'`));
console.log('IDs in script but not in HTML:', missingInOrig);
