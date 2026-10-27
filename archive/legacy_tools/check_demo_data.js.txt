const fs = require('fs');

console.log('=== CHECKING DEMO DATA ACROSS ALL FILES ===');

const files = ['index.html', 'pc.html', 'mobile.html', 'tools_and_scripts/app_logic.js'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');

  // 1. Check for pre-filled input values
  const inputRegex = /<input[^>]*value=["']([^"']+)["'][^>]*>/gi;
  let m;
  const prefilled = [];
  while ((m = inputRegex.exec(content)) !== null) {
    // ignore hidden or type=submit or button or radio/checkbox
    if (!m[0].includes('type="hidden"') && !m[0].includes('type="checkbox"') && !m[0].includes('type="radio"')) {
      prefilled.push({ tag: m[0], value: m[1] });
    }
  }
  if (prefilled.length > 0) {
    console.log(`[${f}] Inputs with default value:`, prefilled);
  }

  // 2. Check for fake names
  ['Minh', 'Tuấn', 'Hùng', 'Lan', 'Hoa', 'Hoàng', 'Thắng', 'Cường', 'CLB'].forEach(name => {
    // Only search in HTML body before <script>
    const bodyOnly = content.split('<script>')[0];
    const regex = new RegExp(`>\\s*[^<]*\\b${name}\\b[^<]*<`, 'gi');
    const matches = [...bodyOnly.matchAll(regex)];
    if (matches.length > 0) {
      console.log(`[${f}] Text mentioning "${name}":`, matches.map(x => x[0].trim()));
    }
  });
});
