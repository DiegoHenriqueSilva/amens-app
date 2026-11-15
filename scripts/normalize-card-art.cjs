const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const cardsDir = path.join(__dirname, '..', 'public', 'cards');
const files = fs.readdirSync(cardsDir).filter((file) => file.endsWith('.png'));
const targetWidth = 1800;
const targetHeight = 600;

async function normalize(file) {
  const filePath = path.join(cardsDir, file);
  const image = await Jimp.read(filePath);
  let left = image.bitmap.width;
  let top = image.bitmap.height;
  let right = -1;
  let bottom = -1;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, index) => {
    if (image.bitmap.data[index + 3] > 20) {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  });

  if (right < left || bottom < top) throw new Error(`No visible artwork: ${file}`);

  const padding = 8;
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropRight = Math.min(image.bitmap.width - 1, right + padding);
  const cropBottom = Math.min(image.bitmap.height - 1, bottom + padding);

  image
    .crop(cropLeft, cropTop, cropRight - cropLeft + 1, cropBottom - cropTop + 1)
    .resize(targetWidth, targetHeight, Jimp.RESIZE_BICUBIC);

  await image.writeAsync(filePath);
  console.log(`${file}: ${targetWidth}x${targetHeight}`);
}

Promise.all(files.map(normalize)).catch((error) => {
  console.error(error);
  process.exit(1);
});
