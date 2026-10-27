const https = require('https');

https.get('https://www.githubstatus.com/api/v2/summary.json', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Overall Status:', json.status.description);
      console.log('Active Incidents count:', json.incidents.length);
      json.incidents.forEach(inc => {
        console.log('- Incident:', inc.name, '| Status:', inc.status, '| Impact:', inc.impact);
      });
      console.log('--- Components Status ---');
      json.components.forEach(comp => {
        console.log(`- ${comp.name}: ${comp.status}`);
      });
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', err => {
  console.error('Fetch error:', err.message);
});
