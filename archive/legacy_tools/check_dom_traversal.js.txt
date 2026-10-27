const fs = require('fs');
const js = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const lines = js.split('\n');
lines.forEach((line, i) => {
  if (line.includes('parentElement') || line.includes('parentNode') || line.includes('children') || line.includes('closest')) {
    if (line.includes('cust-') || line.includes('customer-') || line.includes('form-customer-booking') || line.includes('cart-drawer')) {
      console.log(`Line ${i+1}: ${line.trim()}`);
    }
  }
});
