const fs = require('fs');

const js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// Inspect lines in getInitialState
const start = js.indexOf('function getInitialState()');
console.log(js.slice(start, start + 1600));
