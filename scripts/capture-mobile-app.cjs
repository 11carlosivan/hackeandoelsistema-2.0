const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '../frontend/node_modules/puppeteer-core'));
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'capturas de pantalla');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const screens = [
  {
    file: '01_app_portada_titular.png',
    url: 'http://localhost:8081',
    name: 'Portada y Titular Destacado',
    waitMs: 8000,
    scrollDown: 0,
  },
  {
    file: '02_app_live_streaming.png',
    url: 'http://localhost:8081/(tabs)/live',
    name: 'Live Streaming y Radio Oficial',
    waitMs: 4000,
    scrollDown: 0,
  },
  {
    file: '03_app_perfil_usuario.png',
    url: 'http://localhost:8081/(tabs)/profile',
    name: 'Perfil de Usuario, Guardados y Ajustes',
    waitMs: 4000,
    scrollDown: 0,
  },
  {
    file: '04_app_menu_servicios.png',
    url: 'http://localhost:8081/(tabs)/menu',
    name: 'Menú de Tendencias y Servicios HES',
    waitMs: 4000,
    scrollDown: 0,
  },
  {
    file: '05_app_empleos.png',
    url: 'http://localhost:8081/(tabs)/jobs',
    name: 'Bolsa de Empleos y Convocatorias',
    waitMs: 4000,
    scrollDown: 0,
  },
  {
    file: '06_app_login_seguro.png',
    url: 'http://localhost:8081/login',
    name: 'Acceso Seguro y Registro de Miembros',
    waitMs: 3500,
    scrollDown: 0,
  },
];

async function captureAllAppScreens() {
  console.log('--- CAPTURANDO PANTALLAS REALES DE LA APLICACIÓN ANDROID NATIVA ---');

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
  
  // 360 x 640 @ scale 3 = 1080 x 1920 (Exact 9:16 aspect ratio standard for Google Play)
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

  for (const item of screens) {
    console.log(`\nCapturando [PANTALLA APP]: ${item.name}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 50000 });
      await new Promise(r => setTimeout(r, item.waitMs));

      if (item.scrollDown > 0) {
        await page.evaluate((y) => window.scrollBy(0, y), item.scrollDown);
        await new Promise(r => setTimeout(r, 1000));
      }

      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 360, height: 640 },
      });

      const finalPath = path.join(OUTPUT_DIR, item.file);
      await sharp(buffer)
        .resize(1080, 1920, { fit: 'cover' })
        .png({ quality: 92, compressionLevel: 8 })
        .toFile(finalPath);

      const stats = fs.statSync(finalPath);
      console.log(`✔ Guardada: ${item.file} | ${(stats.size / 1024).toFixed(1)} KB | 1080 x 1920 px (9:16)`);
    } catch (err) {
      console.error(`Error capturando ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n✔ CAPTURAS DE LA APLICACIÓN ANDROID NATIVA FINALIZADAS CON ÉXITO.');
}

captureAllAppScreens().catch(console.error);
