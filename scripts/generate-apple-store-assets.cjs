const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'capturas de pantalla');
const DESKTOP_DIR = 'C:\\Users\\carlo\\OneDrive\\Escritorio';
const OUTPUT_BASE = path.join(DESKTOP_DIR, 'Assets-App-Store');

const IPHONE_67_DIR = path.join(OUTPUT_BASE, '01_iPhone_6.7_Pulgadas (1290x2796)');
const IPHONE_65_DIR = path.join(OUTPUT_BASE, '02_iPhone_6.5_Pulgadas (1242x2688)');

[OUTPUT_BASE, IPHONE_67_DIR, IPHONE_65_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. GENERATE APP STORE PROMOTIONAL HEADER (3840 x 1646 px)
async function generateHeaderBanner() {
  console.log('\n--- 1. GENERANDO ENCABEZADO PROMOCIONAL (3840 x 1646 px) ---');
  const width = 3840;
  const height = 1646;

  const isotipoPath = path.join(ROOT_DIR, 'isotipo.png');
  let logoBuffer = null;
  if (fs.existsSync(isotipoPath)) {
    logoBuffer = await sharp(isotipoPath)
      .resize({ width: 750, height: 750, fit: 'contain' })
      .toBuffer();
  }

  const svgBanner = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#030509"/>
        <stop offset="45%" stop-color="#080D1A"/>
        <stop offset="70%" stop-color="#140A10"/>
        <stop offset="100%" stop-color="#020306"/>
      </linearGradient>

      <radialGradient id="redGlow" cx="30%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#FF2323" stop-opacity="0.35"/>
        <stop offset="60%" stop-color="#DC2626" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="blueGlow" cx="80%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25"/>
        <stop offset="70%" stop-color="#1E3A8A" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255, 255, 255, 0.035)" stroke-width="1.5"/>
      </pattern>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <rect width="${width}" height="${height}" fill="url(#redGlow)"/>
    <rect width="${width}" height="${height}" fill="url(#blueGlow)"/>

    <!-- Top Accent Bar -->
    <rect x="0" y="0" width="${width}" height="10" fill="#FF2323"/>

    <!-- Decorative Digital Elements -->
    <text x="140" y="480" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="800" fill="#FF2323" letter-spacing="8">
      // NOTICIAS • INVESTIGACIÓN • COMUNIDAD EN VIVO
    </text>

    <!-- Main Title -->
    <text x="140" y="660" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="140" font-weight="900" fill="#FFFFFF" letter-spacing="2">
      HACKEANDO <tspan fill="#FF2323">EL SISTEMA</tspan>
    </text>

    <!-- Subtitle -->
    <text x="140" y="780" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="46" font-weight="600" fill="#94A3B8" letter-spacing="3">
      Periodismo Digital Independiente &amp; Opinión Pública Dominicana
    </text>

    <!-- Badges Row -->
    <g transform="translate(140, 890)">
      <!-- Pill 1 -->
      <rect x="0" y="0" width="380" height="76" rx="38" fill="rgba(255, 35, 35, 0.15)" stroke="#FF2323" stroke-width="2.5"/>
      <text x="190" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF" text-anchor="middle">
        🔴 RADIO EN VIVO
      </text>

      <!-- Pill 2 -->
      <rect x="420" y="0" width="450" height="76" rx="38" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
      <text x="645" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#E2E8F0" text-anchor="middle">
        📊 MARCADO RES Y ENCUESTAS
      </text>

      <!-- Pill 3 -->
      <rect x="910" y="0" width="410" height="76" rx="38" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
      <text x="1115" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#E2E8F0" text-anchor="middle">
        💬 FEED COMUNITARIO
      </text>
    </g>

    <!-- Footer Tagline -->
    <text x="140" y="1480" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="500" fill="#64748B" letter-spacing="4">
      HACKEANDOELSISTEMA.NET • APP OFICIAL PARA IOS
    </text>
  </svg>
  `;

  const composites = [
    { input: Buffer.from(svgBanner), top: 0, left: 0 },
  ];

  if (logoBuffer) {
    composites.push({
      input: logoBuffer,
      top: Math.round((height - 750) / 2),
      left: width - 950,
    });
  }

  const headerOut = path.join(OUTPUT_BASE, '00_Encabezado_App_Store_3840x1646.png');
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 3, g: 5, b: 9, alpha: 1 },
    },
  })
    .composite(composites)
    .png({ quality: 95 })
    .toFile(headerOut);

  console.log(`✔ Encabezado generado exitosamente: ${headerOut}`);
}

// 2. GENERATE SCREENSHOT WITH STYLISH DEVICE FRAMING FOR APPLE STORE
async function createAppleDeviceScreenshot(sourcePath, targetWidth, targetHeight, captionTitle, captionSubtitle, outputPath) {
  const srcMeta = await sharp(sourcePath).metadata();
  
  // Calculate scaled app screenshot dimensions inside frame
  // App takes ~80% of height and center aligned
  const appHeight = Math.round(targetHeight * 0.77);
  const appWidth = Math.round(appHeight * (srcMeta.width / srcMeta.height));
  
  const resizedApp = await sharp(sourcePath)
    .resize(appWidth, appHeight, { fit: 'cover' })
    .toBuffer();

  // Create rounded corners on the app frame
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

async function generateScreenshots() {
  console.log('\n--- 2. GENERANDO CAPTURAS IPHONE 6.7" Y 6.5" ---');

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

    console.log(`Procesando: ${s.title}...`);

    // iPhone 6.7" (1290 x 2796)
    const out67 = path.join(IPHONE_67_DIR, s.outName);
    await createAppleDeviceScreenshot(srcPath, 1290, 2796, s.title, s.subtitle, out67);

    // iPhone 6.5" (1242 x 2688)
    const out65 = path.join(IPHONE_65_DIR, s.outName);
    await createAppleDeviceScreenshot(srcPath, 1242, 2688, s.title, s.subtitle, out65);
  }

  console.log('\n✔ Todas las capturas para App Store generadas exitosamente.');
}

async function run() {
  await generateHeaderBanner();
  await generateScreenshots();
  console.log(`\n🎉 Todos los assets listos en: ${OUTPUT_BASE}\n`);
}

run().catch(console.error);
