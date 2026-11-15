const path = require('path');
const Jimp = require('jimp');

const cardsDir = path.join(__dirname, '..', 'public', 'cards');
const source = path.join(cardsDir, 'button-sheet-v2.png');
const cards = [
  ['orar-por-causa.png', 12, 14],
  ['enviar-oracao.png', 870, 14],
  ['evangelho.png', 12, 323],
  ['novenas.png', 870, 323],
  ['sagrado-terco.png', 12, 632],
  ['divinas-promessas.png', 870, 632],
];

async function extract() {
  const sheet = await Jimp.read(source);
  for (const [name, x, y] of cards) {
    const button = sheet.clone()
      .crop(x, y, 812, 270)
      .resize(1800, 600, Jimp.RESIZE_BICUBIC);
    await button.writeAsync(path.join(cardsDir, name));
    console.log(`Extracted ${name}`);
  }
}

extract().catch((error) => {
  console.error(error);
  process.exit(1);
});
