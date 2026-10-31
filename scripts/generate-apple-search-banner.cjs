const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = 'C:\\Users\\carlo\\OneDrive\\Escritorio\\Assets-App-Store';

async function generateSearchResultsBanner(width, height, filename) {
  console.log(`Generando banner: ${filename} (${width}x${height})...`);
  
  const isotipoPath = path.join(ROOT_DIR, 'isotipo.png');
  let logoBuffer = null;
  const logoSize = Math.round(height * 0.45);
  if (fs.existsSync(isotipoPath)) {
    logoBuffer = await sharp(isotipoPath)
      .resize({ width: logoSize, height: logoSize, fit: 'contain' })
      .toBuffer();
  }

  const svgBanner = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#020408"/>
        <stop offset="40%" stop-color="#080D1A"/>
        <stop offset="70%" stop-color="#140A10"/>
        <stop offset="100%" stop-color="#010204"/>
      </linearGradient>

      <radialGradient id="redGlow" cx="25%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#FF2323" stop-opacity="0.35"/>
        <stop offset="60%" stop-color="#DC2626" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="blueGlow" cx="80%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25"/>
        <stop offset="70%" stop-color="#1E3A8A" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <pattern id="grid" width="${Math.round(width * 0.02)}" height="${Math.round(width * 0.02)}" patternUnits="userSpaceOnUse">
        <path d="M ${Math.round(width * 0.02)} 0 L 0 0 0 ${Math.round(width * 0.02)}" fill="none" stroke="rgba(255, 255, 255, 0.035)" stroke-width="1.5"/>
      </pattern>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <rect width="${width}" height="${height}" fill="url(#redGlow)"/>
    <rect width="${width}" height="${height}" fill="url(#blueGlow)"/>

    <!-- Accent line -->
    <rect x="0" y="0" width="${width}" height="${Math.round(height * 0.01)}" fill="#FF2323"/>

    <!-- Eyebrow -->
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.35)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.016)}" font-weight="800" fill="#FF2323" letter-spacing="6">
      // APP OFICIAL • PERIODISMO DIGITAL INDEPENDIENTE
    </text>

    <!-- Main Title -->
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.48)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.056)}" font-weight="900" fill="#FFFFFF" letter-spacing="2">
      HACKEANDO <tspan fill="#FF2323">EL SISTEMA</tspan>
    </text>

    <!-- Subtitle -->
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.58)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.022)}" font-weight="600" fill="#94A3B8" letter-spacing="1">
      Noticias de Actualidad, Análisis Político y Cobertura Nacional
    </text>

    <!-- Tags Row -->
    <g transform="translate(${Math.round(width * 0.08)}, ${Math.round(height * 0.67)})">
      <!-- Tag 1 -->
      <rect x="0" y="0" width="${Math.round(width * 0.16)}" height="${Math.round(height * 0.065)}" rx="${Math.round(height * 0.032)}" fill="rgba(255, 35, 35, 0.18)" stroke="#FF2323" stroke-width="2"/>
      <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.042)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.013)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
        🔴 EN VIVO 24/7
      </text>

      <!-- Tag 2 -->
      <rect x="${Math.round(width * 0.18)}" y="0" width="${Math.round(width * 0.18)}" height="${Math.round(height * 0.065)}" rx="${Math.round(height * 0.032)}" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
      <text x="${Math.round(width * 0.27)}" y="${Math.round(height * 0.042)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.013)}" font-weight="700" fill="#E2E8F0" text-anchor="middle">
        📊 DEPORTES Y ENCUESTAS
      </text>

      <!-- Tag 3 -->
      <rect x="${Math.round(width * 0.38)}" y="0" width="${Math.round(width * 0.17)}" height="${Math.round(height * 0.065)}" rx="${Math.round(height * 0.032)}" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
      <text x="${Math.round(width * 0.465)}" y="${Math.round(height * 0.042)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.013)}" font-weight="700" fill="#E2E8F0" text-anchor="middle">
        💼 EMPLEOS Y COMUNIDAD
      </text>
    </g>

    <!-- Bottom URL -->
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.88)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(width * 0.012)}" font-weight="600" fill="#64748B" letter-spacing="3">
      HACKEANDOELSISTEMA.NET • SANTO DOMINGO, RD
    </text>
  </svg>
  `;

  const composites = [
    { input: Buffer.from(svgBanner), top: 0, left: 0 },
  ];

  if (logoBuffer) {
    composites.push({
      input: logoBuffer,
      top: Math.round((height - logoSize) / 2),
      left: Math.round(width * 0.72),
    });
  }

  const outPath = path.join(OUTPUT_DIR, filename);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 2, g: 4, b: 8, alpha: 1 },
    },
  })
    .composite(composites)
    .png({ quality: 95 })
    .toFile(outPath);

  console.log(`✔ Guardado: ${outPath}`);
}

async function run() {
  // 1. Apple Search Results Banner (Exact 3840 x 2560 px)
  await generateSearchResultsBanner(3840, 2560, '01_Resultados_Busqueda_3840x2560.png');
  
  // 2. Apple Search Results Banner (1920 x 1280 px - lighter alternative)
  await generateSearchResultsBanner(1920, 1280, '01_Resultados_Busqueda_1920x1280.png');

  // 3. Apple Universal Banner (5244 x 2950 px)
  await generateSearchResultsBanner(5244, 2950, '02_Banner_Universal_5244x2950.png');
}

run().catch(console.error);
