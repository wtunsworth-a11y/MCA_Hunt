// Render an HTML review to A4 PDF with Playwright/Chromium.
//   node analysis/render_pdf.js <in.html> <out.pdf>
// Needs Chromium; in the managed remote env set:
//   PW_CHROME=/opt/pw-browsers/chromium-*/chrome-linux/chrome
//   NODE_PATH=/opt/node22/lib/node_modules
const { chromium } = require('playwright');
(async () => {
  const path = require('path');
  const [inHtml, outPdf] = process.argv.slice(2);
  if (!inHtml || !outPdf) { console.error('usage: node render_pdf.js <in.html> <out.pdf>'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: 'light', media: 'screen' });
  await page.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true,
                   margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await browser.close();
  console.log('wrote ' + outPdf);
})();
