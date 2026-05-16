import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

function assertManagedHideTimer(source, themeName) {
  assert.match(source, /let\s+hideControlsTimer\s*=\s*null/);
  assert.match(source, /clearTimeout\(hideControlsTimer\)/);
  assert.match(source, /hideControlsTimer\s*=\s*setTimeout/);
  assert.match(source, /if\s*\(hideControlsTimer\)\s*\{\s*clearTimeout\(hideControlsTimer\);/);
  assert.match(
    source,
    /videoPlayer\.addEventListener\('pause',[\s\S]*clearTimeout\(hideControlsTimer\)/,
    `${themeName} pause handler should clear pending hide timers`,
  );
}

async function main() {
  const [pixelSource, minimalSource, posterSource] = await Promise.all([
    fs.readFile(new URL('../public/play/pixel/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/play/minimal/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/play/poster/app.js', import.meta.url), 'utf8'),
  ]);

  assertManagedHideTimer(pixelSource, 'pixel');
  assertManagedHideTimer(minimalSource, 'minimal');
  assert.match(posterSource, /let\s+hideControlsTimer\s*=\s*null/);

  console.log('PASS verify-play-theme-controls');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
