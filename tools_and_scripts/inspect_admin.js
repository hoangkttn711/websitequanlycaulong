const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const lines = orig.split('\n');
console.log(lines.slice(345, 430).join('\n'));
