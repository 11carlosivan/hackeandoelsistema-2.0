import fs from 'fs';
import path from 'path';

const source = path.join(process.cwd(), '.next', 'static');
const destination = path.join(process.cwd(), 'public', '_next', 'static');

try {
  // Eliminar destino si ya existe para limpiar compilaciones anteriores
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
    console.log('Directorio anterior public/_next/static eliminado.');
  }

  // Crear directorios intermedios
  fs.mkdirSync(destination, { recursive: true });

  // Copiar recursivamente
  fs.cpSync(source, destination, { recursive: true });
  console.log('Copia exitosa de .next/static a public/_next/static.');
} catch (err) {
  console.error('Error al copiar los archivos estáticos en el postbuild:', err.message);
  process.exit(1);
}
