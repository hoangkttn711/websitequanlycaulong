const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const scriptStart = orig.lastIndexOf('<script>');
const html = orig.slice(0, scriptStart);

const modalIndex = html.indexOf('id="modal-cust-addon-picker"');
console.log('Modals start at index:', modalIndex);
const modalsHTML = html.slice(html.lastIndexOf('<div', modalIndex));
console.log('Modals HTML length:', modalsHTML.length);

fs.writeFileSync('c:\\Quan ly san cau\\modals_clean.html', modalsHTML, 'utf8');
console.log('Saved modals_clean.html successfully!');
