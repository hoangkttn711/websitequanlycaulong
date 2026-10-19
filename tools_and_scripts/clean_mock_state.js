const fs = require('fs');

let js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// 1. Replace courts mock state with clean 4 free courts
const oldCourtsRegex = /courts:\s*\[[\s\S]*?products:\s*\[/;
const cleanCourtsAndProducts = `courts: [
            { id: 1, name: 'Sân 1', zone: 'Sân thảm xanh', matColor: 'green', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 2, name: 'Sân 2', zone: 'Sân thảm xanh', matColor: 'green', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 3, name: 'Sân 3', zone: 'Sân thảm xám', matColor: 'grey', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 4, name: 'Sân 4', zone: 'Sân thảm xám', matColor: 'grey', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] }
          ],
          products: [`;

if (oldCourtsRegex.test(js)) {
  js = js.replace(oldCourtsRegex, cleanCourtsAndProducts);
  console.log('Replaced mock courts with clean 4 free courts');
} else {
  console.warn('oldCourtsRegex failed to match');
}

// 2. Replace mock bookings array with empty []
const oldBookingsRegex = /bookings:\s*\[[\s\S]*?invoices:\s*\[/;
const cleanBookingsAndInvoices = `bookings: [],
          invoices: [`;

if (oldBookingsRegex.test(js)) {
  js = js.replace(oldBookingsRegex, cleanBookingsAndInvoices);
  console.log('Replaced mock bookings with empty array []');
} else {
  console.warn('oldBookingsRegex failed to match');
}

// 3. Replace mock invoices array with empty []
const oldInvoicesRegex = /invoices:\s*\[[\s\S]*?\]\s*;\s*\}\s*let state = loadState\(\);/;
const cleanInvoices = `invoices: []
        };
      }

      let state = loadState();`;

if (oldInvoicesRegex.test(js)) {
  js = js.replace(oldInvoicesRegex, cleanInvoices);
  console.log('Replaced mock invoices with empty array []');
} else {
  console.warn('oldInvoicesRegex failed to match');
}

// 4. Clear carts in initial state
js = js.replace(/customerCart:\s*\[[\s\S]*?\],/m, 'customerCart: [],');
js = js.replace(/posCart:\s*\[[\s\S]*?\],/m, 'posCart: [],');

// 5. In loadState(), purge any old mock bookings from localStorage
const purgeCode = `
            // Xóa sạch các đơn mẫu cũ (BK-101, BK-102...) khỏi localStorage trình duyệt
            const mockIds = ['BK-101', 'BK-102', 'BK-103', 'BK-104', 'BK-106', 'BK-107'];
            if (Array.isArray(merged.bookings)) {
              merged.bookings = merged.bookings.filter(b => !mockIds.includes(b.id));
            }
            if (Array.isArray(merged.invoices)) {
              merged.invoices = merged.invoices.filter(i => !i.id || !i.id.startsWith('HD-2610-0'));
            }
`;

if (!js.includes('const mockIds')) {
  js = js.replace('const merged = Object.assign({}, init, parsed);', 'const merged = Object.assign({}, init, parsed);' + purgeCode);
  console.log('Added localStorage purge for old mock data in loadState()');
}

fs.writeFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', js, 'utf8');
console.log('Updated app_logic.js with 100% clean initial state!');
