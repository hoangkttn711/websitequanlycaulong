const fs = require('fs');
const js = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const lines = js.split('\n');
lines.forEach((line, i) => {
  if (line.includes('modal-admin-login') || line.includes('admin-workspace') || line.includes('customer-portal')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
