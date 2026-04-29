import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xmlDir = path.join(__dirname, 'public', 'xml');
const supportedScoreFilePattern = /\.(musicxml|xml|gtp|gp|gp3|gp4|gp5|gpx)$/i;

// Get all score files the viewer can route to OSMD/VexFlow or alphaTab.
const files = fs.readdirSync(xmlDir).filter(f =>
  supportedScoreFilePattern.test(f)
).sort((a, b) => a.localeCompare(b));

fs.writeFileSync(
  path.join(xmlDir, 'file-list.json'),
  JSON.stringify(files, null, 2)
);
