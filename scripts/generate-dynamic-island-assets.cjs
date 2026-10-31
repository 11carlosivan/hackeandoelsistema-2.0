const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'capturas de pantalla');
const DESKTOP_DIR = 'C:\\Users\\carlo\\OneDrive\\Escritorio';
const DYNAMIC_ISLAND_DIR = path.join(DESKTOP_DIR, 'Assets-App-Store', '04_iPhone_Dynamic_Island_Mediana (1179x2556)');

if (!fs.existsSync(DYNAMIC_ISLAND_DIR)) {
  fs.mkdirSync(DYNAMIC_ISLAND_DIR, { recursive: true });
}

async function createDynamicIslandScreenshot(sourcePath, targetWidth, targetHeight, captionTitle, captionSubtitle, outputPath) {
  const srcMeta = await sharp(sourcePath).metadata();
  
  const appHeight = Math.round(targetHeight * 0.77);
  const appWidth = Math.round(appHeight * (srcMeta.width / srcMeta.height));
  
  const resizedApp = await sharp(sourcePath)
    .resize(appWidth, appHeight, { fit: 'cover' })
    .toBuffer();

  const cornerRadius = Math.round(targetWidth * 0.04);
  const roundedApp = await sharp(resizedApp)
    .composite([{
      input: Buffer.from(`
        <svg width="${appWidth}" height="${appHeight}">
          <rect x="0" y="0" width="${appWidth}" height="${appHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#ffffff"/>
        </svg>
      `),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();

  const appLeft = Math.round((targetWidth - appWidth) / 2);
  const appTop = targetHeight - appHeight + Math.round(targetHeight * 0.02);

  const headerSvg = `
  <svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#080C16"/>
        <stop offset="25%" stop-color="#0E1424"/>
        <stop offset="60%" stop-color="#050811"/>
        <stop offset="100%" stop-color="#020306"/>
      </linearGradient>
      <radialGradient id="topGlow" cx="50%" cy="0%" r="60%">
        <stop offset="0%" stop-color="#DC2626" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="${targetWidth}" height="${targetHeight}" fill="url(#bg)"/>
    <rect width="${targetWidth}" height="${targetHeight}" fill="url(#topGlow)"/>

    <!-- App Mockup Outer Shadow/Border -->
    <rect x="${appLeft - 4}" y="${appTop - 4}" width="${appWidth + 8}" height="${appHeight + 8}" rx="${cornerRadius + 4}" ry="${cornerRadius + 4}" fill="#1E293B" stroke="#334155" stroke-width="2"/>

    <!-- Title and Subtitle -->
    <text x="${targetWidth / 2}" y="${Math.round(targetHeight * 0.08)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(targetWidth * 0.052)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
      ${captionTitle.toUpperCase().replace(/&/g, '&amp;')}
    </text>
    <text x="${targetWidth / 2}" y="${Math.round(targetHeight * 0.12)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(targetWidth * 0.028)}" font-weight="600" fill="#94A3B8" text-anchor="middle" letter-spacing="0.5">
      ${captionSubtitle.replace(/&/g, '&amp;')}
    </text>
  </svg>
  `;

  await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      background: { r: 5, g: 8, b: 17, alpha: 1 },
    },
  })
    .composite([
      { input: Buffer.from(headerSvg), top: 0, left: 0 },
      { input: roundedApp, top: appTop, left: appLeft },
    ])
    .png({ quality: 92 })
    .toFile(outputPath);
}

async function run() {
  console.log('--- GENERANDO CAPTURAS IPHONE DYNAMIC ISLAND MEDIANA (1179 x 2556 px) ---');

  const screens = [
    {
      file: '01_app_portada_titular.png',
      title: 'Noticias al Instante',
      subtitle: 'Periodismo Digital Independiente y Crítico',
      outName: '01_portada_noticias.png',
    },
    {
      file: '02_app_live_streaming.png',
      title: 'Radio & Video en Vivo',
      subtitle: 'Transmisión continua 24/7 de alta definición',
      outName: '02_radio_en_vivo.png',
    },
    {
      file: '03_app_perfil_usuario.png',
      title: 'Comunidad & Perfil',
      subtitle: 'Interacción directa, opiniones y núcleo de lectores',
      outName: '03_comunidad_perfil.png',
    },
    {
      file: '04_app_menu_servicios.png',
      title: 'Servicios & Deportes',
      subtitle: 'Marcadores, clima, divisas y contacto editorial',
      outName: '04_servicios_contacto.png',
    },
    {
      file: '05_app_empleos.png',
      title: 'Bolsa de Empleos',
      subtitle: 'Vacantes laborales y postulaciones seguras',
      outName: '05_bolsa_empleos.png',
    },
  ];

  for (const s of screens) {
    const srcPath = path.join(SCREENSHOTS_DIR, s.file);
    if (!fs.existsSync(srcPath)) continue;

    console.log(`Generando iPhone Dynamic Island: ${s.title}...`);
    const outPath = path.join(DYNAMIC_ISLAND_DIR, s.outName);
    await createDynamicIslandScreenshot(srcPath, 1179, 2556, s.title, s.subtitle, outPath);
  }

  console.log('✔ Todas las capturas generadas exitosamente en:', DYNAMIC_ISLAND_DIR);
}

run().catch(console.error);
