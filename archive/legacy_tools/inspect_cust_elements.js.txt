const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const custStart = orig.indexOf('<section id="customer-portal"');
const custEnd = orig.indexOf('</section>', orig.indexOf('id="cust-cart-drawer"')) + 10;
const custHTML = orig.slice(custStart, custEnd);

const lines = custHTML.split('\n');
lines.forEach((l, i) => {
  if (l.includes('id="') || l.includes('<form') || l.includes('<table')) {
    console.log(`Line ${i+1}: ${l.trim().slice(0, 100)}`);
  }
});
