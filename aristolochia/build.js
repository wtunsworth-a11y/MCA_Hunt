/*
 * build.js — produce a single self-contained HTML file from the modular source.
 *
 * Output: dist/MCA_Aristolochia_Survey.html — one file with all CSS, JS, the
 * shared Zone/Ward reference lists and the icon inlined, so it runs when opened
 * straight from disk on a phone (no web server, no separate files, fully
 * offline).
 *
 * Usage:  node build.js        (run from this folder)
 * Re-run this whenever you edit the source in js/, css/ or ../data/reference.json.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

const css = read('css/styles.css');
// Zone/Ward lists are shared with the hunting survey — one set of codes.
const reference = read('../data/reference.json');
const icon = read('icons/icon.svg');
const iconDataUri = 'data:image/svg+xml;base64,' + Buffer.from(icon).toString('base64');

// Concatenate JS in load order (same order as index.html).
const js = ['js/config.js', 'js/db.js', 'js/schema.js', 'js/export.js', 'js/app.js']
  .map(read).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0e7c66">
  <title>MCA Aristolochia Survey</title>
  <link rel="icon" href="${iconDataUri}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${iconDataUri}">
  <style>
${css}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
  // Reference lists (Zone/Ward) inlined so the single file works offline.
  window.__MCA_REFERENCE__ = ${reference};
  </script>
  <script>
${js}
  </script>
</body>
</html>
`;

const outDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const outFile = path.join(outDir, 'MCA_Aristolochia_Survey.html');
fs.writeFileSync(outFile, html);
console.log('Wrote ' + outFile + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
