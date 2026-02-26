/**
 * PROPOSAL.html → PROPOSAL.pdf 변환 스크립트
 *
 * file:// 프로토콜로 HTML을 로드하여 이미지 자동 해석
 *
 * 사용법: node docs/business/mockups/generate-pdf.js
 * 요구사항: npm install playwright
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BUSINESS_DIR = path.join(__dirname, '..');
const HTML_PATH = path.join(BUSINESS_DIR, 'PROPOSAL.html');
const PDF_PATH = path.join(BUSINESS_DIR, 'PROPOSAL.pdf');

async function generatePdf() {
  console.log('🖨️ PDF 생성 중...');
  console.log(`   📄 소스: ${HTML_PATH}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: false,
  });

  await browser.close();

  const stats = fs.statSync(PDF_PATH);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ PROPOSAL.pdf 생성 완료 (${sizeMB} MB)`);
  console.log(`   📄 ${PDF_PATH}`);
}

generatePdf().catch((err) => {
  console.error('PDF 생성 실패:', err);
  process.exit(1);
});
