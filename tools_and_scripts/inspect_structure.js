const fs = require('fs');
const orig = fs.readFileSync('C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html', 'utf8');

const scriptStart = orig.lastIndexOf('<script>');
const htmlBeforeScript = orig.slice(0, scriptStart);
const scriptAndAfter = orig.slice(scriptStart);

console.log('HTML before script length:', htmlBeforeScript.length);
console.log('Script and after length:', scriptAndAfter.length);

// Let's inspect the main sections in htmlBeforeScript
const lines = htmlBeforeScript.split('\n');
console.log('Total HTML lines before script:', lines.length);

// Find headers, sections, modals
lines.forEach((line, i) => {
  if (line.includes('<header') || line.includes('</header>') ||
      line.includes('<section') || line.includes('</section>') ||
      line.includes('<footer') || line.includes('id="modal-')) {
    console.log(`Line ${i+1}: ${line.trim().slice(0, 100)}`);
  }
});
