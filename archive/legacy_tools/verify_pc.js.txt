const fs = require('fs');
const pc = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');
const script = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = regex.exec(script)) !== null) {
  ids.add(m[1]);
}

const missing = [];
for (const id of ids) {
  if (!pc.includes(`id="${id}"`) && !pc.includes(`id='${id}'`)) {
    missing.push(id);
  }
}

console.log('Total unique IDs in logic:', ids.size);
console.log('Missing IDs in pc.html:', missing);
