const fs = require('fs');

['pc.html', 'mobile.html', 'index.html'].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/(?:src|href)="([^"]+)"/g) || [];
  console.log(f, 'references:');
  matches.forEach(m => {
    if (!m.includes('http') && !m.includes('tel:') && !m.includes('mailto:') && !m.includes('#')) {
      console.log('  -', m);
    }
  });
});
