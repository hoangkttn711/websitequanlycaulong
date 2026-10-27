const https = require('https');

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdveHZ1Ynh2eXJjcmp6c2NmdGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDk2NDksImV4cCI6MjEwNzk4NTY0OX0.1oV8z5-waRqJ1oSy5z6x9be0zI-UvyKBNjKzeobiJDk';

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    const req = https.request({
      hostname: 'goxvubxvyrcrjzscftab.supabase.co',
      path: '/rest/v1/' + path,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });
    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function cleanAllData() {
  console.log('--- 1. Clearing all mock bookings from Supabase ---');
  // Delete all rows in bookings
  const bks = await supabaseRequest('bookings?select=id', 'GET');
  if (bks.data && bks.data.length > 0) {
    for (const b of bks.data) {
      const delRes = await supabaseRequest('bookings?id=eq.' + encodeURIComponent(b.id), 'DELETE');
      console.log('Deleted booking:', b.id, 'Status:', delRes.status);
    }
  } else {
    console.log('No bookings to delete');
  }

  console.log('--- 2. Resetting all 4 courts to FREE in Supabase ---');
  const courts = [
    { id: 1, name: 'Sân 1', zone: 'Sân thảm xanh', mat_color: 'green', status: 'free', customer: '', rate_type: 'normal', hourly_rate: 60000, start_time: '', booked_hours: 1.5, elapsed_minutes: 0, deposit: 0, items: [] },
    { id: 2, name: 'Sân 2', zone: 'Sân thảm xanh', mat_color: 'green', status: 'free', customer: '', rate_type: 'normal', hourly_rate: 60000, start_time: '', booked_hours: 1.5, elapsed_minutes: 0, deposit: 0, items: [] },
    { id: 3, name: 'Sân 3', zone: 'Sân thảm xám', mat_color: 'grey', status: 'free', customer: '', rate_type: 'normal', hourly_rate: 60000, start_time: '', booked_hours: 1.5, elapsed_minutes: 0, deposit: 0, items: [] },
    { id: 4, name: 'Sân 4', zone: 'Sân thảm xám', mat_color: 'grey', status: 'free', customer: '', rate_type: 'normal', hourly_rate: 60000, start_time: '', booked_hours: 1.5, elapsed_minutes: 0, deposit: 0, items: [] }
  ];

  for (const c of courts) {
    const updateRes = await supabaseRequest('courts?id=eq.' + c.id, 'PATCH', c);
    console.log('Reset court', c.id, 'Status:', updateRes.status);
  }

  console.log('--- 3. Clearing all invoices from Supabase ---');
  const invs = await supabaseRequest('invoices?select=id', 'GET');
  if (invs.data && invs.data.length > 0) {
    for (const inv of invs.data) {
      const delInv = await supabaseRequest('invoices?id=eq.' + encodeURIComponent(inv.id), 'DELETE');
      console.log('Deleted invoice:', inv.id, 'Status:', delInv.status);
    }
  } else {
    console.log('No invoices to delete');
  }

  console.log('--- DONE: Supabase is now 100% clean and fresh! ---');
}

cleanAllData().catch(console.error);
