const https = require('https');

https.get('https://www.githubstatus.com/api/v2/incidents/unresolved.json', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      (json.incidents || []).forEach(inc => {
        console.log('=== INCIDENT DETAILS ===');
        console.log('Name:', inc.name);
        console.log('Impact:', inc.impact);
        console.log('Status:', inc.status);
        console.log('Started at:', inc.created_at);
        console.log('Incident Updates:');
        (inc.incident_updates || []).forEach(u => {
          console.log(`[${u.created_at}] (${u.status}) ${u.body}`);
        });
      });
    } catch (e) {
      console.error(e.message);
    }
  });
});
