const https = require('https');

const SUPABASE_URL = 'https://goxvubxvyrcrjzscftab.supabase.co';
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

async function testOperations() {
  console.log('--- 1. Testing Read Courts ---');
  const courtsRes = await supabaseRequest('courts?select=*', 'GET');
  console.log('Courts Count:', courtsRes.data.length);

  console.log('--- 2. Testing Insert Booking ---');
  const testBkId = 'TEST-' + Date.now();
  const insertRes = await supabaseRequest('bookings', 'POST', {
    id: testBkId,
    customer: 'Khách Test Realtime',
    phone: '0900000000',
    court_id: 2,
    slot: '07:00 - 08:30',
    type: 'Khách đặt Online',
    deposit: 50000,
    status: 'reserved'
  });
  console.log('Insert Status:', insertRes.status, 'Inserted ID:', insertRes.data ? insertRes.data[0].id : 'none');

  console.log('--- 3. Testing Clean up Test Booking ---');
  const deleteRes = await supabaseRequest('bookings?id=eq.' + testBkId, 'DELETE');
  console.log('Delete Status:', deleteRes.status);
}

testOperations().catch(console.error);
