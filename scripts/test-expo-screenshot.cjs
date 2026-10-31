const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '../frontend/node_modules/puppeteer-core'));
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'capturas de pantalla');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCapture() {
  console.log('Iniciando captura de la app móvil en http://localhost:8081...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--force-dark-mode',
    ],
  });

  const page = await browser.newPage();
  // Standard Android screen dimension (e.g. Pixel 8 / Samsung Galaxy):
  // 390 x 844 at scale 2.769 or 360 x 640 at scale 3
  await page.setViewport({
    width: 360,
    height: 640,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  );

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 6000)); // wait for Expo to bundle & render

  const buffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: 360, height: 640 },
  });

  const testFile = path.join(OUTPUT_DIR, 'test_app_native.png');
  await sharp(buffer)
    .resize(1080, 1920, { fit: 'cover' })
    .toFile(testFile);

  console.log('✔ Captura de app móvil generada con éxito:', testFile);
  await browser.close();
}

testCapture().catch(console.error);
