import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const threeRoot = path.join(root, 'node_modules/three');
mkdirSync(output, { recursive: true });
function copyFile(source, destination) {
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, readFileSync(source));
}
function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else copyFile(from, to);
  }
}
copyDirectory(path.join(root, 'src'), path.join(output, 'src'));
copyDirectory(path.join(root, 'public'), output);
copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));

// Copy only the Three.js modules actually imported by the scene and its addons.
// Native browser import maps resolve these readable files; no compiler is needed.
const copied = new Set();
function copyModule(source, destination) {
  if (copied.has(source)) return;
  copied.add(source);
  const code = readFileSync(source, 'utf8');
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, code);
  const imports = code.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g);
  for (const [, specifier] of imports) {
    if (!specifier.startsWith('.')) continue;
    const dependency = path.resolve(path.dirname(source), specifier);
    const target = path.resolve(path.dirname(destination), specifier);
    if (!dependency.startsWith(threeRoot + path.sep) || !target.startsWith(output + path.sep)) throw new Error('Ongeldig modulepad.');
    copyModule(dependency, target);
  }
}

copyModule(path.join(threeRoot, 'build/three.module.js'), path.join(output, 'vendor/three/three.module.js'));
const addons = [
  'controls/OrbitControls.js',
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js',
  'utils/BufferGeometryUtils.js',
];
for (const addon of addons) copyModule(path.join(threeRoot, 'examples/jsm', addon), path.join(output, 'vendor/three/addons', addon));
copyFile(path.join(threeRoot, 'LICENSE'), path.join(output, 'vendor/three/LICENSE'));
console.log(`Productieversie klaar in dist/ (${copied.size} Three.js-modules).\nStart met: npm run preview`);
