/**
 * Asigna un color único a cada técnico (rol usuario) que aún no tenga.
 *
 * Uso local / Render one-off:
 *   node scripts/assignTecnicoColors.js
 *
 * Requiere MONGODB_URI en .env (o variables de entorno).
 *
 * También imprime un snippet mongosh por si preferís pegarlo en Atlas.
 */
require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const config = require('../src/config');
const Usuario = require('../src/models/User');
const {
  TECNICO_COLOR_PALETTE,
  normalizeColor,
  nextAvailableColor,
} = require('../src/utils/tecnicoColors');

async function assignViaMongoose() {
  if (!config.mongoUri) throw new Error('MONGODB_URI no configurada');
  await mongoose.connect(config.mongoUri);
  console.log('✅ Conectado a MongoDB\n');

  const used = new Set();
  const withColor = await Usuario.find({ color: { $type: 'string', $ne: '' } })
    .select('_id color nombre')
    .lean();
  for (const u of withColor) {
    const c = normalizeColor(u.color);
    if (c) used.add(c);
  }

  const sinColor = await Usuario.find({
    rol: 'usuario',
    $or: [{ color: null }, { color: { $exists: false } }, { color: '' }],
  })
    .select('_id nombre email color')
    .sort({ createdAt: 1 });

  console.log(`Técnicos sin color: ${sinColor.length}`);
  console.log(`Colores ya en uso: ${used.size}`);
  console.log(`Paleta disponible: ${TECNICO_COLOR_PALETTE.length}\n`);

  let assigned = 0;
  for (const tech of sinColor) {
    const color = nextAvailableColor(used);
    if (!color) {
      throw new Error(`Se agotó la paleta al asignar a ${tech.email}`);
    }
    tech.color = color;
    await tech.save();
    used.add(color);
    assigned += 1;
    console.log(`  + ${tech.nombre || tech.email} → ${color}`);
  }

  console.log(`\n✅ Listo. Asignados: ${assigned}`);
  await mongoose.disconnect();
}

function printMongoshSnippet() {
  const paletteJson = JSON.stringify(TECNICO_COLOR_PALETTE);
  console.log('\n========== SNIPPET MONGOSH (Atlas) ==========');
  console.log(`
// Pegá esto en mongosh apuntando a la DB correcta (use futurgas_gestion)
const palette = ${paletteJson};
const used = new Set(
  db.usuarios.find({ color: { $type: 'string', $ne: '' } }, { color: 1 })
    .toArray()
    .map((u) => String(u.color).toUpperCase())
);
const techs = db.usuarios
  .find({
    rol: 'usuario',
    $or: [{ color: null }, { color: { $exists: false } }, { color: '' }],
  })
  .sort({ createdAt: 1 })
  .toArray();

let pi = 0;
let assigned = 0;
for (const t of techs) {
  while (pi < palette.length && used.has(palette[pi])) pi++;
  if (pi >= palette.length) throw new Error('Paleta agotada');
  const color = palette[pi++];
  db.usuarios.updateOne({ _id: t._id }, { $set: { color } });
  used.add(color);
  assigned++;
  print(t.nombre + ' → ' + color);
}
print('Asignados: ' + assigned);
`);
  console.log('=============================================\n');
}

async function main() {
  const onlySnippet = process.argv.includes('--mongosh');
  if (onlySnippet) {
    printMongoshSnippet();
    return;
  }
  printMongoshSnippet();
  await assignViaMongoose();
}

main().catch(async (err) => {
  console.error('❌', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
