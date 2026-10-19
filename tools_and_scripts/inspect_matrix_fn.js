const fs = require('fs');
const js = fs.readFileSync('c:\\Quan ly san cau\\app_logic.js', 'utf8');

const lines = js.split('\n');
let inMatrix = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function renderCustomerAloboMatrix') || lines[i].includes('renderAloboMatrix')) {
    inMatrix = true;
  }
  if (inMatrix) {
    console.log((i+1) + ': ' + lines[i]);
    if (lines[i].includes('return') && lines[i].includes('}')) break;
    if (lines[i].trim() === '}' && lines[i-1].includes('}')) break;
  }
}
