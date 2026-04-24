import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'fs/promises';

const watch = process.argv.includes('--watch');

// Clean dist and recreate directory structure
await rm('dist', { recursive: true, force: true });
await mkdir('dist/icons', { recursive: true });

// Copy static assets (manifest, HTML, JSON, icons)
await Promise.all([
  cp('manifest.json',  'dist/manifest.json'),
  cp('shortcuts.json', 'dist/shortcuts.json'),
  cp('popup.html',     'dist/popup.html'),
  cp('options.html',   'dist/options.html'),
  cp('icons',          'dist/icons', { recursive: true }),
]);

const buildOptions = {
  entryPoints: ['content.js', 'popup.js', 'options.js'],
  bundle: true,
  outdir: 'dist',
  platform: 'browser',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[build] watching for JS changes — reload the extension after each rebuild');
} else {
  await esbuild.build(buildOptions);
  console.log('[build] dist/ is ready — load dist/manifest.json in about:debugging');
}
