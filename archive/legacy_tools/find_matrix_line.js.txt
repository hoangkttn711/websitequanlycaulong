const fs = require('fs');
const js = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const lines = js.split('\n');
lines.forEach((l, i) => {
  if (l.includes('cust-alobo-matrix-body')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
