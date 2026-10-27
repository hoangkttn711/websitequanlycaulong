const fs = require('fs');

const pc = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\build_pc.js', 'utf8');
const lines = pc.split('\n');
console.log(lines.slice(0, 35).join('\n'));
