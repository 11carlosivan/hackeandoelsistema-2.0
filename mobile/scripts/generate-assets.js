import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'mobile', 'assets', 'images');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1x1 solid PNG base64
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Png, 'base64');

['icon.png', 'splash-icon.png', 'android-icon-foreground.png'].forEach((file) => {
  fs.writeFileSync(path.join(dir, file), buffer);
});

console.log('Mobile assets created successfully');
