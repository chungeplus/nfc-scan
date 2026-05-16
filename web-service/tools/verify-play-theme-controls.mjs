import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

function assertManagedHideTimer(source, themeName) {
  assert.match(source, /let\s+hideControlsTimer\s*=\s*null/, `${themeName} should declare a hide-controls timer`);
  assert.match(source, /clearTimeout\(hideControlsTimer\)/, `${themeName} should clear the prior hide-controls timer`);
  assert.match(source, /hideControlsTimer\s*=\s*setTimeout/, `${themeName} should store the hide-controls timeout handle`);
  assert.match(
    source,
    /if\s*\(hideControlsTimer\)\s*\{\s*clearTimeout\(hideControlsTimer\);/,
    `${themeName} reset path should clear any pending hide timer`,
  );
  assert.match(
    source,
    /videoPlayer\.addEventListener\('pause',[\s\S]*clearTimeout\(hideControlsTimer\)/,
    `${themeName} pause handler should clear pending hide timers`,
  );
}

async function main() {
  const [pixelSource, minimalSource, posterSource, verifierSource] = await Promise.all([
    fs.readFile(new URL('../public/play/pixel/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/play/minimal/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/play/poster/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL(import.meta.url), 'utf8'),
  ]);

  assertManagedHideTimer(pixelSource, 'pixel');
  assertManagedHideTimer(minimalSource, 'minimal');
  assertManagedHideTimer(posterSource, 'poster');
  assert.doesNotThrow(() => new vm.Script(pixelSource), 'pixel player script should be syntactically valid');
  assert.doesNotThrow(() => new vm.Script(minimalSource), 'minimal player script should be syntactically valid');
  assert.doesNotThrow(() => new vm.Script(posterSource), 'poster player script should be syntactically valid');
  assert.doesNotMatch(
    verifierSource,
    /\.\.\/play-web-service\//,
    'theme-controls verifier should not point back to the old project path',
  );

  console.log('PASS verify-play-theme-controls');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
