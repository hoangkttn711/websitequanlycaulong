const fs = require('fs');

const origPath = 'C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html';
const orig = fs.readFileSync(origPath, 'utf8');

// 1. Extract Head
const headStart = orig.indexOf('<head>');
const headEnd = orig.indexOf('</head>') + 7;
let headHTML = orig.slice(headStart, headEnd);

// Remove any phone-wrapper or simulation CSS if present in head
headHTML = headHTML.replace(/\.view-mode-phone-wrapper\s*\{[\s\S]*?\}/g, '');

// 2. Extract Header
const headerStart = orig.indexOf('<header');
const headerEnd = orig.indexOf('</header>') + 9;
const headerHTML = orig.slice(headerStart, headerEnd);

// 3. Extract Customer Portal
const custStart = orig.indexOf('<section id="customer-portal"');
const custEnd = orig.indexOf('</section>', orig.indexOf('id="cust-cart-drawer"')) + 10;
const custHTML = orig.slice(custStart, custEnd);

// 4. Extract Admin Workspace
const adminStart = orig.indexOf('<div id="admin-workspace"');
const modalStart = orig.indexOf('id="modal-cust-addon-picker"');
const modalActualStart = orig.lastIndexOf('<div', modalStart);
const adminHTML = orig.slice(adminStart, modalActualStart);

// 5. Extract Modals
const scriptStart = orig.lastIndexOf('<script>');
const modalsHTML = orig.slice(modalActualStart, scriptStart);

// 6. Extract Scripts
const scriptContent = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

console.log('Extracted successfully:');
console.log('- Head:', headHTML.length);
console.log('- Header:', headerHTML.length);
console.log('- CustPortal:', custHTML.length);
console.log('- AdminWorkspace:', adminHTML.length);
console.log('- Modals:', modalsHTML.length);
console.log('- Script:', scriptContent.length);
