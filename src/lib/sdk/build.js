const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../');
const distDir = path.join(srcDir, 'dist');
const typesDir = path.join(distDir, 'types');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(typesDir)) fs.mkdirSync(typesDir, { recursive: true });

fs.copyFileSync(path.join(srcDir, 'types.ts'), path.join(distDir, 'types.ts'));
fs.copyFileSync(path.join(srcDir, 'types.d.ts'), path.join(typesDir, 'index.d.ts'));

const indexJs = fs.readFileSync(path.join(srcDir, 'index.ts'), 'utf8');
const typeDefs = fs.readFileSync(path.join(srcDir, 'types.ts'), 'utf8');
const typeDefsOut = typeDefs.replace(/import.*from.*types.*;/g, '').replace(/export type /g, 'export ').replace(/export interface /g, 'export interface ');

fs.writeFileSync(path.join(typesDir, 'index.d.ts'), typeDefsOut);
fs.writeFileSync(path.join(distDir, 'index.d.ts'), typeDefsOut);

console.log('Built SDK to dist/');