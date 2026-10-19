const fs = require('fs');

const content = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');
const scriptStart = content.lastIndexOf('<script>');
const script = content.slice(scriptStart);

const lines = script.split('\n');
lines.forEach((line, i) => {
  if (line.includes('.customer') || line.includes('customerName') || line.includes('b.customer') || line.includes('c.customer')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
