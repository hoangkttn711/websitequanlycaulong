const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/hoangkttn711/websitequanlycaulong/actions/runs?per_page=12',
  headers: { 'User-Agent': 'node.js' }
};
https.get(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total runs:', json.total_count);
      (json.workflow_runs || []).forEach(r => {
        console.log(`Run #${r.run_number} (${r.name}): status=${r.status}, conclusion=${r.conclusion}`);
      });
    } catch (e) {
      console.log(data);
    }
  });
});
