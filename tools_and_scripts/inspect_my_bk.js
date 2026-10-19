const fs = require('fs');

const content = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');
const scriptStart = content.lastIndexOf('<script>');
const script = content.slice(scriptStart);

const lines = script.split('\n');
console.log(lines.slice(1580, 1660).join('\n'));
