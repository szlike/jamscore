import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xmlDir = path.join(__dirname, 'public', 'xml');

// Get all .xml and .musicxml files
const files = fs.readdirSync(xmlDir).filter(f =>
  f.endsWith('.xml') || f.endsWith('.musicxml')
);

fs.writeFileSync(
  path.join(xmlDir, 'file-list.json'),
  JSON.stringify(files, null, 2)
);