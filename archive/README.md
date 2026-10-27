# Historical tools

Legacy generators, source patchers, inspections and cloud maintenance scripts are retained as inert `.txt` references in `legacy_tools/`. They are not runtime code and are excluded from the deployment artifact.

Several old scripts contain hardcoded external database targets or unconditional cleanup operations. Do not rename and run them against a live database. Use `npm run build`, `npm test`, `npm run check`, and `npm start` from the repository root.
