

// Reasigna colores a TODOS los técnicos (rol usuario), bien separados.
function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

const techs = db.usuarios
  .find({ rol: 'usuario' })
  .sort({ nombre: 1 })
  .toArray();

const n = techs.length;
if (n === 0) {
  print('No hay técnicos');
} else {
  let i = 0;
  for (const t of techs) {
    // Hue equiespaciado: con 23 técnicos ≈ cada 15.6°
    const hue = (i * 360) / n;
    // Alternar un poco luminosidad para vecinos aún más distintos
    const l = i % 2 === 0 ? 42 : 50;
    const color = hslToHex(hue, 78, l);
    db.usuarios.updateOne({ _id: t._id }, { $set: { color } });
    print((t.nombre || t.email) + ' -> ' + color);
    i++;
  }
  print('Reasignados: ' + n + ' (colores equiespaciados en el círculo)');
}
