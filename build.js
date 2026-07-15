const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const CleanCSS = require('clean-css');

(async () => {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  const jsFiles = [
    'js/firebase-init.js',
    'js/firebase-sync.js',
    'js/globals.js',
    'js/router.js',
    'js/ui.js',
    'js/media.js',
    'js/plants-form.js',
    'js/plants-grid.js',
    'js/plants-detail.js',
    'js/diary.js',
    'js/stats.js',
    'js/tools.js',
    'js/io.js'
  ];

  let combinedJs = '';
  for (const file of jsFiles) {
    combinedJs += fs.readFileSync(file, 'utf8') + '\n';
  }

  const minifiedJs = await terserMinify(combinedJs, {
    compress: { passes: 2 },
    mangle: true
  });

  fs.writeFileSync('dist/bundle.js', minifiedJs.code);

  let indexHtml = fs.readFileSync('index.html', 'utf8');
  for (const file of jsFiles) {
    indexHtml = indexHtml.replace(new RegExp(`<script src="${file}"></script>\\s*`), '');
  }
  indexHtml = indexHtml.replace('</body>', '    <script src="bundle.js"></script>\n</body>');
  fs.writeFileSync('dist/index.html', indexHtml);

  const css = fs.readFileSync('style.css', 'utf8');
  const minifiedCss = new CleanCSS({}).minify(css).styles;
  fs.writeFileSync('dist/style.css', minifiedCss);

  let sw = fs.readFileSync('sw.js', 'utf8');
  sw = sw.replace(
    /const urlsToCache = \[[\s\S]*?\];/,
    `const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './bundle.js'
];`
  );
  const minifiedSw = await terserMinify(sw, { compress: true, mangle: true });
  fs.writeFileSync('dist/sw.js', minifiedSw.code);

  fs.copyFileSync('manifest.json', 'dist/manifest.json');

  console.log('Build complete! Output in dist/');
})();
