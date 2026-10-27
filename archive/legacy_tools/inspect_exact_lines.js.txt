const fs = require('fs');

const js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

const lines = js.split('\n');

// Find matrix booked slot
console.log('--- Matrix Booked Slot ---');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// 2. Khung giờ đã có khách đặt')) {
    console.log(lines.slice(i, i + 35).join('\n'));
    break;
  }
}

// Find customer bookings list
console.log('--- Customer Bookings List ---');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Render recent bookings list for customer')) {
    console.log(lines.slice(i, i + 25).join('\n'));
    break;
  }
}
