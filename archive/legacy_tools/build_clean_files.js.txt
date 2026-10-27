const fs = require('fs');
const path = require('path');

// Shared CSS styles
const SHARED_HEAD = `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-tap-highlight-color: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.65; }
    }
    .live-dot {
      animation: pulse-dot 1.8s infinite;
    }
    .court-bg-green {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    .court-bg-grey {
      background: linear-gradient(135deg, #475569 0%, #334155 100%);
    }
    @media print {
      body * { visibility: hidden; }
      #print-receipt-area, #print-receipt-area * { visibility: visible; }
      #print-receipt-area { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; }
    }
  </style>
`;

console.log("SHARED_HEAD ready");
