const fs = require('fs');

const js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

function extractFn(name) {
  const start = js.indexOf(`function ${name}`);
  const nextFn = js.indexOf('function ', start + 10);
  return js.slice(start, nextFn);
}

const timeToMinutesCode = extractFn('timeToMinutes');
const minutesToTimeCode = extractFn('minutesToTime');
const parseSlotRangeCode = extractFn('parseSlotRange');
const isTimeOverlappingCode = extractFn('isTimeOverlapping');

eval(timeToMinutesCode);
eval(minutesToTimeCode);
eval(parseSlotRangeCode);
eval(isTimeOverlappingCode);

const slot = '21:00 - 22:00';
const r = parseSlotRange(slot);
console.log('Parsed range for', slot, ':', r);

// Test slot 21:00 - 21:30
const s1Start = timeToMinutes('21:00');
const s1End = timeToMinutes('21:30');
console.log('Is overlapping 21:00 - 21:30:', isTimeOverlapping(s1Start, s1End, r.startMin, r.endMin));

// Test slot 21:30 - 22:00
const s2Start = timeToMinutes('21:30');
const s2End = timeToMinutes('22:00');
console.log('Is overlapping 21:30 - 22:00:', isTimeOverlapping(s2Start, s2End, r.startMin, r.endMin));
