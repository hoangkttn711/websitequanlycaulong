const fs = require('fs');

['build_pc.js', 'build_mobile.js', 'build_index.js'].forEach(file => {
  const filePath = 'c:\\Quan ly san cau\\tools_and_scripts\\' + file;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add Supabase CDN to head if not present
  if (!code.includes('@supabase/supabase-js')) {
    code = code.replace(
      'let headHTML = orig.slice(headStart, headEnd);',
      `let headHTML = orig.slice(headStart, headEnd);
headHTML = headHTML.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\\n</head>');`
    );
  }

  // 2. Add badge to header next to role-mode-badge
  const badgeHTML = `<span id="supabase-status-badge" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"></span><span>Realtime Cloud</span></span>`;
  
  if (!code.includes('id="supabase-status-badge"')) {
    code = code.replace(
      'id="role-mode-badge"',
      `id="role-mode-badge"`
    );
    // Find where role-mode-badge is in the template string
    code = code.replaceAll(
      `id="role-mode-badge"`,
      `id="role-mode-badge"`);
    // Insert badge after role-mode-badge
    code = code.replace(
      /(<span id="role-mode-badge"[^>]*>.*?<\/span>)/g,
      `$1\n              ${badgeHTML}`
    );
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Updated', file, 'with Supabase CDN and badge');
});
