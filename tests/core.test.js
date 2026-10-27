const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../tools_and_scripts/app_core');
test('venue date and day selection do not depend on device timezone',()=>{
 assert.equal(C.dateKey('2026-10-27T18:00:00Z'),'2026-10-28');
 assert.equal(C.nowMinutes('2026-10-27T18:00:00Z'),60);
 assert.equal(C.bookingDate('tomorrow',new Date('2026-10-27T10:00:00Z')),'2026-10-28');
});
test('all noncontiguous ranges survive parsing and adjacent ranges do not overlap',()=>{
 const rs=C.ranges('18:00 - 18:30, 20:00 - 20:30',true);assert.equal(rs.length,2);
 assert(C.overlap(rs[1],{startMin:1200,endMin:1230}));assert(!C.overlap(rs[0],{startMin:1110,endMin:1140}));
 for(const slot of ['25:00 - 26:00','18:00 - 17:00','04:30 - 05:00','22:30 - 23:30','18:00 - 19:00, 18:30 - 19:30'])assert.throws(()=>C.ranges(slot,true));
});
test('pricing integrates exact minutes across both peak boundaries',()=>{
 assert.equal(C.fee('16:30','17:30').fee,70000);assert.equal(C.fee('20:30','21:30').fee,70000);
 assert.equal(C.fee('17:01','17:02').fee,1333);assert.equal(C.fee('22:00','23:00').fee,60000);
 assert.throws(()=>C.fee('18:00','17:00'));
});
test('stock is reversible and cannot be oversold or decremented without an item',()=>{
 const p={id:'p1',name:'Water',stock:10,price:10000,category:'drink'},c={status:'active',items:[]};
 C.adjustItem(c,p,2);C.adjustItem(c,p,-1);assert.equal(p.stock,9);assert.equal(c.items[0].qty,1);
 assert.throws(()=>C.adjustItem(c,p,10));C.adjustItem(c,p,-1);assert.equal(p.stock,10);assert.throws(()=>C.adjustItem(c,p,-1));
});
test('zero amounts are preserved and HTML is escaped',()=>{
 assert.equal(C.amount(0),0);assert.throws(()=>C.amount(-1));assert.throws(()=>C.amount(0.2));
 assert.equal(C.escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('checkout distinguishes discounts, deposits, collection and excess-deposit refunds',()=>{
 assert.deepEqual(C.checkoutTotals(80000,12000,0,50000),{total:92000,paymentAmount:42000,depositApplied:50000,refundAmount:0});
 assert.deepEqual(C.checkoutTotals(30000,0,0,50000),{total:30000,paymentAmount:0,depositApplied:30000,refundAmount:20000});
 assert.throws(()=>C.checkoutTotals(30000,0,50000,0));
});
