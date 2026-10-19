const fs = require('fs');

const content = fs.readFileSync('c:\\Quan ly san cau\\pc.html', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('Đội Anh Hoàng') || l.includes('Hà Đông') || l.includes('Anh Kiên') || l.includes('Anh Tuấn')) {
    console.log(`Line ${i+1}: ${l.trim().slice(0, 120)}`);
  }
});
