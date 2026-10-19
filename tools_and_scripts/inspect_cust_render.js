const fs = require('fs');

const content = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');
const scriptStart = content.lastIndexOf('<script>');
const script = content.slice(scriptStart);

const lines = script.split('\n');
for (let i = 1090; i < 1600; i++) {
  if (lines[i].includes('customer') || lines[i].includes('name') || lines[i].includes('phone')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
