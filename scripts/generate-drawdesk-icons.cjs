const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// DrawDesk Logo SVG 64x64 grid with transparent background, filling standard app icon spacing
const drawDeskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
  <!-- Stylized Vibrant Green 'D' Contour -->
  <path d="M 10,5.5
           C 17,7.2 24,9.2 30,9.2
           C 36,9.2 41,7.8 45,9.2
           C 49,10.6 54,14.5 54,20
           C 54,32 54,42 54,50
           C 54,55.5 49,58.8 44,59
           C 38,59.3 32,57 26,57
           C 20,57 15,58.5 10,59
           Z"
        fill="#13A030" />

  <!-- Upper Counter Slot of 'D' -->
  <path d="M 29,18
           C 29,15 35,15 35,18
           L 35,26
           L 29,26
           Z"
        fill="#FFFFFF" />

  <!-- Left Drafting Table Wing Accent -->
  <polygon points="17,24.5 10,30.5 12.5,32.5" fill="#FFFFFF" />

  <!-- Main Drawing Table / Drafting Board Surface -->
  <polygon points="17,26 47,26 54,36.5 10,36.5" fill="#FFFFFF" />

  <!-- Desk Legs & Lower Understructure -->
  <rect x="15.5" y="36.5" width="2.5" height="11.5" fill="#FFFFFF" />
  <rect x="23.5" y="36.5" width="1.6" height="3.5" fill="#FFFFFF" />

  <!-- Center Lower Pillar (Continuation of 'D' counter, with contoured base) -->
  <path d="M 28.5,36.5
           L 34.5,36.5
           L 34.5,47.5
           C 34.5,50.5 32.5,51.8 28.5,51.8
           Z"
        fill="#FFFFFF" />

  <rect x="39.5" y="36.5" width="1.6" height="3.5" fill="#FFFFFF" />
  <rect x="46.5" y="36.5" width="2.5" height="11.5" fill="#FFFFFF" />
</svg>`;

async function buildIcons() {
  fs.mkdirSync('build', { recursive: true });
  fs.mkdirSync('public', { recursive: true });

  // 1. Save master SVG
  fs.writeFileSync('build/icon.svg', drawDeskSvg.trim());
  fs.writeFileSync('public/icon.svg', drawDeskSvg.trim());

  // 2. Generate PNG sizes with transparent background
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const pngBuffers = {};

  for (const size of sizes) {
    const buf = await sharp(Buffer.from(drawDeskSvg))
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers[size] = buf;
  }

  // 3. Save standard icon files
  fs.writeFileSync('build/icon.png', pngBuffers[512]);
  fs.writeFileSync('public/pwa-512x512.png', pngBuffers[512]);
  fs.writeFileSync('public/pwa-192x192.png', pngBuffers[192] || await sharp(Buffer.from(drawDeskSvg)).resize(192, 192).png().toBuffer());
  fs.writeFileSync('public/apple-touch-icon.png', pngBuffers[192] || await sharp(Buffer.from(drawDeskSvg)).resize(180, 180).png().toBuffer());
  fs.writeFileSync('public/pwa-maskable-512x512.png', pngBuffers[512]);

  // 4. Construct Windows multi-resolution .ico file
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = icoSizes.map(s => pngBuffers[s]);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(icoSizes.length, 4); // number of images

  let offset = 6 + icoSizes.length * 16;
  const dirEntries = [];

  for (let i = 0; i < icoSizes.length; i++) {
    const size = icoSizes[i];
    const buf = icoBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // offset in file
    dirEntries.push(entry);
    offset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...icoBuffers]);
  fs.writeFileSync('build/icon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);

  console.log(`Successfully generated DrawDesk 64x64 icons without background:`);
  console.log(`- build/icon.ico (${icoBuffer.length} bytes)`);
  console.log(`- build/icon.png (${pngBuffers[512].length} bytes)`);
  console.log(`- build/icon.svg`);
}

buildIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
