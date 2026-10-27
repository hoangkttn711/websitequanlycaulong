const fs = require('fs');

const content = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');
const scriptStart = content.lastIndexOf('<script>');
const script = content.slice(scriptStart);

const lines = script.split('\n');
lines.forEach((l, i) => {
  if (l.includes('isAdminLoggedIn') || l.includes('viewMode')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
