import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distPath, 'index.html');
const notFoundHtmlPath = path.join(distPath, '404.html');

try {
  if (fs.existsSync(indexHtmlPath)) {
    fs.copyFileSync(indexHtmlPath, notFoundHtmlPath);
    console.log('✅ Created 404.html from index.html for GitHub Pages');
  } else {
    console.error('❌ dist/index.html not found. Build the project first.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error creating 404.html:', error);
  process.exit(1);
}
