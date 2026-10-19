const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const headEnd = orig.indexOf('</head>');
const headContent = orig.slice(0, headEnd + 7);

const headerStart = orig.indexOf('<header');
const headerEnd = orig.indexOf('</header>') + 9;
const headerContent = orig.slice(headerStart, headerEnd);

const custStart = orig.indexOf('<section id="customer-portal"');
const custEnd = orig.indexOf('</section>', orig.indexOf('id="cust-cart-drawer"')) + 10;
const custContent = orig.slice(custStart, custEnd);

const adminStart = orig.indexOf('<div id="admin-workspace"');
const adminEnd = orig.indexOf('<!-- ==================== MODALS ==================== -->');
const adminContent = orig.slice(adminStart, adminEnd > 0 ? adminEnd : orig.indexOf('id="modal-cust-addon-picker"'));

const modalStart = orig.indexOf('id="modal-cust-addon-picker"');
const modalActualStart = orig.lastIndexOf('<div', modalStart);
const scriptStart = orig.lastIndexOf('<script>');
const modalsContent = orig.slice(modalActualStart, scriptStart);

const scriptEnd = orig.lastIndexOf('</script>') + 9;
const scriptContent = orig.slice(scriptStart, scriptEnd);

console.log('headContent length:', headContent.length);
console.log('headerContent length:', headerContent.length);
console.log('custContent length:', custContent.length);
console.log('adminContent length:', adminContent.length);
console.log('modalsContent length:', modalsContent.length);
console.log('scriptContent length:', scriptContent.length);
