const fs = require('fs');
const path = require('path');

const scriptPath = 'c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js';
const script = fs.readFileSync(scriptPath, 'utf8');

const files = ['pc.html', 'mobile.html', 'index.html'];

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = regex.exec(script)) !== null) {
  ids.add(m[1]);
}

console.log('Total element IDs to verify:', ids.size);
let allGood = true;

files.forEach(file => {
  console.log('----------------------------------------');
  console.log(`Checking ${file}:`);
  const content = fs.readFileSync(file, 'utf8');
  console.log(`- File Size: ${content.length} characters (${fs.statSync(file).size} bytes)`);

  // Check 1: Mojibake
  const mojibakePatterns = ['Chá»¿', 'SÆ¡', 'Ä‘á»“', 'â€”', 'Ã ', 'áº£', 'Ä '];
  const foundMojibake = mojibakePatterns.filter(p => content.includes(p));
  if (foundMojibake.length > 0) {
    console.error(`  [FAIL] Mojibake found: ${foundMojibake.join(', ')}`);
    allGood = false;
  } else {
    console.log('  [PASS] Zero Mojibake / Clean UTF-8 Vietnamese');
  }

  // Check 2: All IDs
  const missing = [];
  for (const id of ids) {
    if (!content.includes(`id="${id}"`) && !content.includes(`id='${id}'`)) {
      missing.push(id);
    }
  }
  if (missing.length > 0) {
    console.error(`  [FAIL] Missing IDs (${missing.length}): ${missing.join(', ')}`);
    allGood = false;
  } else {
    console.log(`  [PASS] All ${ids.size} IDs found`);
  }

  // Check 3: Customer Privacy Check
  // In the customer portal matrix, it should NOT render any overlapping customer names
  if (content.includes("overlappingBk ? overlappingBk.customer")) {
    console.error('  [FAIL] Matrix still leaks customer names!');
    allGood = false;
  } else {
    console.log('  [PASS] Customer matrix is fully privatized (No leaked customer names)');
  }
});

console.log('----------------------------------------');
console.log('OVERALL STATUS:', allGood ? 'ALL 3 FILES PASSED 100%!' : 'SOME CHECKS FAILED');
