import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function read(relativePath) {
  const fileUrl = new URL(`../${relativePath}`, import.meta.url);
  return fs.readFile(fileUrl, 'utf8');
}

const appScss = await read('app.scss');
const variablesScss = await read('styles/variables.scss');
const animationsScss = await read('styles/animations.scss');
const writeMenuWxml = await read('pages/write-menu/write-menu.wxml');
const writeAppWxml = await read('pages/write-app/write-app.wxml');
const writeWebWxml = await read('pages/write-web/write-web.wxml');
const writeMusicWxml = await read('pages/write-music/write-music.wxml');
const writeWifiWxml = await read('pages/write-wifi/write-wifi.wxml');
const writeLocalMediaWxml = await read('pages/write-local-media/write-local-media.wxml');
const myFilesWxml = await read('pages/my-files/my-files.wxml');
const customTabBarScss = await read('custom-tab-bar/index.scss');
const pixelToastScss = await read('components/pixel-toast/pixel-toast.scss');
const scanDialogScss = await read('components/scan-dialog/scan-dialog.scss');
const writeLocalMediaScss = await read('pages/write-local-media/write-local-media.scss');

assert.match(appScss, /@import\s+["']\.\/styles\/animations\.scss["'];/, 'app.scss should import the global animation utilities');
assert.match(variablesScss, /\$motion-duration-scan-loop:\s*1600ms;/, 'variables.scss should define the scan loop timing token');
assert.match(variablesScss, /\$motion-duration-scan-sweep:\s*420ms;/, 'variables.scss should define the scan sweep timing token');
assert.match(animationsScss, /@keyframes\s+motionFadeLift/, 'animations.scss should define motionFadeLift keyframes');
assert.match(animationsScss, /\.motion-enter\b/, 'animations.scss should expose a motion-enter utility');
assert.match(animationsScss, /\.motion-sheet\b/, 'animations.scss should expose a motion-sheet utility');
assert.match(animationsScss, /\.motion-pressable\b/, 'animations.scss should expose a motion-pressable utility');
assert.match(animationsScss, /\.motion-scan-sweep\b/, 'animations.scss should expose motion-scan-sweep');
assert.match(animationsScss, /\.motion-scan-loop\b/, 'animations.scss should expose motion-scan-loop');
assert.match(animationsScss, /\.motion-scan-lock\b/, 'animations.scss should expose motion-scan-lock');
assert.match(animationsScss, /\.motion-scan-processing\b/, 'animations.scss should expose motion-scan-processing');
assert.match(animationsScss, /\.motion-scan-complete\b/, 'animations.scss should expose motion-scan-complete');
assert.match(animationsScss, /\.motion-scan-alert\b/, 'animations.scss should expose motion-scan-alert');

assert.match(writeMenuWxml, /motion-enter/, 'write-menu should opt into enter animations');
assert.match(writeMenuWxml, /motion-pressable/, 'write-menu cards should opt into press feedback');
assert.match(writeAppWxml, /motion-enter/, 'write-app should opt into enter animations');
assert.match(
  writeAppWxml,
  /class="box box--select motion-pressable"/,
  'write-app picker trigger should use the same press feedback as the rest of the productive layer'
);
assert.match(
  writeAppWxml,
  /class="\{\{item\.className\}\} motion-pressable"/,
  'write-app picker list items should expose press feedback through the shared utility'
);
assert.doesNotMatch(writeAppWxml, /motion-scan-/, 'write-app should not add scan semantics before scan-dialog opens');
assert.match(writeWifiWxml, /motion-sheet/, 'write-wifi picker should use sheet animation');
assert.doesNotMatch(writeWebWxml, /motion-scan-/, 'write-web should stay scan-free before scan-dialog opens');
assert.doesNotMatch(writeMusicWxml, /motion-scan-/, 'write-music should stay scan-free before scan-dialog opens');
assert.doesNotMatch(writeLocalMediaWxml, /motion-scan-/, 'write-local-media should stay scan-free before scan-dialog opens');
assert.doesNotMatch(writeMenuWxml, /motion-scan-/, 'write-menu should stay scan-free');
assert.doesNotMatch(myFilesWxml, /motion-scan-/, 'my-files should stay scan-free');
assert.match(
  writeLocalMediaScss,
  /\.loading-overlay__spinner\s*\{[\s\S]*animation:\s*spin\s+0\.8s\s+steps\(8\)\s+infinite;/,
  'write-local-media should keep upload processing separate from scan semantics'
);

assert.match(customTabBarScss, /motion-tab-bar-rise/, 'custom tab bar should define its own entry animation');
assert.match(pixelToastScss, /toastSlideOut/, 'pixel toast should support a matching exit animation');
assert.doesNotMatch(pixelToastScss, /text-transform:\s*uppercase/, 'pixel toast should not force uppercase text');
assert.match(scanDialogScss, /dialogEnter/, 'scan-dialog should define a dialog enter animation');

console.log('PASS verify-motion-system');
