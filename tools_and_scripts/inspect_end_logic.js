const fs = require('fs');

const js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');
const lines = js.split('\n');
console.log('Total lines:', lines.length);
console.log(lines.slice(lines.length - 40).join('\n'));
