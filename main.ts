import { buildDossier } from './vendor/makefun-threejs.ts';
import { cpSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

const root = dirname(fileURLToPath(import.meta.url));

const gameDir = join(root, 'game');
if (existsSync(gameDir)) {
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
}

const screenshotsDir = join(root, 'screenshots');
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Dossier successfully written to ${join(outDir, 'dossier.json')}`);
