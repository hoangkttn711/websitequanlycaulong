const fs = require('fs');
const js = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const lines = js.split('\n');
console.log(lines.slice(1250, 1330).join('\n'));
