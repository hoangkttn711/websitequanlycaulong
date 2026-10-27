const fs = require('fs');

['build_pc.js', 'build_mobile.js', 'build_index.js'].forEach(f => {
  const fullPath = 'c:\\Quan ly san cau\\tools_and_scripts\\' + f;
  let code = fs.readFileSync(fullPath, 'utf8');
  console.log(f, 'has app_logic.js reference:');
  const matches = code.match(/app_logic\.js/g);
  console.log(' ', matches);
  // Update path if needed
  if (code.includes("'c:\\\\Quan ly san cau\\\\app_logic.js'")) {
    code = code.replace("'c:\\\\Quan ly san cau\\\\app_logic.js'", "'c:\\\\Quan ly san cau\\\\tools_and_scripts\\\\app_logic.js'");
    fs.writeFileSync(fullPath, code, 'utf8');
    console.log('  Updated app_logic path in', f);
  }
});
