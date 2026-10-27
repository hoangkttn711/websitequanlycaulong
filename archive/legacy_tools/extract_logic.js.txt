const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const scriptStart = orig.lastIndexOf('<script>');
const scriptTagEnd = orig.indexOf('>', scriptStart) + 1;
const scriptEnd = orig.indexOf('</script>', scriptTagEnd);
const scriptBody = orig.slice(scriptTagEnd, scriptEnd);

fs.writeFileSync('c:\\Quan ly san cau\\app_logic.js', scriptBody, 'utf8');
console.log('app_logic.js extracted, bytes:', fs.statSync('c:\\Quan ly san cau\\app_logic.js').size);
