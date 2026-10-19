// Copies the self-hosted variable fonts out of node_modules. Fonts are
// committed so the site needs no build step and makes no third-party requests.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'assets/fonts');

const files = [
  ['literata', 'literata-latin-opsz-normal.woff2'],
  ['literata', 'literata-latin-opsz-italic.woff2'],
  ['schibsted-grotesk', 'schibsted-grotesk-latin-wght-normal.woff2'],
];

mkdirSync(dest, { recursive: true });
for (const [pkg, file] of files) {
  copyFileSync(
    join(root, 'node_modules/@fontsource-variable', pkg, 'files', file),
    join(dest, file),
  );
  console.log(`copied ${file}`);
}
