/**
 * AI 부킹 UI 스크린샷 생성 스크립트
 *
 * 사용법: npx playwright test --config=docs/business/mockups/generate-screenshots.js
 * 또는:  node docs/business/mockups/generate-screenshots.js
 *
 * 요구사항: npx playwright install chromium
 */

const { chromium } = require('playwright');
const path = require('path');

const MOCKUPS_DIR = __dirname;
const IMAGES_DIR = path.join(__dirname, '..', 'images');

// 각 파일별 설정 (viewport 크기, deviceScaleFactor)
const pages = [
  // iPhone 프레임 (390×844) — 폰 모양의 콘텐츠만 캡처
  {
    file: 'step2-results.html',
    output: 'step2-results.png',
    viewport: { width: 390, height: 844 },
    selector: '.phone-frame',
    scale: 2,
  },
  {
    file: 'step3-confirm.html',
    output: 'step3-confirm.png',
    viewport: { width: 390, height: 960 },
    selector: '.phone-frame',
    scale: 2,
  },
  {
    file: 'step4-complete.html',
    output: 'step4-complete.png',
    viewport: { width: 390, height: 844 },
    selector: '.phone-frame',
    scale: 2,
  },
  // 시나리오 카드 (420×auto)
  {
    file: 'scenario1-simple.html',
    output: 'scenario1-simple.png',
    viewport: { width: 420, height: 900 },
    selector: '.card',
    scale: 2,
  },
  {
    file: 'scenario2-weather.html',
    output: 'scenario2-weather.png',
    viewport: { width: 420, height: 900 },
    selector: '.card',
    scale: 2,
  },
  {
    file: 'scenario3-group.html',
    output: 'scenario3-group.png',
    viewport: { width: 420, height: 900 },
    selector: '.card',
    scale: 2,
  },
  // 복합 인포그래픽 (800×auto)
  {
    file: 'ai-booking-flow.html',
    output: 'ai-booking-flow.png',
    viewport: { width: 800, height: 1200 },
    selector: null, // full page
    scale: 2,
  },
  {
    file: 'ai-scenarios.html',
    output: 'ai-scenarios.png',
    viewport: { width: 800, height: 1600 },
    selector: null, // full page
    scale: 2,
  },
];

async function generateScreenshots() {
  const browser = await chromium.launch();

  for (const page of pages) {
    const context = await browser.newContext({
      viewport: page.viewport,
      deviceScaleFactor: page.scale,
    });
    const tab = await context.newPage();

    const filePath = `file://${path.join(MOCKUPS_DIR, page.file)}`;
    await tab.goto(filePath, { waitUntil: 'networkidle' });

    // 잠시 대기 (폰트 렌더링)
    await tab.waitForTimeout(500);

    const outputPath = path.join(IMAGES_DIR, page.output);

    if (page.selector) {
      // 특정 요소만 캡처
      const element = await tab.$(page.selector);
      if (element) {
        await element.screenshot({ path: outputPath });
        console.log(`✅ ${page.output} (element: ${page.selector})`);
      } else {
        console.error(`❌ ${page.output}: selector "${page.selector}" not found`);
      }
    } else {
      // 전체 페이지 캡처
      await tab.screenshot({ path: outputPath, fullPage: true });
      console.log(`✅ ${page.output} (full page)`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 모든 스크린샷 생성 완료!');
}

generateScreenshots().catch((err) => {
  console.error('스크린샷 생성 실패:', err);
  process.exit(1);
});
