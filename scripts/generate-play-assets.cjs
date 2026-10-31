const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '../frontend/node_modules/puppeteer-core'));
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'capturas de pantalla');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function generateScreenshots() {
  console.log('\n--- 1. GENERANDO CAPTURAS MÓVILES (1080 x 1920 px - 9:16) ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--force-dark-mode',
      '--window-size=1080,1920',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 360,
    height: 640,
    deviceScaleFactor: 3, // 360*3 = 1080, 640*3 = 1920 (Exact 9:16)
    isMobile: true,
    hasTouch: true,
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  );

  const targets = [
    {
      name: '01_inicio_noticias.png',
      url: 'https://hackeandoelsistema.net/',
      title: 'Portada y Noticias de Actualidad',
      waitTime: 3500,
    },
    {
      name: '02_lectura_articulo.png',
      url: 'https://hackeandoelsistema.net/secuestro-operacion-militar-o-crisis-anunciada-la-frontera-dominicana-no-se-blinda-con-titulares/',
      title: 'Lectura y Análisis Crítico',
      waitTime: 3500,
    },
    {
      name: '03_seccion_deportes.png',
      url: 'https://hackeandoelsistema.net/deportes',
      title: 'Cobertura Deportiva y Resultados',
      waitTime: 3000,
    },
    {
      name: '04_radio_en_vivo.png',
      url: 'https://hackeandoelsistema.net/radio',
      title: 'Radio y Streaming en Directo',
      waitTime: 3500,
    },
    {
      name: '05_acceso_y_cuenta.png',
      url: 'https://hackeandoelsistema.net/iniciar-sesion',
      title: 'Acceso y Comunidad',
      waitTime: 2500,
    },
  ];

  for (const target of targets) {
    console.log(`Capturando: ${target.title}...`);
    try {
      await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 35000 });
      await new Promise((r) => setTimeout(r, target.waitTime));

      const rawBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 360, height: 640 },
      });

      const finalPath = path.join(OUTPUT_DIR, target.name);
      await sharp(rawBuffer)
        .resize(1080, 1920, { fit: 'cover' })
        .png({ quality: 90, compressionLevel: 8 })
        .toFile(finalPath);

      const stats = fs.statSync(finalPath);
      console.log(`✔ Guardada: ${target.name} (${(stats.size / 1024).toFixed(1)} KB) - 1080 x 1920 px`);
    } catch (err) {
      console.error(`Error capturando ${target.name}:`, err.message);
    }
  }

  await browser.close();
}

async function generateFeatureGraphic() {
  console.log('\n--- 2. GENERANDO GRÁFICO DE FUNCIONES (1024 x 500 px) ---');

  const width = 1024;
  const height = 500;

  // Use isotipo if exists
  const logoPath = path.join(ROOT_DIR, 'isotipo.png');
  let logoBuffer = null;
  if (fs.existsSync(logoPath)) {
    logoBuffer = await sharp(logoPath)
      .resize({ height: 260, width: 260, fit: 'contain' })
      .toBuffer();
  }

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050811"/>
        <stop offset="50%" stop-color="#0a101d"/>
        <stop offset="100%" stop-color="#03050a"/>
      </linearGradient>
      <radialGradient id="redGlow" cx="22%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="blueGlow" cx="80%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"/>
      </pattern>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <rect width="${width}" height="${height}" fill="url(#redGlow)"/>
    <rect width="${width}" height="${height}" fill="url(#blueGlow)"/>

    <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="16" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5"/>

    <g transform="translate(420, 115)">
      <rect x="0" y="0" width="220" height="28" rx="14" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.4)" stroke-width="1"/>
      <circle cx="16" cy="14" r="4" fill="#ef4444"/>
      <text x="30" y="18" fill="#fca5a5" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">APP OFICIAL ANDROID</text>
    </g>

    <text x="420" y="195" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">
      HACKEANDO
    </text>
    <text x="420" y="245" fill="#ef4444" font-family="'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">
      EL SISTEMA
    </text>

    <text x="420" y="295" fill="#9ca3af" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="500">
      Periodismo Digital Independiente
    </text>

    <g transform="translate(420, 345)">
      <rect x="0" y="0" width="105" height="32" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
      <text x="14" y="20" fill="#e5e7eb" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">NOTICIAS</text>

      <rect x="115" y="0" width="105" height="32" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
      <text x="129" y="20" fill="#e5e7eb" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">ANÁLISIS</text>

      <rect x="230" y="0" width="115" height="32" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
      <text x="244" y="20" fill="#e5e7eb" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">DEPORTES</text>

      <rect x="355" y="0" width="95" height="32" rx="8" fill="rgba(239, 68, 68, 0.1)" stroke="rgba(239, 68, 68, 0.3)" stroke-width="1"/>
      <text x="369" y="20" fill="#f87171" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">RADIO</text>
    </g>
  </svg>
  `;

  const composites = [{ input: Buffer.from(svgOverlay), top: 0, left: 0 }];

  if (logoBuffer) {
    composites.push({
      input: logoBuffer,
      top: 120,
      left: 110,
    });
  }

  const featureGraphicPath = path.join(OUTPUT_DIR, 'grafico_de_funciones_1024x500.png');

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 5, g: 8, b: 17, alpha: 1 },
    },
  })
    .composite(composites)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(featureGraphicPath);

  const stats = fs.statSync(featureGraphicPath);
  console.log(`✔ Gráfico de funciones generado: ${featureGraphicPath}`);
  console.log(`  Dimensiones: 1024 x 500 px | Peso: ${(stats.size / 1024).toFixed(1)} KB (Límite Play Store: 15 MB)`);
}

async function main() {
  try {
    await generateFeatureGraphic();
    await generateScreenshots();
    console.log('\n===========================================');
    console.log(`✔ RECURSOS COMPLETADOS EXITOSAMENTE EN:\n  ${OUTPUT_DIR}`);
    console.log('===========================================');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
