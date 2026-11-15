const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp');

const sourcePath = 'public/enviaroracao_3d.png';
const white = 0xffffffff;
async function save(image, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await image.writeAsync(target);
}
function place(source, size, scale, background = white) {
  const image = new Jimp(size, size, background);
  const target = Math.round(size * scale);
  return image.composite(source.clone().resize(target, target, Jimp.RESIZE_BEZIER), Math.round((size - target) / 2), Math.round((size - target) / 2));
}

(async () => {
  // Platform packaging only: keep the selected original artwork unchanged.
  const source = await Jimp.read(sourcePath);
  fs.mkdirSync('public/icons', { recursive: true });
  fs.copyFileSync(sourcePath, 'public/icons/amens-master.png');
  for (const size of [192, 512]) await save(place(source, size, 0.92), `public/icons/amens-${size}.png`);
  await save(place(source, 512, 0.72), 'public/icons/amens-maskable-512.png');
  await save(place(source, 180, 0.9), 'public/icons/amens-apple-touch-180.png');
  const icoImages = [];
  for (const size of [16, 32, 48, 64]) {
    const image = place(source, size, 1, 0x00000000);
    await save(image, `public/icons/amens-favicon-${size}.png`);
    icoImages.push({ size, png: await image.getBufferAsync(Jimp.MIME_PNG) });
  }
  const header = Buffer.alloc(6 + icoImages.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(icoImages.length, 4);
  let offset = header.length;
  icoImages.forEach(({ size, png }, index) => {
    const record = 6 + index * 16;
    header[record] = size; header[record + 1] = size;
    header.writeUInt16LE(1, record + 4); header.writeUInt16LE(32, record + 6);
    header.writeUInt32LE(png.length, record + 8); header.writeUInt32LE(offset, record + 12);
    offset += png.length;
  });
  fs.writeFileSync('public/favicon.ico', Buffer.concat([header, ...icoImages.map(image => image.png)]));

  // Android reads the alpha silhouette for small notification icons.
  const silhouette = source.clone();
  silhouette.scan(0, 0, silhouette.bitmap.width, silhouette.bitmap.height, function (_x, _y, index) {
    this.bitmap.data[index] = this.bitmap.data[index + 1] = this.bitmap.data[index + 2] = 255;
    this.bitmap.data[index + 3] = this.bitmap.data[index + 3] >= 12 ? 255 : 0;
  });
  // Fill enclosed highlight holes while retaining transparent space outside the artwork.
  const width = silhouette.bitmap.width, height = silhouette.bitmap.height;
  const exterior = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const visit = index => {
    if (!exterior[index] && silhouette.bitmap.data[index * 4 + 3] === 0) { exterior[index] = 1; queue[tail++] = index; }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++], x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
  for (let index = 0; index < exterior.length; index++) silhouette.bitmap.data[index * 4 + 3] = exterior[index] ? 0 : 255;
  await save(place(silhouette, 96, 0.9, 0x00000000), 'public/icons/amens-notification-96.png');
  await save(place(source, 256, 0.9), 'android/app/src/main/res/drawable-nodpi/ic_amens_large.png');
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, factor] of Object.entries(densities)) {
    const directory = `android/app/src/main/res/mipmap-${density}`;
    const size = Math.round(48 * factor);
    await save(place(source, size, 0.92), `${directory}/ic_launcher.png`);
    const round = place(source, size, 0.84);
    round.scan(0, 0, size, size, function (x, y, index) {
      const coverage = Math.max(0, Math.min(1, size / 2 - Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) + 0.5));
      this.bitmap.data[index + 3] = Math.round(255 * coverage);
    });
    await save(round, `${directory}/ic_launcher_round.png`);
    await save(place(source, Math.round(108 * factor), 0.54, 0x00000000), `${directory}/ic_launcher_foreground.png`);
    await save(place(silhouette, Math.round(108 * factor), 0.54, 0x00000000), `${directory}/ic_launcher_monochrome.png`);
    await save(place(silhouette, Math.round(24 * factor), 0.9, 0x00000000), `android/app/src/main/res/drawable-${density}/ic_notification.png`);
  }
  await save(place(source, 1024, 0.92).rgba(false), 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  // Android's web welcome screen owns the brand experience after launch.
  // Keep the legacy native launch surfaces plain white to avoid showing the icon twice.
  for (const entry of fs.readdirSync('android/app/src/main/res', { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
    const splashPath = `android/app/src/main/res/${entry.name}/splash.png`;
    if (!fs.existsSync(splashPath)) continue;
    const old = await Jimp.read(splashPath);
    const image = new Jimp(old.bitmap.width, old.bitmap.height, white);
    await save(image, splashPath);
  }
  const preview = new Jimp(768, 384, 0xf4f0e8ff);
  preview.composite(place(source, 340, 0.92), 22, 22);
  preview.composite(new Jimp(340, 340, 0x303b4bff), 406, 22);
  preview.composite(place(silhouette, 240, 0.9, 0x00000000), 456, 72);
  await save(preview, 'tmp/amens-official-icon-preview.png');
  console.log('Official Amens artwork packaged for browser, PWA, Android, white native launch surfaces, and monochrome notifications.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
