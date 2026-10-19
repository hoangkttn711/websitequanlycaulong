const fs = require('fs');
const path = require('path');

console.log('=== STARTING THOROUGH CLEANUP OF ALL DEMO DATA & REMOVING RESET-DEMO ===');

// 1. UPDATE app_logic.js
const appLogicPath = path.join(__dirname, 'app_logic.js');
let logic = fs.readFileSync(appLogicPath, 'utf8');

// A. Bump STORAGE_KEY to v5
logic = logic.replace(
  /const STORAGE_KEY = 'smashcourt_pro_state_v[0-9]+';/,
  "const STORAGE_KEY = 'smashcourt_pro_state_v5';"
);

// B. Set soldToday: 0 for all products in getInitialState()
logic = logic.replace(/soldToday:\s*[0-9]+/g, 'soldToday: 0');

// C. In loadState(), ensure all products have soldToday = 0
if (!logic.includes('p.soldToday = 0;')) {
  const loadStateProductsTarget = 'if (Array.isArray(merged.products)) {';
  const loadStateProductsReplacement = `if (Array.isArray(merged.products)) {
              merged.products.forEach(p => { p.soldToday = 0; });`;
  logic = logic.replace(loadStateProductsTarget, loadStateProductsReplacement);
}

// D. Clean renderCharts() - replace hardcoded values with 100% genuine calculation
const oldChartsStart = 'function renderCharts() {';
const oldChartsEnd = '// ==================== MODAL CHECKOUT LOGIC ====================';
const startIdx = logic.indexOf(oldChartsStart);
const endIdx = logic.indexOf(oldChartsEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newChartsCode = `function renderCharts() {
        if (typeof Chart === 'undefined') return;

        const todayCourtRev = state.invoices.reduce((s, i) => s + (i.courtFee || 0), 0);
        const todayPosRev = state.invoices.reduce((s, i) => s + (i.posFee || 0), 0);

        // Tạo 7 ngày gần nhất thực tế (từ 6 ngày trước đến hôm nay)
        const labels = [];
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (i === 0) {
            labels.push('Hôm nay');
          } else {
            labels.push(\`\${dayNames[d.getDay()]} (\${String(d.getDate()).padStart(2, '0')}/\${String(d.getMonth() + 1).padStart(2, '0')})\`);
          }
        }

        const ctxWeekly = document.getElementById('chart-weekly-revenue');
        if (ctxWeekly) {
          if (weeklyChartInstance) weeklyChartInstance.destroy();
          weeklyChartInstance = new Chart(ctxWeekly, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Tiền thuê sân',
                  data: [0, 0, 0, 0, 0, 0, todayCourtRev],
                  backgroundColor: '#059669',
                  borderRadius: 6
                },
                {
                  label: 'Doanh thu POS (Nước, Cầu, Quấn cán)',
                  data: [0, 0, 0, 0, 0, 0, todayPosRev],
                  backgroundColor: '#f59e0b',
                  borderRadius: 6
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' }
              },
              scales: {
                x: { stacked: true },
                y: {
                  stacked: true,
                  ticks: {
                    callback: function (value) {
                      return (value / 1000).toLocaleString('vi-VN') + 'k';
                    }
                  }
                }
              }
            }
          });
        }

        // Tính cơ cấu doanh thu thực tế từ invoices
        const courtShare = todayCourtRev;
        let shuttleShare = 0, drinkShare = 0, gripShare = 0, rentalShare = 0;
        state.invoices.forEach(inv => {
          (inv.items || []).forEach(it => {
            const p = state.products.find(prod => prod.name === it.name);
            const lineTotal = (it.price || 0) * (it.qty || 1);
            if (p) {
              if (p.category === 'shuttle') shuttleShare += lineTotal;
              else if (p.category === 'drink') drinkShare += lineTotal;
              else if (p.category === 'grip') gripShare += lineTotal;
              else if (p.category === 'rental') rentalShare += lineTotal;
            } else {
              drinkShare += lineTotal;
            }
          });
        });

        const totalShares = courtShare + shuttleShare + drinkShare + gripShare + rentalShare;
        const chartData = totalShares > 0
          ? [courtShare, shuttleShare, drinkShare, gripShare, rentalShare]
          : [0, 0, 0, 0, 0];

        const ctxCat = document.getElementById('chart-category-share');
        if (ctxCat) {
          if (categoryChartInstance) categoryChartInstance.destroy();
          categoryChartInstance = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
              labels: ['Tiền thuê sân', 'Ống cầu & Quả cầu', 'Nước giải khát', 'Quấn cán & Phụ kiện', 'Thuê vợt & Giày'],
              datasets: [{
                data: chartData,
                backgroundColor: ['#059669', '#f59e0b', '#0284c7', '#7c3aed', '#64748b'],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
              }
            }
          });
        }
      }

      `;
  logic = logic.slice(0, startIdx) + newChartsCode + logic.slice(endIdx);
  console.log('✓ renderCharts() cleaned of all hardcoded fake revenue');
}

// E. Remove btn-reset-demo listener from app_logic.js
const resetListenerRegex = /\/\/\s*Reset Demo Data[\s\S]*?showToast\('Đã khôi phục dữ liệu mẫu ban đầu!'\);\s*\}\);/g;
logic = logic.replace(resetListenerRegex, '// Reset Demo Data removed');

fs.writeFileSync(appLogicPath, logic, 'utf8');
console.log('✓ app_logic.js fully cleaned and saved');

// 2. UPDATE build_pc.js, build_index.js, build_mobile.js
function cleanBuilder(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // A. Remove btn-reset-demo button from HTML
  content = content.replace(/<button[^>]*id="btn-reset-demo"[^>]*>[\s\S]*?<\/button>/gi, '');

  // B. Clean prefilled input values in modalsHTML
  const modalSliceTarget = 'const modalsHTML = orig.slice(modalActualStart, scriptStart);';
  const modalCleanCode = `let modalsHTML = orig.slice(modalActualStart, scriptStart);
// Clean all prefilled demo inputs in modals
modalsHTML = modalsHTML.replace('value="17:30 - 19:00"', '');
modalsHTML = modalsHTML.replace('value="50000"', 'value="0" placeholder="0"');
modalsHTML = modalsHTML.replace('value="Chai"', 'placeholder="Chai, Cái, Ống..."');
modalsHTML = modalsHTML.replace('value="8000"', 'placeholder="0"');
modalsHTML = modalsHTML.replace('value="15000"', 'placeholder="0"');
modalsHTML = modalsHTML.replace('value="48"', 'placeholder="0"');
`;
  if (content.includes(modalSliceTarget)) {
    content = content.replace(modalSliceTarget, modalCleanCode);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Cleaned ${path.basename(filePath)}`);
}

cleanBuilder(path.join(__dirname, 'build_pc.js'));
cleanBuilder(path.join(__dirname, 'build_index.js'));
cleanBuilder(path.join(__dirname, 'build_mobile.js'));

console.log('=== BUILDERS UPDATED ===');
