const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const regex = /<(section|main|div)[^>]*(id="[^"]+")[^>]*>/g;
let match;
while ((match = regex.exec(orig)) !== null) {
  if (match[0].includes('view-') || match[0].includes('portal') || match[0].includes('panel') || match[0].includes('admin-')) {
    console.log(match[0].slice(0, 120));
  }
}
