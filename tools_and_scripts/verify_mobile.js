const fs = require('fs');
const mobile = fs.readFileSync('c:\\Quan ly san cau\\mobile.html', 'utf8');
const script = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = regex.exec(script)) !== null) {
  ids.add(m[1]);
}

const missing = [];
for (const id of ids) {
  if (!mobile.includes(`id="${id}"`) && !mobile.includes(`id='${id}'`)) {
    missing.push(id);
  }
}

const hasMojibake = mobile.includes('Chá»¿') || mobile.includes('SÆ¡') || mobile.includes('Ã') || mobile.includes('Ä');

console.log('mobile.html Mojibake check:', hasMojibake);
console.log('Total unique IDs in logic:', ids.size);
console.log('Missing IDs in mobile.html:', missing);
