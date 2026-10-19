const fs = require('fs');

const origPath = 'C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html';
const orig = fs.readFileSync(origPath, 'utf8');

const targetStr = 'id="schedule-timeline-body"';
const idx = orig.indexOf(targetStr);
console.log('Index of schedule-timeline-body:', idx);

if (idx !== -1) {
  const start = orig.lastIndexOf('<!-- Visual Court Timeline Grid -->', idx);
  const end = orig.indexOf('<!-- Bookings List Table -->', idx);
  console.log('Start:', start, 'End:', end);
  console.log('Target chunk to replace:');
  console.log(orig.slice(start, end));
}
