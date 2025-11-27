const fs = require('fs');
const path = require('path');

// Usage: node inject-meta.cjs [siteBase]
// siteBase default: https://gushiken-base.vercel.app
const siteBase = process.argv[2] || 'https://gushiken-base.vercel.app';
const root = process.cwd();
const metaPath = path.join(root, '_meta.html');

if (!fs.existsSync(metaPath)) {
  console.error('_meta.html not found in', root);
  process.exit(1);
}

const metaTpl = fs.readFileSync(metaPath, 'utf8');

function injectToFile(file) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const canonical = rel === 'index.html' ? `${siteBase}/` : `${siteBase}/${rel}`;
  const meta = metaTpl.replace(/{{SITE_URL}}/g, siteBase).replace(/{{CANONICAL}}/g, canonical);

  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('<!-- META:INCLUDE -->')) {
    html = html.replace('<!-- META:INCLUDE -->', meta);
  } else {
    // try to replace existing dynamic block added earlier
    const markerStart = '<!-- SEO: canonical, robots, Open Graph, Twitter Card, JSON-LD -->';
    if (html.indexOf(markerStart) !== -1) {
      const start = html.indexOf(markerStart);
      // find end of that inserted block by looking for the following <link href= (our CSS link)
      // fallback: replace between markerStart and the next <link rel="stylesheet"> occurrence
      const after = html.indexOf('<link', start);
      if (after !== -1) {
        const before = html.slice(0, start);
        const rest = html.slice(after);
        html = before + meta + rest;
      } else {
        // as last resort, insert meta after <title>
        html = html.replace(/<title[^>]*>.*?<\/title>/i, (m) => m + '\n' + meta);
      }
    } else {
      // insert after title
      html = html.replace(/<title[^>]*>.*?<\/title>/i, (m) => m + '\n' + meta);
    }
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log('Injected meta into', file);
}

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
files.forEach((f) => injectToFile(path.join(root, f)));
